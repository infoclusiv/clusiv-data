use std::path::PathBuf;

use chrono::Local;
use tauri::command;

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
pub fn create_backup(manual: bool) -> Result<String, String> {
    let data_path = get_data_path();
    if !data_path.exists() {
        return Err("No hay datos para respaldar.".to_string());
    }

    let backup_dir = get_backup_dir();
    std::fs::create_dir_all(&backup_dir).map_err(|error| error.to_string())?;

    let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
    let prefix = if manual { "manual_" } else { "auto_" };
    let backup_name = format!("backup_{}{}.json", prefix, timestamp);
    let backup_path = backup_dir.join(&backup_name);

    std::fs::copy(&data_path, &backup_path).map_err(|error| error.to_string())?;
    cleanup_old_backups(5);

    Ok(format!("Backup creado: {}", backup_name))
}

fn cleanup_old_backups(max_backups: usize) {
    let backup_dir = get_backup_dir();
    let Ok(entries) = std::fs::read_dir(&backup_dir) else {
        return;
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

    for (path, _) in files.iter().skip(max_backups) {
        let _ = std::fs::remove_file(path);
    }
}