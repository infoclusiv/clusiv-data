use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::time::Instant;

use serde_json::{json, Map, Value};
use tauri::{command, State};
use uuid::Uuid;

use crate::logging::{AppLoggerState, LogLevel};
use crate::models::{
    AppData, Category, Item, ItemImage, ItemType, Link, QuickText, GENERAL_CATEGORY_ID,
    GENERAL_CATEGORY_NAME, SCHEMA_VERSION,
};

const CATEGORIES_KEY: &str = "__SYSTEM_CATEGORIES__";
const QUICK_TEXTS_KEY: &str = "__SYSTEM_QUICK_TEXTS__";
const SCHEMA_VERSION_KEY: &str = "__SCHEMA_VERSION__";
const TASKS_KEY: &str = "__SYSTEM_TASKS__";

fn workspace_root() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("..")
}

fn executable_dir() -> PathBuf {
    std::env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(|parent| parent.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."))
}

fn get_data_path() -> PathBuf {
    let workspace_path = workspace_root().join("data.json");
    if cfg!(debug_assertions) && workspace_path.exists() {
        return workspace_path;
    }
    executable_dir().join("data.json")
}

fn count_links(data: &AppData) -> usize {
    data.categories
        .values()
        .map(|category| category.links.len())
        .sum()
}

fn count_quick_texts(data: &AppData) -> usize {
    data.quick_texts.len()
}

#[command]
pub fn load_data(logger: State<'_, AppLoggerState>) -> Result<AppData, String> {
    let started_at = Instant::now();
    let path = get_data_path();
    let path_label = path.to_string_lossy().to_string();

    logger.log_backend(
        LogLevel::Info,
        "commands::data",
        "load_data_started",
        "Loading application data from disk.",
        json!({
            "path": path_label,
            "exists": path.exists(),
        }),
    );

    if !path.exists() {
        let data = AppData::default_data();
        logger.log_backend(
            LogLevel::Warn,
            "commands::data",
            "load_data_missing_file",
            "Data file not found, using default dataset.",
            json!({
                "path": path.to_string_lossy().to_string(),
                "durationMs": started_at.elapsed().as_millis(),
                "categoryCount": data.categories.len(),
                "taskCount": data.tasks.len(),
                "linkCount": count_links(&data),
                "quickTextCount": count_quick_texts(&data),
            }),
        );
        return Ok(data);
    }

    let content = match std::fs::read_to_string(&path) {
        Ok(content) => content,
        Err(error) => {
            logger.log_backend(
                LogLevel::Error,
                "commands::data",
                "load_data_read_failed",
                "Failed to read application data from disk.",
                json!({
                    "path": path.to_string_lossy().to_string(),
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            return Err(error.to_string());
        }
    };

    let raw_data: Value = match serde_json::from_str(&content) {
        Ok(value) => value,
        Err(error) => {
            let data = AppData::default_data();
            logger.log_backend(
                LogLevel::Warn,
                "commands::data",
                "load_data_parse_failed",
                "Data file is not valid JSON, using default dataset.",
                json!({
                    "path": path.to_string_lossy().to_string(),
                    "error": error.to_string(),
                    "bytes": content.len(),
                    "durationMs": started_at.elapsed().as_millis(),
                    "categoryCount": data.categories.len(),
                    "taskCount": data.tasks.len(),
                    "linkCount": count_links(&data),
                    "quickTextCount": count_quick_texts(&data),
                }),
            );
            return Ok(data);
        }
    };

    let (data, changed) = normalize_data(raw_data);
    if changed {
        match serde_json::to_string_pretty(&data) {
            Ok(content) => {
                if let Err(error) = std::fs::write(&path, content) {
                    logger.log_backend(
                        LogLevel::Warn,
                        "commands::data",
                        "load_data_normalized_save_failed",
                        "Normalized data could not be written back to disk.",
                        json!({
                            "path": path.to_string_lossy().to_string(),
                            "error": error.to_string(),
                        }),
                    );
                }
            }
            Err(error) => logger.log_backend(
                LogLevel::Warn,
                "commands::data",
                "load_data_normalized_serialize_failed",
                "Normalized data could not be serialized for persistence.",
                json!({
                    "path": path.to_string_lossy().to_string(),
                    "error": error.to_string(),
                }),
            ),
        }
    }

    logger.log_backend(
        LogLevel::Info,
        "commands::data",
        "load_data_completed",
        "Application data loaded successfully.",
        json!({
            "path": path.to_string_lossy().to_string(),
            "normalized": changed,
            "durationMs": started_at.elapsed().as_millis(),
            "categoryCount": data.categories.len(),
            "taskCount": data.tasks.len(),
            "linkCount": count_links(&data),
            "quickTextCount": count_quick_texts(&data),
        }),
    );

    Ok(data)
}

#[command]
pub fn save_data(data: AppData, logger: State<'_, AppLoggerState>) -> Result<(), String> {
    let started_at = Instant::now();
    let path = get_data_path();
    let path_label = path.to_string_lossy().to_string();

    logger.log_backend(
        LogLevel::Info,
        "commands::data",
        "save_data_started",
        "Persisting application data to disk.",
        json!({
            "path": path_label,
            "categoryCount": data.categories.len(),
            "taskCount": data.tasks.len(),
            "linkCount": count_links(&data),
            "quickTextCount": count_quick_texts(&data),
        }),
    );

    let content = match serde_json::to_string_pretty(&data) {
        Ok(content) => content,
        Err(error) => {
            logger.log_backend(
                LogLevel::Error,
                "commands::data",
                "save_data_serialize_failed",
                "Failed to serialize application data.",
                json!({
                    "path": path.to_string_lossy().to_string(),
                    "error": error.to_string(),
                    "durationMs": started_at.elapsed().as_millis(),
                }),
            );
            return Err(error.to_string());
        }
    };

    if let Err(error) = std::fs::write(&path, &content) {
        logger.log_backend(
            LogLevel::Error,
            "commands::data",
            "save_data_write_failed",
            "Failed to write application data to disk.",
            json!({
                "path": path.to_string_lossy().to_string(),
                "error": error.to_string(),
                "bytes": content.len(),
                "durationMs": started_at.elapsed().as_millis(),
            }),
        );
        return Err(error.to_string());
    }

    logger.log_backend(
        LogLevel::Info,
        "commands::data",
        "save_data_completed",
        "Application data persisted successfully.",
        json!({
            "path": path.to_string_lossy().to_string(),
            "bytes": content.len(),
            "durationMs": started_at.elapsed().as_millis(),
            "categoryCount": data.categories.len(),
            "taskCount": data.tasks.len(),
            "linkCount": count_links(&data),
            "quickTextCount": count_quick_texts(&data),
        }),
    );

    Ok(())
}

fn normalize_data(raw: Value) -> (AppData, bool) {
    let Value::Object(mut root) = raw else {
        return (AppData::default_data(), true);
    };

    if !root.contains_key(CATEGORIES_KEY) || !root.contains_key(SCHEMA_VERSION_KEY) {
        return (migrate_legacy_data(Value::Object(root)), true);
    }

    let mut changed = false;
    let original_schema = root.get(SCHEMA_VERSION_KEY).and_then(Value::as_u64);

    let categories_value = root
        .remove(CATEGORIES_KEY)
        .unwrap_or_else(|| Value::Object(Map::new()));
    let quick_texts_value = match root.remove(QUICK_TEXTS_KEY) {
        Some(value) => value,
        None => {
            changed = true;
            Value::Array(Vec::new())
        }
    };
    let tasks_value = root
        .remove(TASKS_KEY)
        .unwrap_or_else(|| Value::Array(Vec::new()));

    let mut categories = parse_categories(categories_value, &mut changed);
    let quick_texts = parse_quick_texts(quick_texts_value, &mut changed);

    if !categories.contains_key(GENERAL_CATEGORY_ID) {
        categories.insert(
            GENERAL_CATEGORY_ID.to_string(),
            build_category(
                GENERAL_CATEGORY_ID.to_string(),
                GENERAL_CATEGORY_NAME.to_string(),
                None,
                "Carpeta".to_string(),
                Vec::new(),
                String::new(),
            ),
        );
        changed = true;
    }

    if let Some(general_category) = categories.get_mut(GENERAL_CATEGORY_ID) {
        general_category.id = GENERAL_CATEGORY_ID.to_string();
        general_category.name = GENERAL_CATEGORY_NAME.to_string();
        general_category.parent_id = None;
    }

    let valid_category_ids: HashSet<String> = categories.keys().cloned().collect();

    for (category_id, category) in &mut categories {
        if category_id == GENERAL_CATEGORY_ID {
            category.parent_id = None;
            continue;
        }

        let parent_is_valid = category.parent_id.is_none()
            || category
                .parent_id
                .as_ref()
                .is_some_and(|parent_id| valid_category_ids.contains(parent_id));

        if !parent_is_valid {
            category.parent_id = Some(GENERAL_CATEGORY_ID.to_string());
            changed = true;
        }
    }

    let mut tasks = parse_items(tasks_value, &mut changed);
    for item in &mut tasks {
        if !valid_category_ids.contains(&item.category_id) {
            item.category_id = GENERAL_CATEGORY_ID.to_string();
            changed = true;
        }
    }

    if original_schema != Some(SCHEMA_VERSION as u64) {
        changed = true;
    }

    (
        AppData {
            schema_version: SCHEMA_VERSION,
            categories,
            tasks,
            quick_texts,
        },
        changed,
    )
}

fn migrate_legacy_data(raw: Value) -> AppData {
    let Value::Object(mut root) = raw else {
        return AppData::default_data();
    };

    let tasks_value = root
        .remove(TASKS_KEY)
        .unwrap_or_else(|| Value::Array(Vec::new()));

    let mut new_data = AppData::default_data();
    let mut legacy_name_to_id: HashMap<String, String> = HashMap::from([(
        GENERAL_CATEGORY_NAME.to_string(),
        GENERAL_CATEGORY_ID.to_string(),
    )]);

    let mut legacy_general_payload: Option<Map<String, Value>> = None;
    let mut legacy_categories: Vec<(String, Map<String, Value>)> = Vec::new();

    for (key, value) in root {
        if key.starts_with("__") {
            continue;
        }

        let Value::Object(payload) = value else {
            continue;
        };

        if key.trim().eq_ignore_ascii_case(GENERAL_CATEGORY_NAME) {
            legacy_general_payload = Some(payload);
        } else {
            legacy_categories.push((key, payload));
        }
    }

    if let Some(payload) = legacy_general_payload {
        if let Some(general_category) = new_data.categories.get_mut(GENERAL_CATEGORY_ID) {
            general_category.icon = string_from_map(&payload, "icon", "Carpeta");
            general_category.links = links_from_map(&payload, "links");
            general_category.notes = string_from_map(&payload, "notes", "");
        }
    }

    for (legacy_name, payload) in legacy_categories {
        let existing_ids: HashSet<String> = new_data.categories.keys().cloned().collect();
        let category_id = generate_unique_category_id(&existing_ids);

        new_data.categories.insert(
            category_id.clone(),
            build_category(
                category_id.clone(),
                legacy_name.clone(),
                Some(GENERAL_CATEGORY_ID.to_string()),
                string_from_map(&payload, "icon", "Carpeta"),
                links_from_map(&payload, "links"),
                string_from_map(&payload, "notes", ""),
            ),
        );

        legacy_name_to_id.insert(legacy_name, category_id);
    }

    let legacy_tasks = root_tasks(
        tasks_value,
        &mut new_data.categories,
        &mut legacy_name_to_id,
    );
    new_data.tasks = legacy_tasks;
    new_data
}

fn root_tasks(
    tasks_value: Value,
    categories: &mut HashMap<String, Category>,
    legacy_name_to_id: &mut HashMap<String, String>,
) -> Vec<Item> {
    let Value::Array(items) = tasks_value else {
        return Vec::new();
    };

    let mut migrated_tasks = Vec::new();

    for value in items {
        let Value::Object(mut item_map) = value else {
            continue;
        };

        let legacy_category_name = item_map
            .remove("category")
            .and_then(|value| value.as_str().map(str::to_string));

        if let Some(category_name) = &legacy_category_name {
            if !legacy_name_to_id.contains_key(category_name) {
                let existing_ids: HashSet<String> = categories.keys().cloned().collect();
                let category_id = generate_unique_category_id(&existing_ids);
                categories.insert(
                    category_id.clone(),
                    build_category(
                        category_id.clone(),
                        category_name.clone(),
                        Some(GENERAL_CATEGORY_ID.to_string()),
                        "Carpeta".to_string(),
                        Vec::new(),
                        String::new(),
                    ),
                );
                legacy_name_to_id.insert(category_name.clone(), category_id);
            }
        }

        let mut changed = false;
        let mut item = item_from_value(Value::Object(item_map), &mut changed);
        item.category_id = legacy_category_name
            .as_ref()
            .and_then(|name| legacy_name_to_id.get(name).cloned())
            .unwrap_or_else(|| GENERAL_CATEGORY_ID.to_string());
        migrated_tasks.push(item);
    }

    migrated_tasks
}

fn parse_categories(value: Value, changed: &mut bool) -> HashMap<String, Category> {
    let Value::Object(entries) = value else {
        *changed = true;
        return HashMap::new();
    };

    entries
        .into_iter()
        .map(|(category_id, category_value)| {
            let category = category_from_value(category_id.clone(), category_value, changed);
            (category_id, category)
        })
        .collect()
}

fn parse_items(value: Value, changed: &mut bool) -> Vec<Item> {
    let Value::Array(items) = value else {
        *changed = true;
        return Vec::new();
    };

    items
        .into_iter()
        .map(|item| item_from_value(item, changed))
        .collect()
}

fn parse_quick_texts(value: Value, changed: &mut bool) -> Vec<QuickText> {
    let Value::Array(entries) = value else {
        *changed = true;
        return Vec::new();
    };

    entries
        .into_iter()
        .map(|entry| quick_text_from_value(entry, changed))
        .collect()
}

fn category_from_value(category_id: String, value: Value, changed: &mut bool) -> Category {
    let Value::Object(mut map) = value else {
        *changed = true;
        return build_category(
            category_id.clone(),
            if category_id == GENERAL_CATEGORY_ID {
                GENERAL_CATEGORY_NAME.to_string()
            } else {
                "Sin nombre".to_string()
            },
            None,
            "Carpeta".to_string(),
            Vec::new(),
            String::new(),
        );
    };

    let id = match map.remove("id") {
        Some(Value::String(value)) => value,
        Some(_) => {
            *changed = true;
            category_id.clone()
        }
        None => category_id.clone(),
    };
    let name = match map.remove("name") {
        Some(Value::String(value)) => value,
        Some(_) => {
            *changed = true;
            default_category_name(&category_id)
        }
        None => default_category_name(&category_id),
    };
    let parent_id = optional_string_value(map.remove("parent_id"), changed);
    let icon = string_value(map.remove("icon"), "Carpeta", changed);
    if map.remove("type").is_some() {
        *changed = true;
    }
    let links = links_value(map.remove("links"), changed);
    let notes = string_value(map.remove("notes"), "", changed);

    build_category(id, name, parent_id, icon, links, notes)
}

fn item_from_value(value: Value, changed: &mut bool) -> Item {
    let Value::Object(mut map) = value else {
        *changed = true;
        return Item {
            title: String::new(),
            comment: String::new(),
            images: Vec::new(),
            item_type: ItemType::Task,
            done: false,
            category_id: GENERAL_CATEGORY_ID.to_string(),
        };
    };

    let title = string_value(map.remove("title"), "", changed);
    let comment = string_value(map.remove("comment"), "", changed);
    let images = item_images_value(map.remove("images"), changed);
    let item_type = item_type_value(map.remove("type"), changed);
    let done = bool_value(map.remove("done"), false, changed);
    let category_id = string_value(map.remove("category_id"), GENERAL_CATEGORY_ID, changed);

    Item {
        title,
        comment,
        images,
        item_type,
        done,
        category_id,
    }
}

fn build_category(
    id: String,
    name: String,
    parent_id: Option<String>,
    icon: String,
    links: Vec<Link>,
    notes: String,
) -> Category {
    Category {
        id,
        name,
        parent_id,
        icon,
        links,
        notes,
    }
}

fn default_category_name(category_id: &str) -> String {
    if category_id == GENERAL_CATEGORY_ID {
        GENERAL_CATEGORY_NAME.to_string()
    } else {
        "Sin nombre".to_string()
    }
}

fn string_value(value: Option<Value>, default: &str, changed: &mut bool) -> String {
    match value {
        Some(Value::String(value)) => value,
        Some(_) => {
            *changed = true;
            default.to_string()
        }
        None => default.to_string(),
    }
}

fn optional_string_value(value: Option<Value>, changed: &mut bool) -> Option<String> {
    match value {
        Some(Value::String(value)) => Some(value),
        Some(Value::Null) | None => None,
        Some(_) => {
            *changed = true;
            None
        }
    }
}

fn bool_value(value: Option<Value>, default: bool, changed: &mut bool) -> bool {
    match value {
        Some(Value::Bool(value)) => value,
        Some(_) => {
            *changed = true;
            default
        }
        None => default,
    }
}

fn item_type_value(value: Option<Value>, changed: &mut bool) -> ItemType {
    match value {
        Some(Value::String(value)) if value == "note" => ItemType::Note,
        Some(Value::String(value)) if value == "task" => ItemType::Task,
        Some(Value::String(_)) => {
            *changed = true;
            ItemType::Task
        }
        Some(_) => {
            *changed = true;
            ItemType::Task
        }
        None => ItemType::Task,
    }
}

fn links_value(value: Option<Value>, changed: &mut bool) -> Vec<Link> {
    match value {
        Some(Value::Array(values)) => values.into_iter().map(|value| link_from_value(value, changed)).collect(),
        Some(_) => {
            *changed = true;
            Vec::new()
        }
        None => Vec::new(),
    }
}

fn item_images_value(value: Option<Value>, changed: &mut bool) -> Vec<ItemImage> {
    match value {
        Some(Value::Array(values)) => values
            .into_iter()
            .map(|value| item_image_from_value(value, changed))
            .collect(),
        Some(_) => {
            *changed = true;
            Vec::new()
        }
        None => Vec::new(),
    }
}

fn link_from_value(value: Value, changed: &mut bool) -> Link {
    let Value::Object(mut map) = value else {
        *changed = true;
        return Link {
            title: String::new(),
            url: String::new(),
        };
    };

    Link {
        title: string_value(map.remove("title"), "", changed),
        url: string_value(map.remove("url"), "", changed),
    }
}

fn item_image_from_value(value: Value, changed: &mut bool) -> ItemImage {
    let Value::Object(mut map) = value else {
        *changed = true;
        return ItemImage {
            id: Uuid::new_v4().to_string(),
            data_url: String::new(),
            name: "Imagen".to_string(),
        };
    };

    let id = string_value(map.remove("id"), "", changed);

    ItemImage {
        id: if id.is_empty() {
            *changed = true;
            Uuid::new_v4().to_string()
        } else {
            id
        },
        data_url: string_value(map.remove("data_url"), "", changed),
        name: string_value(map.remove("name"), "Imagen", changed),
    }
}

fn quick_text_from_value(value: Value, changed: &mut bool) -> QuickText {
    let Value::Object(mut map) = value else {
        *changed = true;
        return QuickText {
            id: Uuid::new_v4().to_string(),
            title: String::new(),
            content: String::new(),
        };
    };

    let id = string_value(map.remove("id"), "", changed);

    QuickText {
        id: if id.is_empty() {
            *changed = true;
            Uuid::new_v4().to_string()
        } else {
            id
        },
        title: string_value(map.remove("title"), "", changed),
        content: string_value(map.remove("content"), "", changed),
    }
}

fn string_from_map(map: &Map<String, Value>, key: &str, default: &str) -> String {
    map.get(key)
        .and_then(Value::as_str)
        .unwrap_or(default)
        .to_string()
}

fn links_from_map(map: &Map<String, Value>, key: &str) -> Vec<Link> {
    map.get(key)
        .and_then(Value::as_array)
        .map(|values| {
            values
                .iter()
                .filter_map(|value| {
                    let entry = value.as_object()?;
                    Some(Link {
                        title: entry
                            .get("title")
                            .and_then(Value::as_str)
                            .unwrap_or_default()
                            .to_string(),
                        url: entry
                            .get("url")
                            .and_then(Value::as_str)
                            .unwrap_or_default()
                            .to_string(),
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

pub fn generate_unique_category_id(existing_ids: &HashSet<String>) -> String {
    loop {
        let id = format!("cat_{}", &Uuid::new_v4().simple().to_string()[..10]);
        if !existing_ids.contains(&id) {
            return id;
        }
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn normalize_data_moves_invalid_parent_and_task_to_general() {
        let raw = json!({
            "__SCHEMA_VERSION__": 1,
            "__SYSTEM_CATEGORIES__": {
                "alpha": {
                    "id": "alpha",
                    "name": "Alpha",
                    "parent_id": null,
                    "icon": "Carpeta",
                    "type": "niche",
                    "links": [],
                    "notes": ""
                }
            },
            "__SYSTEM_TASKS__": [
                {
                    "title": "Task",
                    "comment": "",
                    "type": "task",
                    "done": false,
                    "category_id": "missing"
                }
            ]
        });

        let (data, changed) = normalize_data(raw);

        assert!(changed);
        assert!(data.categories.contains_key(GENERAL_CATEGORY_ID));
        assert_eq!(
            data.categories.get("alpha").and_then(|category| category.parent_id.as_deref()),
            None
        );
        assert_eq!(data.tasks[0].category_id, GENERAL_CATEGORY_ID);
        assert!(data.tasks[0].images.is_empty());
        assert!(data.quick_texts.is_empty());
        assert_eq!(data.schema_version, SCHEMA_VERSION);
    }

    #[test]
    fn normalize_data_preserves_images_and_defaults_missing_image_arrays() {
        let raw = json!({
            "__SCHEMA_VERSION__": SCHEMA_VERSION,
            "__SYSTEM_CATEGORIES__": {
                "general": {
                    "id": "general",
                    "name": "General",
                    "parent_id": null,
                    "icon": "Carpeta",
                    "links": [],
                    "notes": ""
                }
            },
            "__SYSTEM_TASKS__": [
                {
                    "title": "",
                    "comment": "Primera línea\nSegunda línea",
                    "images": [
                        {
                            "id": "img_1",
                            "data_url": "data:image/png;base64,abc",
                            "name": "captura.png"
                        }
                    ],
                    "type": "note",
                    "done": false,
                    "category_id": "general"
                },
                {
                    "title": "Tarea",
                    "comment": "",
                    "type": "task",
                    "done": false,
                    "category_id": "general"
                }
            ],
            "__SYSTEM_QUICK_TEXTS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(!changed);
        assert_eq!(data.tasks[0].images.len(), 1);
        assert_eq!(data.tasks[0].images[0].name, "captura.png");
        assert!(data.tasks[1].images.is_empty());
        assert!(data.quick_texts.is_empty());
    }

    #[test]
    fn normalize_data_preserves_quick_texts() {
        let raw = json!({
            "__SCHEMA_VERSION__": SCHEMA_VERSION,
            "__SYSTEM_CATEGORIES__": {
                "general": {
                    "id": "general",
                    "name": "General",
                    "parent_id": null,
                    "icon": "Carpeta",
                    "links": [],
                    "notes": ""
                }
            },
            "__SYSTEM_TASKS__": [],
            "__SYSTEM_QUICK_TEXTS__": [
                {
                    "id": "qt_1",
                    "title": "Firma",
                    "content": "Hola,\nCarlos"
                }
            ]
        });

        let (data, changed) = normalize_data(raw);

        assert!(!changed);
        assert_eq!(data.quick_texts.len(), 1);
        assert_eq!(data.quick_texts[0].id, "qt_1");
        assert_eq!(data.quick_texts[0].title, "Firma");
        assert_eq!(data.quick_texts[0].content, "Hola,\nCarlos");
    }

    #[test]
    fn migrate_legacy_data_creates_categories_and_maps_tasks() {
        let raw = json!({
            "General": {
                "icon": "Trabajo",
                "type": "niche",
                "links": [],
                "notes": "nota general"
            },
            "Ideas": {
                "icon": "Ideas",
                "type": "notebook",
                "links": [],
                "notes": ""
            },
            "__SYSTEM_TASKS__": [
                {
                    "title": "Pendiente",
                    "comment": "",
                    "type": "task",
                    "done": false,
                    "category": "Ideas"
                },
                {
                    "title": "Sin categoria",
                    "comment": "",
                    "type": "note",
                    "done": false,
                    "category": "Nueva"
                }
            ]
        });

        let data = migrate_legacy_data(raw);

        assert_eq!(data.schema_version, SCHEMA_VERSION);
        assert_eq!(data.categories.get(GENERAL_CATEGORY_ID).map(|category| category.icon.as_str()), Some("Trabajo"));
        assert!(data.categories.values().any(|category| category.name == "Ideas"));
        assert!(data.categories.values().any(|category| category.name == "Nueva"));
        assert_eq!(data.tasks.len(), 2);
        assert_ne!(data.tasks[0].category_id, GENERAL_CATEGORY_ID);
        assert_ne!(data.tasks[1].category_id, GENERAL_CATEGORY_ID);
    }
}