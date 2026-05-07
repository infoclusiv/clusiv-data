use std::path::{Path, PathBuf};
use std::time::Instant;

use chrono::{DateTime, Local};
use serde::Serialize;
use serde_json::json;
use tauri::{command, State};
use tauri_plugin_shell::ShellExt;

use crate::logging::{AppLoggerState, LogLevel};
use crate::models::AppData;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct BackupInfo {
    name: String,
    kind: String,
    size_bytes: u64,
    modified_at: String,
    created_label: String,
}

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

fn is_json_file(path: &Path) -> bool {
    path.is_file()
        && path
            .extension()
            .and_then(|extension| extension.to_str())
            .is_some_and(|extension| extension.eq_ignore_ascii_case("json"))
}

fn get_backup_kind(file_name: &str) -> String {
    if file_name.contains("backup_manual_") {
        "manual".to_string()
    } else if file_name.contains("backup_auto_") {
        "auto".to_string()
    } else {
        "unknown".to_string()
    }
}

fn validate_backup_file_name(backup_name: &str) -> Result<(), String> {
    if backup_name.trim().is_empty() {
        return Err("Selecciona un backup válido.".to_string());
    }

    if backup_name.contains('/') || backup_name.contains('\\') || backup_name.contains("..") {
        return Err("El nombre del backup no es válido.".to_string());
    }

    if !backup_name.ends_with(".json") {
        return Err("Solo se pueden restaurar backups JSON.".to_string());
    }

    Ok(())
}

fn create_backup_file(manual: bool, logger: &AppLoggerState) -> Result<String, String> {
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
    let removed_backups = cleanup_old_backups(20);

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
pub fn create_backup(manual: bool, logger: State<'_, AppLoggerState>) -> Result<String, String> {
    create_backup_file(manual, &logger)
}

#[command]
pub fn list_backups(logger: State<'_, AppLoggerState>) -> Result<Vec<BackupInfo>, String> {
    let started_at = Instant::now();
    let backup_dir = get_backup_dir();

    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "list_backups_started",
        "Listing available backups.",
        json!({
            "backupDirectory": backup_dir.to_string_lossy().to_string(),
        }),
    );

    if !backup_dir.exists() {
        return Ok(Vec::new());
    }

    let entries = std::fs::read_dir(&backup_dir).map_err(|error| {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "list_backups_read_dir_failed",
            "Failed to read backups directory.",
            json!({
                "backupDirectory": backup_dir.to_string_lossy().to_string(),
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        error.to_string()
    })?;

    let mut backups = Vec::new();

    for entry in entries.flatten() {
        let path = entry.path();
        if !is_json_file(&path) {
            continue;
        }

        let Ok(metadata) = entry.metadata() else {
            continue;
        };

        let name = entry.file_name().to_string_lossy().to_string();
        let modified = metadata.modified().ok();
        let modified_at = modified
            .map(|time| DateTime::<Local>::from(time).to_rfc3339())
            .unwrap_or_default();
        let created_label = modified
            .map(|time| {
                DateTime::<Local>::from(time)
                    .format("%Y-%m-%d %H:%M:%S")
                    .to_string()
            })
            .unwrap_or_else(|| "Fecha desconocida".to_string());

        backups.push(BackupInfo {
            name: name.clone(),
            kind: get_backup_kind(&name),
            size_bytes: metadata.len(),
            modified_at,
            created_label,
        });
    }

    backups.sort_by(|left, right| right.modified_at.cmp(&left.modified_at));

    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "list_backups_completed",
        "Available backups listed successfully.",
        json!({
            "backupCount": backups.len(),
            "durationMs": started_at.elapsed().as_millis(),
        }),
    );

    Ok(backups)
}

#[command]
pub fn restore_backup(
    backup_name: String,
    logger: State<'_, AppLoggerState>,
) -> Result<String, String> {
    let started_at = Instant::now();
    validate_backup_file_name(&backup_name)?;

    let backup_dir = get_backup_dir();
    let backup_path = backup_dir.join(&backup_name);
    let data_path = get_data_path();

    logger.log_backend(
        LogLevel::Warn,
        "commands::backup",
        "restore_backup_started",
        "Restoring application data from backup.",
        json!({
            "backupName": backup_name,
            "backupPath": backup_path.to_string_lossy().to_string(),
            "dataPath": data_path.to_string_lossy().to_string(),
        }),
    );

    if !backup_path.exists() || !is_json_file(&backup_path) {
        return Err("El backup seleccionado no existe.".to_string());
    }

    let content = std::fs::read_to_string(&backup_path).map_err(|error| {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "restore_backup_read_failed",
            "Failed to read selected backup file.",
            json!({
                "backupName": backup_name,
                "backupPath": backup_path.to_string_lossy().to_string(),
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        error.to_string()
    })?;

    serde_json::from_str::<AppData>(&content).map_err(|error| {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "restore_backup_invalid_json",
            "Selected backup is not a valid application data file.",
            json!({
                "backupName": backup_name,
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        "El backup seleccionado no tiene un formato válido.".to_string()
    })?;

    if data_path.exists() {
        create_backup_file(false, &logger).map_err(|error| {
            logger.log_backend(
                LogLevel::Error,
                "commands::backup",
                "restore_backup_safety_backup_failed",
                "Failed to create the automatic safety backup before restoring.",
                json!({
                    "backupName": backup_name,
                    "error": error,
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            "No se pudo crear el backup automático de seguridad antes de restaurar.".to_string()
        })?;
    }

    std::fs::write(&data_path, content).map_err(|error| {
        logger.log_backend(
            LogLevel::Error,
            "commands::backup",
            "restore_backup_write_failed",
            "Failed to replace current data file with backup content.",
            json!({
                "backupName": backup_name,
                "dataPath": data_path.to_string_lossy().to_string(),
                "error": error.to_string(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        error.to_string()
    })?;

    logger.log_backend(
        LogLevel::Info,
        "commands::backup",
        "restore_backup_completed",
        "Application data restored from backup successfully.",
        json!({
            "backupName": backup_name,
            "durationMs": started_at.elapsed().as_millis(),
        }),
    );

    Ok(format!("Backup restaurado: {}", backup_name))
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
        .filter(|entry| is_json_file(&entry.path()))
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
