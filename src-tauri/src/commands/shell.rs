use std::time::Instant;

use serde_json::json;
use tauri::{command, State};
use tauri_plugin_shell::ShellExt;

use crate::logging::{AppLoggerState, LogLevel};

fn extract_host(url: &str) -> Option<String> {
    let (_, remainder) = url.split_once("://")?;
    let authority = remainder.split(['/', '?', '#']).next()?.trim();
    let host = authority
        .rsplit_once('@')
        .map(|(_, host)| host)
        .unwrap_or(authority)
        .trim();

    if host.is_empty() {
        None
    } else {
        Some(host.to_string())
    }
}

fn extract_protocol(url: &str) -> Option<String> {
    url.split_once("://")
        .map(|(protocol, _)| protocol.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn has_query_string(url: &str) -> bool {
    url.contains('?')
}

fn has_hash(url: &str) -> bool {
    url.contains('#')
}

fn has_credentials(url: &str) -> bool {
    url.split_once("://")
        .map(|(_, remainder)| remainder.split('/').next().is_some_and(|segment| segment.contains('@')))
        .unwrap_or(false)
}

#[command]
#[allow(deprecated)]
pub async fn open_url(
    url: String,
    app: tauri::AppHandle,
    logger: State<'_, AppLoggerState>,
) -> Result<(), String> {
    let started_at = Instant::now();
    let host = extract_host(&url);
    let protocol = extract_protocol(&url);
    let has_query_string = has_query_string(&url);
    let has_hash = has_hash(&url);
    let has_credentials = has_credentials(&url);

    logger.log_backend(
        LogLevel::Info,
        "commands::shell",
        "open_url_started",
        "Opening URL with shell integration.",
        json!({
            "host": host,
            "protocol": protocol,
            "hasCredentials": has_credentials,
            "hasHash": has_hash,
            "hasQueryString": has_query_string,
        }),
    );

    match app.shell().open(&url, None) {
        Ok(()) => {
            logger.log_backend(
                LogLevel::Info,
                "commands::shell",
                "open_url_completed",
                "URL opened successfully.",
                json!({
                    "host": host,
                    "protocol": protocol,
                    "hasCredentials": has_credentials,
                    "hasHash": has_hash,
                    "hasQueryString": has_query_string,
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Ok(())
        }
        Err(error) => {
            logger.log_backend(
                LogLevel::Error,
                "commands::shell",
                "open_url_failed",
                "Failed to open URL through the shell plugin.",
                json!({
                    "host": host,
                    "protocol": protocol,
                    "hasCredentials": has_credentials,
                    "hasHash": has_hash,
                    "hasQueryString": has_query_string,
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Err(error.to_string())
        }
    }
}