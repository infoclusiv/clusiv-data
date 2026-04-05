use tauri::{command, State};

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