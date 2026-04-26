use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::panic;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use chrono::{DateTime, Local, Utc};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use uuid::Uuid;

const MAX_SESSION_FILES: usize = 5;
const MAX_EXPORT_FILES: usize = 5;
const REDACTED_LOG_VALUE: &str = "[REDACTED]";
const REDACTED_PATH_VALUE: &str = "[PATH REDACTED]";

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn executable_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn get_logs_dir() -> PathBuf {
    if cfg!(debug_assertions) {
        return workspace_root().join("logs");
    }
    executable_dir().join("logs")
}

fn short_uuid() -> String {
    Uuid::new_v4().simple().to_string()[..10].to_string()
}

fn normalize_context(context: Value) -> Value {
    let normalized = match context {
        Value::Null | Value::Object(_) | Value::Array(_) => context,
        other => json!({ "value": other }),
    };

    sanitize_context_value(normalized, None)
}

fn normalize_key(key: &str) -> String {
    key.chars()
        .filter(|ch| *ch != '_' && *ch != '-')
        .flat_map(|ch| ch.to_lowercase())
        .collect()
}

fn is_sensitive_field_name(key: &str) -> bool {
    matches!(
        normalize_key(key).as_str(),
        "apikey"
            | "authorization"
            | "authtoken"
            | "accesstoken"
            | "refreshtoken"
            | "secret"
            | "password"
            | "token"
            | "cookie"
            | "setcookie"
            | "clientsecret"
    )
}

fn is_path_field_name(key: &str) -> bool {
    let normalized = normalize_key(key);
    normalized == "path" || normalized.ends_with("path") || normalized.ends_with("directory")
}

fn find_url_token_start(input: &str, scheme_index: usize) -> usize {
    input[..scheme_index]
        .char_indices()
        .rev()
        .find(|(_, ch)| ch.is_whitespace() || matches!(ch, '(' | '[' | '{' | '<' | '"' | '\''))
        .map(|(idx, ch)| idx + ch.len_utf8())
        .unwrap_or(0)
}

fn find_url_token_end(input: &str, scheme_index: usize) -> usize {
    input[scheme_index..]
        .char_indices()
        .find(|(_, ch)| ch.is_whitespace() || matches!(ch, ')' | ']' | '}' | '>' | '"' | '\'' | ','))
        .map(|(idx, _)| scheme_index + idx)
        .unwrap_or(input.len())
}

fn sanitize_url_token(token: &str) -> String {
    let prefix_length = token
        .char_indices()
        .find(|(_, ch)| ch.is_ascii_alphanumeric())
        .map(|(idx, _)| idx)
        .unwrap_or(0);
    let suffix_start = token
        .char_indices()
        .rev()
        .find(|(idx, ch)| *idx >= prefix_length && !matches!(ch, ')' | ']' | '}' | '>' | '"' | '\'' | ',' | ';'))
        .map(|(idx, ch)| idx + ch.len_utf8())
        .unwrap_or(token.len());

    let prefix = &token[..prefix_length];
    let suffix = &token[suffix_start..];
    let core = &token[prefix_length..suffix_start];

    let Some(scheme_separator) = core.find("://") else {
        return token.to_string();
    };

    let scheme = &core[..scheme_separator];
    let remainder = &core[scheme_separator + 3..];
    let remainder = remainder
        .rsplit_once('@')
        .map(|(_, value)| value)
        .unwrap_or(remainder);
    let path_start = remainder.find('/').unwrap_or(remainder.len());
    let host = &remainder[..path_start];
    let path_and_more = &remainder[path_start..];
    let path_end = path_and_more
        .find(|ch| matches!(ch, '?' | '#'))
        .unwrap_or(path_and_more.len());
    let path = &path_and_more[..path_end];
    let sanitized_core = format!("{}://{}{}", scheme, host, path);
    let sanitized_core = if sanitized_core == core {
        sanitized_core
    } else {
        format!("{} {}", sanitized_core, REDACTED_LOG_VALUE)
    };

    format!("{}{}{}", prefix, sanitized_core, suffix)
}

fn sanitize_url_like_segments(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0;

    while let Some(relative_index) = input[cursor..].find("://") {
        let scheme_index = cursor + relative_index;
        let token_start = find_url_token_start(input, scheme_index);
        let token_end = find_url_token_end(input, scheme_index);

        output.push_str(&input[cursor..token_start]);
        output.push_str(&sanitize_url_token(&input[token_start..token_end]));
        cursor = token_end;
    }

    output.push_str(&input[cursor..]);
    output
}

fn sanitize_bearer_tokens(input: &str) -> String {
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0;

    while let Some(relative_index) = input[cursor..].find("Bearer ") {
        let bearer_index = cursor + relative_index;
        let token_start = bearer_index + "Bearer ".len();
        let token_end = input[token_start..]
            .char_indices()
            .find(|(_, ch)| ch.is_whitespace() || matches!(ch, ')' | ']' | '}' | '>' | ',' | ';'))
            .map(|(idx, _)| token_start + idx)
            .unwrap_or(input.len());

        output.push_str(&input[cursor..token_start]);
        output.push_str(REDACTED_LOG_VALUE);
        cursor = token_end;
    }

    output.push_str(&input[cursor..]);
    output
}

fn sanitize_windows_path_segments(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut output = String::with_capacity(input.len());
    let mut cursor = 0;
    let mut search_index = 0;

    while search_index < bytes.len() {
        let Some(relative_index) = input[search_index..].find(':') else {
            break;
        };

        let colon_index = search_index + relative_index;
        let is_drive_prefix = colon_index > 0
            && bytes[colon_index - 1].is_ascii_alphabetic()
            && colon_index + 1 < bytes.len()
            && matches!(bytes[colon_index + 1], b'\\' | b'/');

        if !is_drive_prefix {
            search_index = colon_index + 1;
            continue;
        }

        let path_start = colon_index - 1;
        let path_end = input[colon_index + 1..]
            .char_indices()
            .find(|(_, ch)| ch.is_whitespace() || matches!(ch, ')' | ']' | '}' | '>' | '"' | '\'' | ',' | ';'))
            .map(|(idx, _)| colon_index + 1 + idx)
            .unwrap_or(input.len());

        output.push_str(&input[cursor..path_start]);
        output.push_str(REDACTED_PATH_VALUE);
        cursor = path_end;
        search_index = path_end;
    }

    output.push_str(&input[cursor..]);
    output
}

fn sanitize_string_value(input: &str) -> String {
    sanitize_windows_path_segments(&sanitize_bearer_tokens(&sanitize_url_like_segments(input)))
}

fn sanitize_context_value(value: Value, field_name: Option<&str>) -> Value {
    if let Some(field_name) = field_name {
        if is_sensitive_field_name(field_name) {
            return Value::String(REDACTED_LOG_VALUE.to_string());
        }

        if is_path_field_name(field_name) {
            return Value::String(REDACTED_PATH_VALUE.to_string());
        }
    }

    match value {
        Value::Null | Value::Bool(_) | Value::Number(_) => value,
        Value::String(text) => Value::String(sanitize_string_value(&text)),
        Value::Array(values) => Value::Array(
            values
                .into_iter()
                .map(|value| sanitize_context_value(value, None))
                .collect(),
        ),
        Value::Object(entries) => Value::Object(
            entries
                .into_iter()
                .map(|(key, value)| {
                    let sanitized = sanitize_context_value(value, Some(&key));
                    (key, sanitized)
                })
                .collect(),
        ),
    }
}

fn cleanup_log_files(
    directory: &Path,
    prefix: &str,
    extension: &str,
    max_files: usize,
    exclude: Option<&PathBuf>,
) {
    let Ok(entries) = fs::read_dir(directory) else {
        return;
    };

    let mut files: Vec<(PathBuf, std::time::SystemTime)> = entries
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| {
            let path = entry.path();
            let file_name = path.file_name()?.to_str()?;
            let extension_matches = path.extension().is_some_and(|value| value == extension);
            if !file_name.starts_with(prefix) || !extension_matches {
                return None;
            }
            if exclude.map_or(false, |excluded| excluded == &path) {
                return None;
            }
            let modified = entry.metadata().ok()?.modified().ok()?;
            Some((path, modified))
        })
        .collect();

    files.sort_by(|left, right| right.1.cmp(&left.1));

    for (path, _) in files.iter().skip(max_files) {
        let _ = fs::remove_file(path);
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
    Fatal,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum LogOrigin {
    Backend,
    Frontend,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogEntry {
    pub timestamp: DateTime<Utc>,
    pub sequence: u64,
    pub level: LogLevel,
    pub origin: LogOrigin,
    pub source: String,
    pub action: String,
    pub message: String,
    pub context: Value,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrontendLogEntry {
    pub level: LogLevel,
    pub source: String,
    pub action: String,
    pub message: String,
    #[serde(default)]
    pub context: Option<Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LogStatus {
    pub session_id: String,
    pub session_started_at: DateTime<Utc>,
    pub session_file_path: String,
    pub log_directory: String,
    pub entry_count: u64,
    pub last_export_path: Option<String>,
    pub app_name: String,
    pub app_version: String,
    pub build_profile: String,
    pub platform: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportBundle {
    exported_at: DateTime<Utc>,
    app: ExportAppMetadata,
    session: ExportSessionMetadata,
    entries: Vec<LogEntry>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportAppMetadata {
    name: String,
    version: String,
    build_profile: String,
    platform: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ExportSessionMetadata {
    id: String,
    started_at: DateTime<Utc>,
    entry_count: u64,
    session_file_path: String,
    log_directory: String,
}

struct AppLogger {
    app_name: String,
    app_version: String,
    build_profile: String,
    platform: String,
    log_directory: PathBuf,
    session_id: String,
    session_started_at: DateTime<Utc>,
    session_file_path: PathBuf,
    session_file: File,
    entry_count: u64,
    last_export_path: Option<PathBuf>,
}

#[derive(Clone)]
pub struct AppLoggerState {
    inner: Arc<Mutex<AppLogger>>,
}

impl AppLoggerState {
    pub fn new(app_name: &str, app_version: &str) -> Result<Self, String> {
        let logger = AppLogger::new(app_name.to_string(), app_version.to_string())?;
        let state = Self {
            inner: Arc::new(Mutex::new(logger)),
        };

        state.log_system(
            LogLevel::Info,
            "logging",
            "session_started",
            "Structured logging session initialized.",
            json!({}),
        );

        Ok(state)
    }

    pub fn install_panic_hook(&self) {
        let logger = self.clone();
        let previous_hook = panic::take_hook();

        panic::set_hook(Box::new(move |info| {
            let location = info.location().map(|location| {
                json!({
                    "file": location.file(),
                    "line": location.line(),
                    "column": location.column(),
                })
            });

            let payload = if let Some(message) = info.payload().downcast_ref::<&str>() {
                (*message).to_string()
            } else if let Some(message) = info.payload().downcast_ref::<String>() {
                message.clone()
            } else {
                "panic without message".to_string()
            };

            logger.log_system(
                LogLevel::Fatal,
                "panic_hook",
                "panic",
                "Unhandled panic captured.",
                json!({
                    "payload": payload,
                    "location": location,
                }),
            );

            previous_hook(info);
        }));
    }

    pub fn log_backend(
        &self,
        level: LogLevel,
        source: &str,
        action: &str,
        message: impl Into<String>,
        context: Value,
    ) {
        let _ = self.append(LogOrigin::Backend, level, source, action, message.into(), context);
    }

    pub fn log_system(
        &self,
        level: LogLevel,
        source: &str,
        action: &str,
        message: impl Into<String>,
        context: Value,
    ) {
        let _ = self.append(LogOrigin::System, level, source, action, message.into(), context);
    }

    pub fn append_frontend(&self, entry: FrontendLogEntry) -> Result<(), String> {
        self.append(
            LogOrigin::Frontend,
            entry.level,
            &entry.source,
            &entry.action,
            entry.message,
            entry.context.unwrap_or(Value::Null),
        )
    }

    pub fn get_status(&self) -> Result<LogStatus, String> {
        let logger = self
            .inner
            .lock()
            .map_err(|_| "No se pudo acceder al logger de la aplicación.".to_string())?;

        Ok(logger.status())
    }

    pub fn export_logs(&self) -> Result<String, String> {
        let mut logger = self
            .inner
            .lock()
            .map_err(|_| "No se pudo acceder al logger de la aplicación.".to_string())?;

        logger.export_logs()
    }

    fn append(
        &self,
        origin: LogOrigin,
        level: LogLevel,
        source: &str,
        action: &str,
        message: String,
        context: Value,
    ) -> Result<(), String> {
        let mut logger = self
            .inner
            .lock()
            .map_err(|_| "No se pudo acceder al logger de la aplicación.".to_string())?;

        logger.append_entry(origin, level, source.to_string(), action.to_string(), message, context)
    }
}

impl AppLogger {
    fn new(app_name: String, app_version: String) -> Result<Self, String> {
        let log_directory = get_logs_dir();
        fs::create_dir_all(&log_directory).map_err(|error| error.to_string())?;

        let session_started_at = Utc::now();
        let timestamp = Local::now().format("%Y-%m-%d_%H-%M-%S");
        let session_id = format!("session_{}_{}", timestamp, short_uuid());
        let session_file_path = log_directory.join(format!("{}.ndjson", session_id));
        let session_file = OpenOptions::new()
            .create(true)
            .append(true)
            .open(&session_file_path)
            .map_err(|error| error.to_string())?;

        cleanup_log_files(
            &log_directory,
            "session_",
            "ndjson",
            MAX_SESSION_FILES,
            Some(&session_file_path),
        );

        Ok(Self {
            app_name,
            app_version,
            build_profile: if cfg!(debug_assertions) {
                "debug".to_string()
            } else {
                "release".to_string()
            },
            platform: std::env::consts::OS.to_string(),
            log_directory,
            session_id,
            session_started_at,
            session_file_path,
            session_file,
            entry_count: 0,
            last_export_path: None,
        })
    }

    fn status(&self) -> LogStatus {
        LogStatus {
            session_id: self.session_id.clone(),
            session_started_at: self.session_started_at,
            session_file_path: self.session_file_path.to_string_lossy().to_string(),
            log_directory: self.log_directory.to_string_lossy().to_string(),
            entry_count: self.entry_count,
            last_export_path: self
                .last_export_path
                .as_ref()
                .map(|path| path.to_string_lossy().to_string()),
            app_name: self.app_name.clone(),
            app_version: self.app_version.clone(),
            build_profile: self.build_profile.clone(),
            platform: self.platform.clone(),
        }
    }

    fn append_entry(
        &mut self,
        origin: LogOrigin,
        level: LogLevel,
        source: String,
        action: String,
        message: String,
        context: Value,
    ) -> Result<(), String> {
        self.entry_count += 1;

        let entry = LogEntry {
            timestamp: Utc::now(),
            sequence: self.entry_count,
            level,
            origin,
            source,
            action,
            message: sanitize_string_value(&message),
            context: normalize_context(context),
        };

        let line = serde_json::to_string(&entry).map_err(|error| error.to_string())?;
        self.session_file
            .write_all(line.as_bytes())
            .and_then(|_| self.session_file.write_all(b"\n"))
            .and_then(|_| self.session_file.flush())
            .map_err(|error| error.to_string())
    }

    fn read_entries(&self) -> Result<Vec<LogEntry>, String> {
        let file = File::open(&self.session_file_path).map_err(|error| error.to_string())?;
        let reader = BufReader::new(file);
        let mut entries = Vec::new();

        for line in reader.lines() {
            let line = line.map_err(|error| error.to_string())?;
            if line.trim().is_empty() {
                continue;
            }

            if let Ok(entry) = serde_json::from_str::<LogEntry>(&line) {
                entries.push(entry);
            }
        }

        Ok(entries)
    }

    fn export_logs(&mut self) -> Result<String, String> {
        let export_path = self.log_directory.join(format!(
            "export_{}_{}.json",
            Local::now().format("%Y-%m-%d_%H-%M-%S"),
            short_uuid()
        ));

        self.append_entry(
            LogOrigin::Backend,
            LogLevel::Info,
            "commands::logs".to_string(),
            "export_logs".to_string(),
            "Exporting application logs to JSON.".to_string(),
            json!({
                "exportPath": export_path.to_string_lossy().to_string(),
                "sessionFilePath": self.session_file_path.to_string_lossy().to_string(),
            }),
        )?;

        let entries = self.read_entries()?;
        let bundle = ExportBundle {
            exported_at: Utc::now(),
            app: ExportAppMetadata {
                name: self.app_name.clone(),
                version: self.app_version.clone(),
                build_profile: self.build_profile.clone(),
                platform: self.platform.clone(),
            },
            session: ExportSessionMetadata {
                id: self.session_id.clone(),
                started_at: self.session_started_at,
                entry_count: self.entry_count,
                session_file_path: REDACTED_PATH_VALUE.to_string(),
                log_directory: REDACTED_PATH_VALUE.to_string(),
            },
            entries,
        };

        let content = serde_json::to_string_pretty(&bundle).map_err(|error| error.to_string())?;
        fs::write(&export_path, content).map_err(|error| error.to_string())?;
        self.last_export_path = Some(export_path.clone());

        cleanup_log_files(
            &self.log_directory,
            "export_",
            "json",
            MAX_EXPORT_FILES,
            Some(&export_path),
        );

        Ok(export_path.to_string_lossy().to_string())
    }
}