use serde::{Deserialize, Serialize};
use serde_json::Value;

fn default_provider() -> String {
    "nvidia".to_string()
}

fn default_api_base() -> String {
    "https://integrate.api.nvidia.com/v1".to_string()
}

fn default_model() -> String {
    "minimaxai/minimax-m2.7".to_string()
}

fn default_temperature() -> f32 {
    0.2
}

fn default_top_p() -> f32 {
    0.95
}

fn default_max_tokens() -> u32 {
    8192
}

fn default_unknown_temperature() -> f32 {
    0.7
}

fn build_float_parameter_profile(
    default_value: f32,
    min: f32,
    max: Option<f32>,
    step: f32,
) -> AiFloatParameterProfile {
    AiFloatParameterProfile {
        default_value,
        min,
        max,
        step,
    }
}

fn build_integer_parameter_profile(
    default_value: u32,
    min: u32,
    max: Option<u32>,
    step: u32,
) -> AiIntegerParameterProfile {
    AiIntegerParameterProfile {
        default_value,
        min,
        max,
        step,
    }
}

fn minimax_m27_profile() -> AiModelProfile {
    AiModelProfile {
        key: "minimaxai/minimax-m2.7".to_string(),
        label: "MiniMax M2.7".to_string(),
        description: "Perfil base actual de Clusiv Data para NVIDIA.".to_string(),
        is_known: true,
        temperature: build_float_parameter_profile(0.2, 0.0, Some(2.0), 0.05),
        top_p: build_float_parameter_profile(0.95, 0.0, Some(1.0), 0.01),
        max_tokens: build_integer_parameter_profile(8192, 1, Some(8192), 1),
    }
}

fn stepfun_step35_flash_profile() -> AiModelProfile {
    AiModelProfile {
        key: "stepfun-ai/step-3.5-flash".to_string(),
        label: "StepFun Step 3.5 Flash".to_string(),
        description: "Preset sugerido segun la referencia de NVIDIA Build para este modelo.".to_string(),
        is_known: true,
        temperature: build_float_parameter_profile(1.0, 0.0, Some(2.0), 0.05),
        top_p: build_float_parameter_profile(0.9, 0.0, Some(1.0), 0.01),
        max_tokens: build_integer_parameter_profile(16384, 1, Some(16384), 1),
    }
}

fn build_custom_model_profile(model: &str, temperature: f32, top_p: f32, max_tokens: u32) -> AiModelProfile {
    let trimmed_model = model.trim();
    let label = if trimmed_model.is_empty() {
        "Modelo personalizado".to_string()
    } else {
        trimmed_model.to_string()
    };

    AiModelProfile {
        key: label.clone(),
        label,
        description: "Perfil flexible para modelos personalizados. La validacion final ocurre en backend.".to_string(),
        is_known: false,
        temperature: build_float_parameter_profile(temperature, 0.0, Some(2.0), 0.05),
        top_p: build_float_parameter_profile(top_p, 0.0, Some(1.0), 0.01),
        max_tokens: build_integer_parameter_profile(max_tokens, 1, None, 1),
    }
}

pub fn available_model_profiles() -> Vec<AiModelProfile> {
    vec![minimax_m27_profile(), stepfun_step35_flash_profile()]
}

pub fn resolve_model_profile(model: &str) -> AiModelProfile {
    let trimmed_model = model.trim();

    available_model_profiles()
        .into_iter()
        .find(|profile| profile.key.eq_ignore_ascii_case(trimmed_model))
        .unwrap_or_else(|| {
            build_custom_model_profile(
                trimmed_model,
                default_unknown_temperature(),
                default_top_p(),
                default_max_tokens(),
            )
        })
}

pub fn resolve_active_model_profile(model: &str, temperature: f32, top_p: f32, max_tokens: u32) -> AiModelProfile {
    let trimmed_model = model.trim();
    let mut profile = resolve_model_profile(trimmed_model);

    if !profile.is_known {
        profile = build_custom_model_profile(trimmed_model, temperature, top_p, max_tokens);
    }

    profile
}

fn mask_api_key(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let prefix: String = trimmed.chars().take(4).collect();
    let suffix_chars: Vec<char> = trimmed.chars().rev().take(4).collect();
    let suffix: String = suffix_chars.into_iter().rev().collect();

    Some(format!("{}…{}", prefix, suffix))
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiFloatParameterProfile {
    pub default_value: f32,
    pub min: f32,
    pub max: Option<f32>,
    pub step: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiIntegerParameterProfile {
    pub default_value: u32,
    pub min: u32,
    pub max: Option<u32>,
    pub step: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AiModelProfile {
    pub key: String,
    pub label: String,
    pub description: String,
    pub is_known: bool,
    pub temperature: AiFloatParameterProfile,
    pub top_p: AiFloatParameterProfile,
    pub max_tokens: AiIntegerParameterProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiStoredConfig {
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default = "default_api_base")]
    pub api_base: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub api_key: String,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

impl Default for AiStoredConfig {
    fn default() -> Self {
        Self {
            provider: default_provider(),
            api_base: default_api_base(),
            model: default_model(),
            api_key: String::new(),
            temperature: default_temperature(),
            top_p: default_top_p(),
            max_tokens: default_max_tokens(),
        }
    }
}

impl AiStoredConfig {
    pub fn public_view(&self) -> AiConfig {
        AiConfig {
            provider: self.provider.clone(),
            api_base: self.api_base.clone(),
            model: self.model.clone(),
            temperature: self.temperature,
            top_p: self.top_p,
            max_tokens: self.max_tokens,
            has_api_key: !self.api_key.trim().is_empty(),
            api_key_mask: mask_api_key(&self.api_key),
            available_profiles: available_model_profiles(),
            active_model_profile: resolve_active_model_profile(
                &self.model,
                self.temperature,
                self.top_p,
                self.max_tokens,
            ),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfig {
    pub provider: String,
    pub api_base: String,
    pub model: String,
    pub temperature: f32,
    pub top_p: f32,
    pub max_tokens: u32,
    pub has_api_key: bool,
    pub api_key_mask: Option<String>,
    pub available_profiles: Vec<AiModelProfile>,
    pub active_model_profile: AiModelProfile,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiConfigInput {
    #[serde(default = "default_provider")]
    pub provider: String,
    #[serde(default = "default_api_base")]
    pub api_base: String,
    #[serde(default = "default_model")]
    pub model: String,
    #[serde(default)]
    pub api_key: Option<String>,
    #[serde(default = "default_temperature")]
    pub temperature: f32,
    #[serde(default = "default_top_p")]
    pub top_p: f32,
    #[serde(default = "default_max_tokens")]
    pub max_tokens: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatRequest {
    pub request_id: String,
    pub messages: Vec<AiChatMessage>,
    #[serde(default)]
    pub context: Value,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AiChatStreamEvent {
    pub request_id: String,
    pub kind: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub delta: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub message: Option<String>,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn resolve_model_profile_uses_stepfun_preset_values() {
        let profile = resolve_model_profile("stepfun-ai/step-3.5-flash");

        assert!(profile.is_known);
        assert_eq!(profile.temperature.default_value, 1.0);
        assert_eq!(profile.top_p.default_value, 0.9);
        assert_eq!(profile.max_tokens.default_value, 16384);
        assert_eq!(profile.max_tokens.max, Some(16384));
    }

    #[test]
    fn resolve_model_profile_builds_flexible_profile_for_unknown_model() {
        let profile = resolve_active_model_profile("custom/provider-model", 0.55, 0.88, 32768);

        assert!(!profile.is_known);
        assert_eq!(profile.label, "custom/provider-model");
        assert_eq!(profile.temperature.default_value, 0.55);
        assert_eq!(profile.top_p.default_value, 0.88);
        assert_eq!(profile.max_tokens.default_value, 32768);
        assert_eq!(profile.max_tokens.max, None);
    }
}