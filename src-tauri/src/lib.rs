mod commands;
mod logging;
mod models;

use serde_json::json;

use crate::logging::{AppLoggerState, LogLevel};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let logger = AppLoggerState::new("Clusiv Data", env!("CARGO_PKG_VERSION"))
        .expect("failed to initialize application logger");
    logger.install_panic_hook();
    logger.log_system(
        LogLevel::Info,
        "tauri",
        "bootstrap_started",
        "Starting Tauri application bootstrap.",
        json!({}),
    );

    let logger_for_setup = logger.clone();

    let result = tauri::Builder::default()
        .manage(logger.clone())
        .setup(move |_app| {
            logger_for_setup.log_system(
                LogLevel::Info,
                "tauri",
                "setup_complete",
                "Tauri setup completed.",
                json!({}),
            );
            Ok(())
        })
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            commands::data::load_data,
            commands::data::save_data,
            commands::backup::create_backup,
            commands::logs::append_frontend_log,
            commands::logs::get_log_status,
            commands::logs::export_logs,
            commands::shell::open_url,
        ])
        .run(tauri::generate_context!());

    match result {
        Ok(()) => logger.log_system(
            LogLevel::Info,
            "tauri",
            "app_exit",
            "Application exited cleanly.",
            json!({}),
        ),
        Err(error) => {
            logger.log_system(
                LogLevel::Fatal,
                "tauri",
                "app_exit_error",
                "Application terminated with a Tauri runtime error.",
                json!({ "error": error.to_string() }),
            );
            panic!("error while running tauri application: {error}");
        }
    }
}