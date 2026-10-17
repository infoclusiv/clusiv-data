use std::{
    fs::{self, File},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use serde::Serialize;
use tauri::{AppHandle, Manager};
use uuid::Uuid;

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "wav", "m4a", "mp4", "flac", "ogg"];
const OUTPUT_EXTENSIONS: &[&str] = &["txt", "srt", "vtt", "tsv", "json"];
const PREVIEW_MAX_CHARS: usize = 25_000;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionFile {
    kind: String,
    name: String,
    source_path: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TranscriptionResult {
    audio_name: String,
    output_dir: String,
    preview: String,
    preview_truncated: bool,
    files: Vec<TranscriptionFile>,
}

fn transcription_root(app: &AppHandle) -> Result<PathBuf, String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(data.join("transcriptions"))
}

fn has_allowed_extension(path: &Path, allowed: &[&str]) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|ext| allowed.iter().any(|allowed_ext| ext.eq_ignore_ascii_case(allowed_ext)))
}

fn executable_command(configured: Option<String>) -> Result<String, String> {
    match configured.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()) {
        None => Ok("whisperx".to_owned()),
        Some(value) => {
            let path = Path::new(&value);
            if !path.is_file() || !has_allowed_extension(path, &["exe"]) {
                return Err("Selecciona el ejecutable whisperx.exe de tu instalación (no un archivo .bat).".into());
            }
            Ok(value)
        }
    }
}

fn last_log_excerpt(path: &Path) -> String {
    let content = fs::read_to_string(path).unwrap_or_default();
    content
        .chars()
        .rev()
        .take(2_500)
        .collect::<String>()
        .chars()
        .rev()
        .collect::<String>()
        .trim()
        .to_owned()
}

fn transcribe_blocking(
    audio_path: String,
    executable_path: Option<String>,
    language: String,
    root: PathBuf,
) -> Result<TranscriptionResult, String> {
    let audio = fs::canonicalize(&audio_path)
        .map_err(|_| "El archivo de audio seleccionado ya no existe o no es accesible.".to_owned())?;
    if !audio.is_file() || !has_allowed_extension(&audio, AUDIO_EXTENSIONS) {
        return Err("Selecciona un audio MP3, WAV, M4A, MP4, FLAC u OGG.".into());
    }
    if !["auto", "es", "en"].contains(&language.as_str()) {
        return Err("Idioma de transcripción no válido.".into());
    }
    let executable = executable_command(executable_path)?;

    fs::create_dir_all(&root).map_err(|e| format!("No se pudo preparar la carpeta de resultados: {e}"))?;
    let output_dir = root.join(format!("audio-{}", Uuid::new_v4()));
    fs::create_dir(&output_dir).map_err(|e| format!("No se pudo crear una carpeta de transcripción: {e}"))?;

    let stdout_path = output_dir.join("whisperx.stdout.log");
    let stderr_path = output_dir.join("whisperx.stderr.log");
    let stdout = File::create(&stdout_path).map_err(|e| e.to_string())?;
    let stderr = File::create(&stderr_path).map_err(|e| e.to_string())?;

    // Never invoke cmd.exe, PowerShell or a shell. Every argument is passed separately.
    let mut command = Command::new(&executable);
    command
        .arg(&audio)
        .arg("--output_dir")
        .arg(&output_dir)
        .arg("--output_format")
        .arg("all")
        .stdout(Stdio::from(stdout))
        .stderr(Stdio::from(stderr));
    if language != "auto" {
        command.arg("--language").arg(&language);
    }

    let status = command.status().map_err(|e| format!(
        "No se pudo iniciar WhisperX ({e}). Comprueba que whisperx.exe esté en el PATH de Windows o selecciónalo en Configuración."
    ))?;
    if !status.success() {
        let details = last_log_excerpt(&stderr_path);
        return Err(format!(
            "WhisperX terminó con error (código {}). {} Revisa el registro en: {}",
            status.code().map(|n| n.to_string()).unwrap_or_else(|| "desconocido".into()),
            if details.is_empty() { "Consulta los registros de WhisperX." } else { &details },
            output_dir.display()
        ));
    }

    let base_name = audio.file_stem().and_then(|s| s.to_str())
        .ok_or_else(|| "El archivo tiene un nombre no compatible.".to_owned())?;
    let mut files = Vec::new();
    for ext in OUTPUT_EXTENSIONS {
        let file = output_dir.join(format!("{base_name}.{ext}"));
        if file.is_file() {
            files.push(TranscriptionFile {
                kind: (*ext).to_owned(),
                name: file.file_name().unwrap_or_default().to_string_lossy().into_owned(),
                source_path: file.to_string_lossy().into_owned(),
            });
        }
    }
    if files.is_empty() {
        return Err(format!(
            "WhisperX finalizó, pero no se encontraron archivos de transcripción. Revisa: {}",
            output_dir.display()
        ));
    }

    let text_file = output_dir.join(format!("{base_name}.txt"));
    let text = fs::read_to_string(text_file).unwrap_or_default();
    let preview = text.chars().take(PREVIEW_MAX_CHARS).collect::<String>();
    Ok(TranscriptionResult {
        audio_name: audio.file_name().unwrap_or_default().to_string_lossy().into_owned(),
        output_dir: output_dir.to_string_lossy().into_owned(),
        preview_truncated: text.chars().count() > PREVIEW_MAX_CHARS,
        preview,
        files,
    })
}

#[tauri::command]
pub async fn transcribe_audio(
    audio_path: String,
    executable_path: Option<String>,
    language: String,
    app: AppHandle,
) -> Result<TranscriptionResult, String> {
    let root = transcription_root(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        transcribe_blocking(audio_path, executable_path, language, root)
    })
    .await
    .map_err(|e| format!("No se pudo completar el proceso de transcripción: {e}"))?
}

#[tauri::command]
pub fn export_transcription_file(
    source_path: String,
    destination_path: String,
    app: AppHandle,
) -> Result<(), String> {
    let root = transcription_root(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let source = fs::canonicalize(&source_path).map_err(|e| e.to_string())?;
    let relative = source
        .strip_prefix(&root)
        .map_err(|_| "El archivo de origen no pertenece a las transcripciones de Clusiv Data.".to_owned())?;

    // Only files immediately inside one generated run directory are exportable.
    if relative.components().count() != 2 || !has_allowed_extension(&source, OUTPUT_EXTENSIONS) || !source.is_file() {
        return Err("Solo se pueden exportar archivos de transcripción generados por la aplicación.".into());
    }
    let destination = Path::new(&destination_path);
    if !has_allowed_extension(destination, OUTPUT_EXTENSIONS)
        || source.extension().map(|e| e.to_ascii_lowercase()) != destination.extension().map(|e| e.to_ascii_lowercase()) {
        return Err("La extensión del archivo de destino debe coincidir con el formato seleccionado.".into());
    }
    if source == destination {
        return Ok(());
    }
    fs::copy(&source, destination).map_err(|e| format!("No se pudo guardar el archivo: {e}"))?;
    Ok(())
}

#[tauri::command]
pub fn open_transcription_directory(app: AppHandle) -> Result<(), String> {
    let root = transcription_root(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(&root)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el Explorador de Windows: {e}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = root;
        Err("La apertura automática de la carpeta está disponible en Windows.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extension_validation_is_case_insensitive() {
        assert!(has_allowed_extension(Path::new("speech.MP3"), AUDIO_EXTENSIONS));
        assert!(!has_allowed_extension(Path::new("malware.exe"), AUDIO_EXTENSIONS));
        assert!(!has_allowed_extension(Path::new("speech.mp3.exe"), AUDIO_EXTENSIONS));
    }

    #[test]
    fn only_expected_languages_are_used() {
        for language in ["auto", "es", "en"] {
            assert!(["auto", "es", "en"].contains(&language));
        }
    }
}
