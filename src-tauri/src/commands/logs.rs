use std::time::Instant;

use serde_json::json;
use tauri::{command, State};
use tauri_plugin_shell::ShellExt;

use crate::logging::{AppLoggerState, FrontendLogEntry, LogStatus};

#[command]
pub fn append_frontend_log(
    entry: FrontendLogEntry,
    logger: State<'_, AppLoggerState>,
) -> Result<(), String> {
    logger.append_frontend(entry)
}

#[command]
pub fn get_log_status(logger: State<'_, AppLoggerState>) -> Result<LogStatus, String> {
    logger.get_status()
}

#[command]
pub fn export_logs(logger: State<'_, AppLoggerState>) -> Result<String, String> {
    logger.export_logs()
}

#[command]
#[allow(deprecated)]
pub async fn open_log_directory(
    app: tauri::AppHandle,
    logger: State<'_, AppLoggerState>,
) -> Result<(), String> {
    let started_at = Instant::now();
    let status = logger.get_status()?;
    let log_directory = status.log_directory;

    logger.log_backend(
        crate::logging::LogLevel::Info,
        "commands::logs",
        "open_log_directory_started",
        "Opening logs directory in the operating system file explorer.",
        json!({
            "logDirectory": log_directory.clone(),
        }),
    );

    match app.shell().open(&log_directory, None) {
        Ok(()) => {
            logger.log_backend(
                crate::logging::LogLevel::Info,
                "commands::logs",
                "open_log_directory_completed",
                "Logs directory opened successfully.",
                json!({
                    "logDirectory": log_directory,
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Ok(())
        }
        Err(error) => {
            logger.log_backend(
                crate::logging::LogLevel::Error,
                "commands::logs",
                "open_log_directory_failed",
                "Failed to open the logs directory.",
                json!({
                    "logDirectory": log_directory,
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Err(error.to_string())
        }
    }
}