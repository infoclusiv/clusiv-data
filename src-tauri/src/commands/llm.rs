use std::path::PathBuf;
use std::time::Duration;

use futures_util::StreamExt;
use reqwest::{Client, Response};
use serde_json::{json, Value};
use tauri::{command, AppHandle, Emitter, State};

use crate::logging::{AppLoggerState, LogLevel};
use crate::models::llm::resolve_model_profile;
use crate::models::{AiChatRequest, AiChatStreamEvent, AiConfig, AiConfigInput, AiStoredConfig};

const AI_CHAT_STREAM_EVENT: &str = "ai-chat-stream";

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn executable_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn get_ai_config_path() -> PathBuf {
    let workspace_path = workspace_root().join("ai-config.json");
    if cfg!(debug_assertions) {
        return workspace_path;
    }

    executable_dir().join("ai-config.json")
}

fn truncate_for_log(value: &str, max_length: usize) -> String {
    let trimmed = value.trim();
    if trimmed.chars().count() <= max_length {
        return trimmed.to_string();
    }

    trimmed.chars().take(max_length).collect::<String>() + "…"
}

fn normalize_api_base(value: &str) -> Result<String, String> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Err("La API base es obligatoria.".to_string());
    }

    if !trimmed.starts_with("https://") && !trimmed.starts_with("http://") {
        return Err("La API base debe comenzar con http:// o https://.".to_string());
    }

    Ok(trimmed.to_string())
}

fn normalize_model(value: &str) -> Result<String, String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return Err("El modelo es obligatorio.".to_string());
    }

    Ok(trimmed.to_string())
}

fn normalize_provider(value: &str) -> Result<String, String> {
    let trimmed = value.trim().to_lowercase();
    if trimmed != "nvidia" {
        return Err("Por ahora el proveedor soportado es NVIDIA.".to_string());
    }

    Ok(trimmed)
}

fn format_float_value(value: f32) -> String {
    let rounded = if (value.fract()).abs() < f32::EPSILON {
        format!("{:.0}", value)
    } else {
        format!("{:.2}", value)
    };

    if !rounded.contains('.') {
        return rounded;
    }

    rounded
        .trim_end_matches('0')
        .trim_end_matches('.')
        .to_string()
}

fn validate_float_param(name: &str, value: f32, min: f32, max: Option<f32>) -> Result<(), String> {
    if !value.is_finite() {
        return Err(format!("{} debe ser un numero finito.", name));
    }

    if value < min {
        return Err(match max {
            Some(max_value) => format!(
                "{} debe estar entre {} y {}.",
                name,
                format_float_value(min),
                format_float_value(max_value)
            ),
            None => format!("{} debe ser mayor o igual a {}.", name, format_float_value(min)),
        });
    }

    if let Some(max_value) = max {
        if value > max_value {
            return Err(format!(
                "{} debe estar entre {} y {}.",
                name,
                format_float_value(min),
                format_float_value(max_value)
            ));
        }
    }

    Ok(())
}

fn validate_integer_param(name: &str, value: u32, min: u32, max: Option<u32>) -> Result<(), String> {
    if value < min {
        return Err(match max {
            Some(max_value) => format!("{} debe estar entre {} y {}.", name, min, max_value),
            None => format!("{} debe ser mayor o igual a {}.", name, min),
        });
    }

    if let Some(max_value) = max {
        if value > max_value {
            return Err(format!("{} debe estar entre {} y {}.", name, min, max_value));
        }
    }

    Ok(())
}

fn validate_generation_params(model: &str, temperature: f32, top_p: f32, max_tokens: u32) -> Result<(), String> {
    let model_profile = resolve_model_profile(model);

    validate_float_param(
        "Temperature",
        temperature,
        model_profile.temperature.min,
        model_profile.temperature.max,
    )?;
    validate_float_param("Top P", top_p, model_profile.top_p.min, model_profile.top_p.max)?;
    validate_integer_param(
        "Max Tokens",
        max_tokens,
        model_profile.max_tokens.min,
        model_profile.max_tokens.max,
    )?;

    Ok(())
}

fn build_test_generation_payload(config: &AiStoredConfig) -> Value {
    let model_profile = resolve_model_profile(&config.model);
    let test_temperature = model_profile.temperature.default_value;
    let test_top_p = model_profile.top_p.default_value;
    let mut test_max_tokens = model_profile
        .max_tokens
        .default_value
        .max(model_profile.max_tokens.min);

    if let Some(max_value) = model_profile.max_tokens.max {
        test_max_tokens = test_max_tokens.min(max_value);
    }

    test_max_tokens = test_max_tokens.min(128);

    json!({
        "model": config.model,
        "messages": [
            {
                "role": "user",
                "content": "Responde exactamente con OK"
            }
        ],
        "temperature": test_temperature,
        "top_p": test_top_p,
        "max_tokens": test_max_tokens,
        "stream": false,
    })
}

fn ensure_api_key(config: &AiStoredConfig) -> Result<(), String> {
    if config.api_key.trim().is_empty() {
        return Err("La API key de NVIDIA es obligatoria.".to_string());
    }

    Ok(())
}

fn load_stored_config(logger: &AppLoggerState) -> Result<AiStoredConfig, String> {
    let path = get_ai_config_path();

    if !path.exists() {
        return Ok(AiStoredConfig::default());
    }

    let content = std::fs::read_to_string(&path).map_err(|error| error.to_string())?;

    match serde_json::from_str::<AiStoredConfig>(&content) {
        Ok(config) => Ok(config),
        Err(error) => {
            logger.log_backend(
                LogLevel::Warn,
                "commands::llm",
                "load_ai_config_parse_failed",
                "AI assistant configuration file is invalid JSON. Falling back to defaults.",
                json!({
                    "path": path.to_string_lossy().to_string(),
                    "error": error.to_string(),
                }),
            );
            Ok(AiStoredConfig::default())
        }
    }
}

fn persist_stored_config(config: &AiStoredConfig) -> Result<(), String> {
    let path = get_ai_config_path();
    let content = serde_json::to_string_pretty(config).map_err(|error| error.to_string())?;
    std::fs::write(path, content).map_err(|error| error.to_string())
}

fn merge_config_input(input: AiConfigInput, existing: &AiStoredConfig) -> Result<AiStoredConfig, String> {
    let provider = normalize_provider(&input.provider)?;
    let api_base = normalize_api_base(&input.api_base)?;
    let model = normalize_model(&input.model)?;

    validate_generation_params(&model, input.temperature, input.top_p, input.max_tokens)?;

    let api_key = match input.api_key {
        Some(value) => {
            let trimmed = value.trim();
            if trimmed.is_empty() {
                existing.api_key.clone()
            } else {
                trimmed.to_string()
            }
        }
        None => existing.api_key.clone(),
    };

    Ok(AiStoredConfig {
        provider,
        api_base,
        model,
        api_key,
        temperature: input.temperature,
        top_p: input.top_p,
        max_tokens: input.max_tokens,
    })
}

fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(Duration::from_secs(90))
        .build()
        .map_err(|error| error.to_string())
}

fn build_chat_url(config: &AiStoredConfig) -> String {
    format!("{}/chat/completions", config.api_base.trim_end_matches('/'))
}

fn extract_provider_error(body: &str) -> String {
    serde_json::from_str::<Value>(body)
        .ok()
        .and_then(|value| {
            value
                .get("error")
                .and_then(|error| error.get("message").and_then(Value::as_str).or_else(|| error.as_str()))
                .or_else(|| value.get("message").and_then(Value::as_str))
                .map(|message| message.to_string())
        })
        .unwrap_or_else(|| truncate_for_log(body, 240))
}

async fn build_response_error(response: Response) -> String {
    let status = response.status();
    let body = response.text().await.unwrap_or_default();
    let message = if body.trim().is_empty() {
        format!("HTTP {} sin detalle adicional.", status.as_u16())
    } else {
        extract_provider_error(&body)
    };

    format!("NVIDIA respondió con error {}: {}", status.as_u16(), message)
}

fn build_system_prompt(context: &Value) -> Result<String, String> {
    let serialized_context = serde_json::to_string(context).map_err(|error| error.to_string())?;

    Ok(format!(
        concat!(
            "Eres el Asistente AI de Clusiv Data. ",
            "Responde exclusivamente con base en el contexto estructurado que se te entrega a continuación. ",
            "No inventes categorías, subcategorías, notas, tareas, enlaces ni textos rápidos. ",
            "Si el contexto no tiene evidencia suficiente para responder, dilo explícitamente. ",
            "Cuando sea relevante, explica la jerarquía usando las rutas o breadcrumbs del contexto. ",
            "Distingue con claridad entre categorías, subcategorías, notas, tareas, enlaces y textos rápidos. ",
            "No uses conocimiento general externo.\n\n",
            "CONTEXTO_ESTRUCTURADO_JSON=",
            "{}"
        ),
        serialized_context
    ))
}

fn extract_test_completion(value: &Value) -> Option<String> {
    value
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("message"))
        .and_then(|message| message.get("content"))
        .and_then(Value::as_str)
        .map(|content| content.to_string())
}

fn parse_stream_delta(block: &str) -> Result<Option<String>, String> {
    let data = block
        .lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(|line| line.trim())
        .collect::<Vec<_>>()
        .join("");

    if data.is_empty() || data == "[DONE]" {
        return Ok(None);
    }

    let payload: Value = serde_json::from_str(&data).map_err(|error| error.to_string())?;

    Ok(payload
        .get("choices")
        .and_then(Value::as_array)
        .and_then(|choices| choices.first())
        .and_then(|choice| choice.get("delta"))
        .and_then(|delta| delta.get("content"))
        .and_then(Value::as_str)
        .map(|content| content.to_string()))
}

fn emit_stream_event(app: &AppHandle, event: AiChatStreamEvent) -> Result<(), String> {
    app.emit(AI_CHAT_STREAM_EVENT, event)
        .map_err(|error| error.to_string())
}

async fn run_test_request(config: &AiStoredConfig) -> Result<String, String> {
    ensure_api_key(config)?;

    let response = build_http_client()?
        .post(build_chat_url(config))
        .bearer_auth(config.api_key.trim())
        .json(&build_test_generation_payload(config))
        .send()
        .await
        .map_err(|error| format!("No se pudo contactar a NVIDIA: {}", error))?;

    if !response.status().is_success() {
        return Err(build_response_error(response).await);
    }

    let body: Value = response.json().await.map_err(|error| error.to_string())?;
    let content = extract_test_completion(&body).unwrap_or_default();

    if content.trim().is_empty() {
        return Err("NVIDIA respondió sin contenido durante la prueba de conexión.".to_string());
    }

    Ok(format!("Conexión validada con el modelo {}.", config.model))
}

async fn run_ai_chat_stream(
    app: AppHandle,
    request: AiChatRequest,
    logger: AppLoggerState,
) -> Result<(), String> {
    let config = load_stored_config(&logger)?;
    ensure_api_key(&config)?;

    let system_prompt = build_system_prompt(&request.context)?;
    let mut messages = vec![json!({
        "role": "system",
        "content": system_prompt,
    })];

    for message in request.messages {
        let role = message.role.trim();
        if role != "user" && role != "assistant" {
            continue;
        }

        let content = message.content.trim();
        if content.is_empty() {
            continue;
        }

        messages.push(json!({
            "role": role,
            "content": content,
        }));
    }

    if messages.len() <= 1 {
        return Err("No hay mensajes válidos para enviar al asistente.".to_string());
    }

    let evidence_count = request
        .context
        .get("summary")
        .and_then(|summary| summary.get("evidenceCount"))
        .and_then(Value::as_u64)
        .unwrap_or(0);

    logger.log_backend(
        LogLevel::Info,
        "commands::llm",
        "start_ai_chat_stream_started",
        "Starting NVIDIA AI chat stream.",
        json!({
            "requestId": request.request_id,
            "provider": config.provider,
            "model": config.model,
            "messageCount": messages.len() - 1,
            "evidenceCount": evidence_count,
        }),
    );

    emit_stream_event(
        &app,
        AiChatStreamEvent {
            request_id: request.request_id.clone(),
            kind: "started".to_string(),
            delta: None,
            message: None,
        },
    )?;

    let response = build_http_client()?
        .post(build_chat_url(&config))
        .bearer_auth(config.api_key.trim())
        .header("Accept", "text/event-stream")
        .json(&json!({
            "model": config.model,
            "messages": messages,
            "temperature": config.temperature,
            "top_p": config.top_p,
            "max_tokens": config.max_tokens,
            "stream": true,
        }))
        .send()
        .await
        .map_err(|error| format!("No se pudo contactar a NVIDIA: {}", error))?;

    if !response.status().is_success() {
        return Err(build_response_error(response).await);
    }

    let mut stream = response.bytes_stream();
    let mut buffer = String::new();
    let mut accumulated = String::new();

    while let Some(chunk) = stream.next().await {
        let bytes = chunk.map_err(|error| error.to_string())?;
        buffer.push_str(&String::from_utf8_lossy(&bytes));
        buffer = buffer.replace("\r\n", "\n").replace('\r', "\n");

        while let Some(separator_index) = buffer.find("\n\n") {
            let block = buffer[..separator_index].to_string();
            buffer = buffer[separator_index + 2..].to_string();

            if let Some(delta) = parse_stream_delta(&block)? {
                accumulated.push_str(&delta);
                emit_stream_event(
                    &app,
                    AiChatStreamEvent {
                        request_id: request.request_id.clone(),
                        kind: "delta".to_string(),
                        delta: Some(delta),
                        message: None,
                    },
                )?;
            }
        }
    }

    if !buffer.trim().is_empty() {
        if let Some(delta) = parse_stream_delta(&buffer)? {
            accumulated.push_str(&delta);
            emit_stream_event(
                &app,
                AiChatStreamEvent {
                    request_id: request.request_id.clone(),
                    kind: "delta".to_string(),
                    delta: Some(delta),
                    message: None,
                },
            )?;
        }
    }

    logger.log_backend(
        LogLevel::Info,
        "commands::llm",
        "start_ai_chat_stream_completed",
        "NVIDIA AI chat stream completed.",
        json!({
            "requestId": request.request_id,
            "provider": config.provider,
            "model": config.model,
            "responseLength": accumulated.chars().count(),
        }),
    );

    emit_stream_event(
        &app,
        AiChatStreamEvent {
            request_id: request.request_id,
            kind: "complete".to_string(),
            delta: None,
            message: if accumulated.trim().is_empty() {
                Some("No se recibió contenido del modelo.".to_string())
            } else {
                None
            },
        },
    )?;

    Ok(())
}

#[command]
pub fn get_ai_config(logger: State<'_, AppLoggerState>) -> Result<AiConfig, String> {
    let config = load_stored_config(logger.inner())?;
    Ok(config.public_view())
}

#[command]
pub fn save_ai_config(
    input: AiConfigInput,
    logger: State<'_, AppLoggerState>,
) -> Result<AiConfig, String> {
    let existing = load_stored_config(logger.inner())?;
    let next = merge_config_input(input, &existing)?;
    persist_stored_config(&next)?;

    logger.log_backend(
        LogLevel::Info,
        "commands::llm",
        "save_ai_config_completed",
        "AI assistant configuration saved.",
        json!({
            "path": get_ai_config_path().to_string_lossy().to_string(),
            "provider": next.provider,
            "model": next.model,
            "hasApiKey": !next.api_key.trim().is_empty(),
        }),
    );

    Ok(next.public_view())
}

#[command]
pub async fn test_ai_config(
    input: AiConfigInput,
    logger: State<'_, AppLoggerState>,
) -> Result<String, String> {
    let existing = load_stored_config(logger.inner())?;
    let config = merge_config_input(input, &existing)?;

    logger.log_backend(
        LogLevel::Info,
        "commands::llm",
        "test_ai_config_started",
        "Testing NVIDIA AI assistant configuration.",
        json!({
            "provider": config.provider,
            "model": config.model,
            "hasApiKey": !config.api_key.trim().is_empty(),
        }),
    );

    run_test_request(&config).await
}

#[command]
pub fn start_ai_chat_stream(
    app: AppHandle,
    request: AiChatRequest,
    logger: State<'_, AppLoggerState>,
) -> Result<(), String> {
    if request.request_id.trim().is_empty() {
        return Err("La consulta AI requiere un requestId.".to_string());
    }

    let logger = logger.inner().clone();
    let request_id = request.request_id.clone();

    tauri::async_runtime::spawn(async move {
        if let Err(error) = run_ai_chat_stream(app.clone(), request, logger.clone()).await {
            logger.log_backend(
                LogLevel::Error,
                "commands::llm",
                "start_ai_chat_stream_failed",
                "NVIDIA AI chat stream failed.",
                json!({
                    "requestId": request_id,
                    "error": truncate_for_log(&error, 280),
                }),
            );

            let _ = emit_stream_event(
                &app,
                AiChatStreamEvent {
                    request_id,
                    kind: "error".to_string(),
                    delta: None,
                    message: Some(error),
                },
            );
        }
    });

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_input(model: &str, max_tokens: u32) -> AiConfigInput {
        AiConfigInput {
            provider: "nvidia".to_string(),
            api_base: "https://integrate.api.nvidia.com/v1".to_string(),
            model: model.to_string(),
            api_key: Some("nvapi-test".to_string()),
            temperature: 1.0,
            top_p: 0.9,
            max_tokens,
        }
    }

    #[test]
    fn validate_generation_params_accepts_stepfun_known_limit() {
        assert!(validate_generation_params("stepfun-ai/step-3.5-flash", 1.0, 0.9, 16384).is_ok());
    }

    #[test]
    fn validate_generation_params_rejects_stepfun_beyond_limit() {
        let result = validate_generation_params("stepfun-ai/step-3.5-flash", 1.0, 0.9, 16385);

        assert_eq!(result.unwrap_err(), "Max Tokens debe estar entre 1 y 16384.");
    }

    #[test]
    fn merge_config_input_keeps_unknown_model_flexible() {
        let result = merge_config_input(sample_input("custom/provider-model", 32768), &AiStoredConfig::default());

        assert!(result.is_ok());
        assert_eq!(result.unwrap().max_tokens, 32768);
    }
}