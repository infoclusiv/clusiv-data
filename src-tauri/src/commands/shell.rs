use tauri::command;
use tauri_plugin_shell::ShellExt;

#[command]
#[allow(deprecated)]
pub async fn open_url(url: String, app: tauri::AppHandle) -> Result<(), String> {
    app.shell().open(&url, None).map_err(|error| error.to_string())
}