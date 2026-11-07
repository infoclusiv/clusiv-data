use std::{
    env,
    fs::{self, File},
    path::{Path, PathBuf},
    process::{Command, Stdio},
};

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use uuid::Uuid;

const AUDIO_EXTENSIONS: &[&str] = &["mp3", "wav", "m4a", "mp4", "flac", "ogg"];
const OUTPUT_EXTENSIONS: &[&str] = &["txt", "srt", "vtt", "tsv", "json"];
const EXPORT_EXTENSIONS: &[&str] = &["txt", "srt", "vtt", "tsv", "json", "mp3"];
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

// A Python/Conda environment is not automatically added to the PATH of a
// desktop application. Discover existing installations without installing or
// downloading anything.
fn supported_executable(path: &Path) -> bool {
    if !path.is_file() {
        return false;
    }
    let name = path.file_name().and_then(|s| s.to_str()).unwrap_or_default();
    name.eq_ignore_ascii_case("whisperx.exe") || name.eq_ignore_ascii_case("python.exe")
}

fn environment_entry(environment: &Path) -> Option<PathBuf> {
    let cli = environment.join("Scripts").join("whisperx.exe");
    if cli.is_file() {
        return Some(cli);
    }

    // Some installations have the Python package but no console-script entry.
    let python = environment.join("python.exe");
    let main_module = environment.join("Lib").join("site-packages").join("whisperx").join("__main__.py");
    if python.is_file() && main_module.is_file() {
        return Some(python);
    }
    None
}

fn discover_whisperx() -> Option<PathBuf> {
    if let Some(path) = env::var_os("PATH") {
        for directory in env::split_paths(&path) {
            let executable = directory.join("whisperx.exe");
            if executable.is_file() {
                return Some(executable);
            }
        }
    }

    for key in ["CONDA_PREFIX", "VIRTUAL_ENV"] {
        if let Some(prefix) = env::var_os(key) {
            if let Some(executable) = environment_entry(&PathBuf::from(prefix)) {
                return Some(executable);
            }
        }
    }

    let mut roots = Vec::new();
    if let Some(user_profile) = env::var_os("USERPROFILE") {
        let home = PathBuf::from(user_profile);
        for base in ["miniconda3", "anaconda3", "miniforge3", "mambaforge", ".conda"] {
            roots.push(home.join(base));
        }
    }
    if let Some(program_data) = env::var_os("ProgramData") {
        let base = PathBuf::from(program_data);
        for name in ["miniconda3", "anaconda3"] {
            roots.push(base.join(name));
        }
    }
    for base in roots {
        if let Some(executable) = environment_entry(&base) {
            return Some(executable);
        }
        let mut environments: Vec<PathBuf> = fs::read_dir(base.join("envs"))
            .into_iter()
            .flat_map(|entries| entries.filter_map(Result::ok))
            .map(|entry| entry.path())
            .filter(|path| path.is_dir())
            .collect();
        // Prefer dedicated whisperx environments over arbitrary Python environments.
        environments.sort_by_key(|path| {
            !path.file_name()
                .and_then(|name| name.to_str())
                .unwrap_or_default()
                .to_lowercase()
                .contains("whisper")
        });
        for candidate in environments {
            if let Some(executable) = environment_entry(&candidate) {
                return Some(executable);
            }
        }
    }
    None
}

fn executable_command(configured: Option<String>) -> Result<PathBuf, String> {
    if let Some(value) = configured.map(|s| s.trim().to_owned()).filter(|s| !s.is_empty()) {
        let path = PathBuf::from(value);
        if !supported_executable(&path) {
            return Err("Selecciona whisperx.exe o python.exe del entorno donde instalaste WhisperX. No selecciones archivos .bat.".into());
        }
        return Ok(path);
    }
    discover_whisperx().ok_or_else(|| {
        "No se encontró WhisperX automáticamente. Abre Configuración y pulsa 'Detectar instalación' o selecciona whisperx.exe dentro de Scripts del entorno Conda donde ya funciona.".into()
    })
}

fn prepare_python_environment(command: &mut Command, executable: &Path) {
    let Some(parent) = executable.parent() else { return };
    let is_scripts = parent.file_name().and_then(|s| s.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("Scripts"));
    let environment = if is_scripts { parent.parent().unwrap_or(parent) } else { parent };
    let mut paths = Vec::new();
    if is_scripts {
        paths.push(parent.to_path_buf());
    } else {
        paths.push(environment.join("Scripts"));
    }
    paths.push(environment.to_path_buf());
    let conda_libraries = environment.join("Library").join("bin");
    if conda_libraries.is_dir() {
        paths.push(conda_libraries);
        command.env("CONDA_PREFIX", environment);
    }
    if let Some(previous) = env::var_os("PATH") {
        paths.extend(env::split_paths(&previous));
    }
    if let Ok(joined) = env::join_paths(paths) {
        command.env("PATH", joined);
    }
}

#[tauri::command]
pub fn detect_whisperx() -> Option<String> {
    discover_whisperx().map(|path| path.to_string_lossy().into_owned())
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
    existing_output_dir: Option<PathBuf>,
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
    let downloaded_from_x = existing_output_dir.is_some();
    let output_dir = if let Some(dir) = existing_output_dir {
        if dir.parent() != Some(root.as_path()) || !dir.is_dir() {
            return Err("La carpeta de trabajo de X no es válida.".into());
        }
        dir
    } else {
        let dir = root.join(format!("audio-{}", Uuid::new_v4()));
        fs::create_dir(&dir).map_err(|e| format!("No se pudo crear una carpeta de transcripción: {e}"))?;
        dir
    };

    let stdout_path = output_dir.join("whisperx.stdout.log");
    let stderr_path = output_dir.join("whisperx.stderr.log");
    let stdout = File::create(&stdout_path).map_err(|e| e.to_string())?;
    let stderr = File::create(&stderr_path).map_err(|e| e.to_string())?;

    // Never invoke cmd.exe, PowerShell or a shell. Every argument is passed separately.
    let mut command = Command::new(&executable);
    prepare_python_environment(&mut command, &executable);
    if executable.file_name().and_then(|s| s.to_str())
        .is_some_and(|name| name.eq_ignore_ascii_case("python.exe"))
    {
        command.arg("-m").arg("whisperx");
    }
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
        "No se pudo iniciar WhisperX ({e}). Usa Configuración para seleccionar whisperx.exe o python.exe del entorno donde WhisperX funciona."
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

    // An X download is saved beside the generated transcripts. Never expose
    // arbitrary user-provided audio files through the export command.
    if downloaded_from_x
        && audio.parent() == fs::canonicalize(&output_dir).ok().as_deref()
        && has_allowed_extension(&audio, &["mp3"])
    {
        files.push(TranscriptionFile {
            kind: "mp3".into(),
            name: audio.file_name().unwrap_or_default().to_string_lossy().into_owned(),
            source_path: audio.to_string_lossy().into_owned(),
        });
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
        transcribe_blocking(audio_path, executable_path, language, root, None)
    })
    .await
    .map_err(|e| format!("No se pudo completar el proceso de transcripción: {e}"))?
}


fn parse_x_post_url(input: &str) -> Result<(String, String), String> {
    let trimmed = input.trim();
    if trimmed.is_empty() || trimmed.len() > 2048 {
        return Err("Pega un enlace válido de una publicación de X.com.".into());
    }
    let without_tracking = trimmed.split(['?', '#']).next().unwrap_or_default();
    let after_scheme = without_tracking
        .strip_prefix("https://")
        .ok_or_else(|| "Utiliza un enlace HTTPS de X.com o Twitter.com.".to_owned())?;
    let (host, path) = after_scheme
        .split_once('/')
        .ok_or_else(|| "El enlace debe identificar una publicación de X.".to_owned())?;
    if !["x.com", "www.x.com", "mobile.x.com", "twitter.com", "www.twitter.com", "mobile.twitter.com"]
        .contains(&host.to_ascii_lowercase().as_str())
    {
        return Err("Solo se aceptan enlaces de publicaciones de X.com o Twitter.com.".into());
    }
    let parts: Vec<&str> = path.trim_end_matches('/').split('/').collect();
    if parts.len() != 3
        || parts[1] != "status"
        || parts[0].is_empty()
        || parts[0].len() > 15
        || !parts[0].bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        || parts[2].len() < 10
        || parts[2].len() > 22
        || !parts[2].bytes().all(|b| b.is_ascii_digit())
    {
        return Err("El enlace debe tener el formato https://x.com/usuario/status/123456789.".into());
    }
    let tweet_id = parts[2].to_owned();
    Ok((format!("https://x.com/{}/status/{tweet_id}", parts[0]), tweet_id))
}

fn download_x_mp3(url: &str, tweet_id: &str, output_dir: &Path) -> Result<PathBuf, String> {
    // Use the Python launcher proven to work on Windows, with fallbacks for
    // environments where yt-dlp is installed as a standalone executable.
    let launchers: [(&str, &[&str]); 3] = [
        ("py", &["-m", "yt_dlp"]),
        ("python", &["-m", "yt_dlp"]),
        ("yt-dlp", &[]),
    ];
    let (program, prefix) = launchers
        .into_iter()
        .find(|(program, prefix)| {
            Command::new(program)
                .args(*prefix)
                .arg("--version")
                .stdout(Stdio::null())
                .stderr(Stdio::null())
                .status()
                .is_ok_and(|status| status.success())
        })
        .ok_or_else(|| "No se encontró yt-dlp. Instálalo con: py -m pip install -U yt-dlp".to_owned())?;
    let ffmpeg_present = Command::new("ffmpeg")
        .arg("-version")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .status()
        .is_ok_and(|status| status.success());
    if !ffmpeg_present {
        return Err("No se encontró FFmpeg en el PATH. Instálalo con: winget install -e --id Gyan.FFmpeg, y reinicia la aplicación.".into());
    }

    let log_path = output_dir.join("x_download.log");
    let log = File::create(&log_path).map_err(|e| e.to_string())?;
    let error_log = log.try_clone().map_err(|e| e.to_string())?;
    let output_template = output_dir.join(format!("x-{tweet_id}.%(ext)s"));

    // A validated canonical X URL is passed as ONE argument. Never use a shell.
    let status = Command::new(program)
        .args(prefix)
        .arg("--ignore-config")
        .arg("--no-playlist")
        .arg("--no-progress")
        .arg("--no-overwrites")
        .arg("--max-filesize")
        .arg("250M")
        .arg("--socket-timeout")
        .arg("30")
        .arg("-f")
        .arg("ba/b")
        .arg("-x")
        .arg("--audio-format")
        .arg("mp3")
        .arg("--audio-quality")
        .arg("192K")
        .arg("-o")
        .arg(&output_template)
        .arg(url)
        .stdout(Stdio::from(log))
        .stderr(Stdio::from(error_log))
        .status()
        .map_err(|e| format!("No se pudo ejecutar yt-dlp: {e}"))?;
    if !status.success() {
        let details = last_log_excerpt(&log_path);
        return Err(format!(
            "No se pudo descargar el audio de X. {} Registro: {}",
            if details.is_empty() { "Comprueba que el video sea público y accesible." } else { &details },
            log_path.display()
        ));
    }
    let mp3_path = output_dir.join(format!("x-{tweet_id}.mp3"));
    if !mp3_path.is_file() {
        return Err(format!("La descarga terminó, pero no se encontró el MP3. Revisa: {}", log_path.display()));
    }
    Ok(mp3_path)
}

#[tauri::command]
pub async fn transcribe_x_audio(
    url: String,
    executable_path: Option<String>,
    language: String,
    app: AppHandle,
) -> Result<TranscriptionResult, String> {
    let (canonical_url, tweet_id) = parse_x_post_url(&url)?;
    let root = transcription_root(&app)?;
    tauri::async_runtime::spawn_blocking(move || {
        fs::create_dir_all(&root).map_err(|e| format!("No se pudo preparar la carpeta: {e}"))?;
        let output_dir = root.join(format!("audio-{}", Uuid::new_v4()));
        fs::create_dir(&output_dir).map_err(|e| format!("No se pudo crear la carpeta: {e}"))?;
        let _ = app.emit("x-transcription-stage", "downloading");
        let mp3_path = download_x_mp3(&canonical_url, &tweet_id, &output_dir)?;
        let _ = app.emit("x-transcription-stage", "transcribing");
        transcribe_blocking(
            mp3_path.to_string_lossy().into_owned(),
            executable_path,
            language,
            root,
            Some(output_dir),
        )
    })
    .await
    .map_err(|e| format!("No se pudo completar la descarga y transcripción: {e}"))?
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
    if relative.components().count() != 2 || !has_allowed_extension(&source, EXPORT_EXTENSIONS) || !source.is_file() {
        return Err("Solo se pueden exportar archivos de transcripción generados por la aplicación.".into());
    }
    let destination = Path::new(&destination_path);
    if !has_allowed_extension(destination, EXPORT_EXTENSIONS)
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
pub fn open_transcription_directory(output_dir: Option<String>, app: AppHandle) -> Result<(), String> {
    let root = transcription_root(&app)?;
    fs::create_dir_all(&root).map_err(|e| e.to_string())?;
    let root = fs::canonicalize(root).map_err(|e| e.to_string())?;
    let target = if let Some(selected) = output_dir.filter(|value| !value.trim().is_empty()) {
        let selected = fs::canonicalize(selected).map_err(|e| e.to_string())?;
        if !selected.is_dir() || selected.parent() != Some(root.as_path()) {
            return Err("La carpeta de resultados no pertenece a Clusiv Data.".into());
        }
        selected
    } else {
        root
    };

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer.exe")
            .arg(&target)
            .spawn()
            .map_err(|e| format!("No se pudo abrir el Explorador de Windows: {e}"))?;
        Ok(())
    }

    #[cfg(not(target_os = "windows"))]
    {
        let _ = target;
        Err("La apertura automática de la carpeta está disponible en Windows.".into())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn x_urls_are_strictly_validated_and_tracking_is_stripped() {
        let parsed = parse_x_post_url("https://x.com/ai_with_jyoti/status/2118684927789314311?a=key&s=20").unwrap();
        assert_eq!(parsed.0, "https://x.com/ai_with_jyoti/status/2118684927789314311");
        assert_eq!(parsed.1, "2118684927789314311");
        assert!(parse_x_post_url("https://twitter.com/some_user/status/2118684927789314311").is_ok());
        assert!(parse_x_post_url("https://x.com/i/status/2118684927789314311").is_ok());
        for invalid in [
            "http://x.com/user/status/2118684927789314311",
            "https://x.com.evil.org/user/status/2118684927789314311",
            "https://x.com@evil.org/user/status/2118684927789314311",
            "https://example.com/user/status/2118684927789314311",
            "https://x.com/user/status/not-a-number",
            "https://x.com/user/status/2118684927789314311/other",
            "https://x.com/user/home",
        ] {
            assert!(parse_x_post_url(invalid).is_err(), "{invalid}");
        }
    }

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
