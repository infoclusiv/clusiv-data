use std::time::Instant;

use serde_json::json;
use tauri::{command, State};
use tauri_plugin_shell::ShellExt;

use crate::logging::{AppLoggerState, LogLevel};

fn extract_host(url: &str) -> Option<String> {
    let (_, remainder) = url.split_once("://")?;
    remainder
        .split('/')
        .next()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(str::to_string)
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

    logger.log_backend(
        LogLevel::Info,
        "commands::shell",
        "open_url_started",
        "Opening URL with shell integration.",
        json!({
            "url": url,
            "host": host,
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
                    "url": url,
                    "host": host,
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
                    "url": url,
                    "host": host,
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Err(error.to_string())
        }
    }
}