use std::path::PathBuf;
use std::time::Instant;

use chrono::Local;
use serde_json::json;
use tauri::{command, State};
use tauri_plugin_shell::ShellExt;

use crate::logging::{AppLoggerState, LogLevel};

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn executable_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn get_backup_dir() -> PathBuf {
    if cfg!(debug_assertions) {
        return workspace_root().join("backups");
    }
    executable_dir().join("backups")
}

fn get_data_path() -> PathBuf {
    let workspace_path = workspace_root().join("data.json");
    if cfg!(debug_assertions) && workspace_path.exists() {
        return workspace_path;
    }
    executable_dir().join("data.json")
}

#[command]
pub fn create_backup(manual: bool, logger: State<'_, AppLoggerState>) -> Result<String, String> {
    let started_at = Instant::now();
    let data_path = get_data_path();
    if !data_path.exists() {
        logger.log_backend(
            LogLevel::Warn,
            "commands::backup",
            "create_backup_missing_data",
            "Backup requested but there is no data file to copy.",
            json!({
                "manual": manual,
                "dataPath": data_path.to_string_lossy().to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        return Err("No hay datos para respaldar.".to_string());
    }

    let backup_dir = get_backup_dir();
    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "create_backup_started",
        "Creating application backup.",
        json!({
            "manual": manual,
            "dataPath": data_path.to_string_lossy().to_string(),
            "backupDirectory": backup_dir.to_string_lossy().to_string(),
        }),
    );

    if let Err(error) = std::fs::create_dir_all(&backup_dir) {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "create_backup_dir_failed",
            "Failed to create backup directory.",
            json!({
                "manual": manual,
                "backupDirectory": backup_dir.to_string_lossy().to_string(),
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        return Err(error.to_string());
    }

    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    let prefix = if manual { "manual_" } else { "auto_" };
    let backup_name = format!("backup_{}{}.json", prefix, timestamp);
    let backup_path = backup_dir.join(&backup_name);

    if let Err(error) = std::fs::copy(&data_path, &backup_path) {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "create_backup_copy_failed",
            "Failed to copy data file into backup location.",
            json!({
                "manual": manual,
                "dataPath": data_path.to_string_lossy().to_string(),
                "backupPath": backup_path.to_string_lossy().to_string(),
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        return Err(error.to_string());
    }

    let backup_size = std::fs::metadata(&backup_path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    let removed_backups = cleanup_old_backups(5);

    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "create_backup_completed",
        "Backup created successfully.",
        json!({
            "manual": manual,
            "backupName": backup_name,
            "backupPath": backup_path.to_string_lossy().to_string(),
            "bytes": backup_size,
            "removedBackups": removed_backups,
            "durationMs": started_at.elapsed().as_millis(),
        }),
    );

    Ok(format!("Backup creado: {}", backup_name))
}

#[command]
#[allow(deprecated)]
pub async fn open_backup_directory(
    app: tauri::AppHandle,
    logger: State<'_, AppLoggerState>,
) -> Result<(), String> {
    let started_at = Instant::now();
    let backup_dir = get_backup_dir();
    let backup_directory = backup_dir.to_string_lossy().to_string();

    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "open_backup_directory_started",
        "Opening backups directory in the operating system file explorer.",
        json!({
            "backupDirectory": backup_directory.clone(),
        }),
    );

    if let Err(error) = std::fs::create_dir_all(&backup_dir) {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "open_backup_directory_prepare_failed",
            "Failed to ensure the backup directory exists before opening it.",
            json!({
                "backupDirectory": backup_directory,
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        return Err(error.to_string());
    }

    match app.shell().open(&backup_directory, None) {
        Ok(()) => {
            logger.log_backend(
                LogLevel::Info,
                "commands::backup",
                "open_backup_directory_completed",
                "Backups directory opened successfully.",
                json!({
                    "backupDirectory": backup_directory,
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Ok(())
        }
        Err(error) => {
            logger.log_backend(
                LogLevel::Error,
                "commands::backup",
                "open_backup_directory_failed",
                "Failed to open the backups directory.",
                json!({
                    "backupDirectory": backup_directory,
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            Err(error.to_string())
        }
    }
}

fn cleanup_old_backups(max_backups: usize) -> usize {
    let backup_dir = get_backup_dir();
    let Ok(entries) = std::fs::read_dir(&backup_dir) else {
        return 0;
    };

    let mut files: Vec<(PathBuf, std::time::SystemTime)> = entries
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().extension().is_some_and(|extension| extension == "json"))
        .filter_map(|entry| {
            let path = entry.path();
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((path, modified))
        })
        .collect();

    files.sort_by(|left, right| right.1.cmp(&left.1));

    let mut removed = 0;
    for (path, _) in files.iter().skip(max_backups) {
        if std::fs::remove_file(path).is_ok() {
            removed += 1;
        }
    }

    removed
}