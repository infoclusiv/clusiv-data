use std::collections::{HashMap, HashSet};
use std::path::PathBuf;
use std::time::Instant;

use chrono::Utc;
use serde_json::{json, Map, Value};
use tauri::{command, State};
use uuid::Uuid;

use crate::logging::{AppLoggerState, LogLevel};
use crate::models::{
    AppData, Category, Flow, FlowEdge, FlowNode, FlowPosition, Item, ItemImage, ItemType, Link,
    QuickText, QuickTextGroup, GENERAL_CATEGORY_ID, GENERAL_CATEGORY_NAME, SCHEMA_VERSION,
};

const CATEGORIES_KEY: &str = "__SYSTEM_CATEGORIES__";
const FLOWS_KEY: &str = "__SYSTEM_FLOWS__";
const GLOBAL_FLOW_LINKED_NOTE_IDS_KEY: &str = "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__";
const QUICK_TEXTS_KEY: &str = "__SYSTEM_QUICK_TEXTS__";
const QUICK_TEXT_GROUPS_KEY: &str = "__SYSTEM_QUICK_TEXT_GROUPS__";
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

fn count_flows(data: &AppData) -> usize {
    data.flows.len()
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
                "flowCount": count_flows(&data),
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
                    "flowCount": count_flows(&data),
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
            "flowCount": count_flows(&data),
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
            "flowCount": count_flows(&data),
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
            "flowCount": count_flows(&data),
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
    let quick_text_groups_value = match root.remove(QUICK_TEXT_GROUPS_KEY) {
        Some(value) => value,
        None => {
            changed = true;
            Value::Array(Vec::new())
        }
    };
    let flows_value = match root.remove(FLOWS_KEY) {
        Some(value) => value,
        None => {
            changed = true;
            Value::Array(Vec::new())
        }
    };
    let global_flow_linked_note_ids_value = match root.remove(GLOBAL_FLOW_LINKED_NOTE_IDS_KEY) {
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
    let mut flows = parse_flows(flows_value, &mut changed);
    let quick_text_groups = parse_quick_text_groups(quick_text_groups_value, &mut changed);
    let mut quick_texts = parse_quick_texts(quick_texts_value, &mut changed);

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

    let valid_note_ids: HashSet<String> = tasks
        .iter()
        .filter(|item| matches!(item.item_type, ItemType::Note))
        .map(|item| item.id.clone())
        .collect();
    let valid_quick_text_group_ids: HashSet<String> = quick_text_groups
        .iter()
        .map(|group| group.id.clone())
        .collect();

    for quick_text in &mut quick_texts {
        let original_len = quick_text.group_ids.len();
        quick_text
            .group_ids
            .retain(|group_id| valid_quick_text_group_ids.contains(group_id));
        if quick_text.group_ids.len() != original_len {
            changed = true;
        }

        sync_legacy_quick_text_group_id(quick_text, &mut changed);
        let normalized_group_sort_orders = normalize_quick_text_group_sort_orders(
            Some(Value::Object(
                quick_text
                    .group_sort_orders
                    .iter()
                    .map(|(group_id, sort_order)| {
                        (group_id.clone(), Value::Number((*sort_order).into()))
                    })
                    .collect(),
            )),
            &quick_text.group_ids,
            quick_text.sort_order,
            &mut changed,
        );

        if quick_text.group_sort_orders != normalized_group_sort_orders {
            quick_text.group_sort_orders = normalized_group_sort_orders;
            changed = true;
        }
    }

    for flow in &mut flows {
        if !valid_category_ids.contains(&flow.category_id) {
            flow.category_id = GENERAL_CATEGORY_ID.to_string();
            changed = true;
        }

        for node in &mut flow.nodes {
            node.linked_note_ids = filter_known_note_ids(
                dedupe_string_values(std::mem::take(&mut node.linked_note_ids), &mut changed),
                &valid_note_ids,
                &mut changed,
            );
        }
    }

    let global_flow_linked_note_ids = filter_known_note_ids(
        dedupe_string_values(
            string_array_value(Some(global_flow_linked_note_ids_value), &mut changed),
            &mut changed,
        ),
        &valid_note_ids,
        &mut changed,
    );

    if original_schema != Some(SCHEMA_VERSION as u64) {
        changed = true;
    }

    (
        AppData {
            schema_version: SCHEMA_VERSION,
            categories,
            tasks,
            quick_texts,
            quick_text_groups,
            flows,
            global_flow_linked_note_ids,
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
        .enumerate()
        .map(|(index, entry)| quick_text_from_value(entry, index as i32 + 1, changed))
        .collect()
}

fn parse_quick_text_groups(value: Value, changed: &mut bool) -> Vec<QuickTextGroup> {
    let Value::Array(entries) = value else {
        *changed = true;
        return Vec::new();
    };

    let mut groups: Vec<QuickTextGroup> = entries
        .into_iter()
        .enumerate()
        .map(|(index, entry)| quick_text_group_from_value(entry, index as i32 + 1, changed))
        .collect();

    groups.sort_by_key(|group| group.sort_order);
    groups
}

fn parse_flows(value: Value, changed: &mut bool) -> Vec<Flow> {
    let Value::Array(entries) = value else {
        *changed = true;
        return Vec::new();
    };

    entries
        .into_iter()
        .map(|entry| flow_from_value(entry, changed))
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
            id: Uuid::new_v4().to_string(),
            title: String::new(),
            comment: String::new(),
            images: Vec::new(),
            item_type: ItemType::Task,
            done: false,
            category_id: GENERAL_CATEGORY_ID.to_string(),
        };
    };

    let id = string_value(map.remove("id"), "", changed);
    let title = string_value(map.remove("title"), "", changed);
    let comment = string_value(map.remove("comment"), "", changed);
    let images = item_images_value(map.remove("images"), changed);
    let item_type = item_type_value(map.remove("type"), changed);
    let done = bool_value(map.remove("done"), false, changed);
    let category_id = string_value(map.remove("category_id"), GENERAL_CATEGORY_ID, changed);

    Item {
        id: if id.is_empty() {
            *changed = true;
            Uuid::new_v4().to_string()
        } else {
            id
        },
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

fn i32_value(value: Option<Value>, default: i32, changed: &mut bool) -> i32 {
    match value {
        Some(Value::Number(number)) => match number.as_i64() {
            Some(value) => match i32::try_from(value) {
                Ok(value) => value,
                Err(_) => {
                    *changed = true;
                    default
                }
            },
            None => {
                *changed = true;
                default
            }
        },
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

fn string_array_value(value: Option<Value>, changed: &mut bool) -> Vec<String> {
    match value {
        Some(Value::Array(values)) => values
            .into_iter()
            .filter_map(|value| match value {
                Value::String(value) if !value.is_empty() => Some(value),
                Value::String(_) => {
                    *changed = true;
                    None
                }
                _ => {
                    *changed = true;
                    None
                }
            })
            .collect(),
        Some(_) => {
            *changed = true;
            Vec::new()
        }
        None => Vec::new(),
    }
}

fn dedupe_string_values(values: Vec<String>, changed: &mut bool) -> Vec<String> {
    let mut seen = HashSet::new();
    let mut deduped = Vec::new();

    for value in values {
        if seen.insert(value.clone()) {
            deduped.push(value);
        } else {
            *changed = true;
        }
    }

    deduped
}

fn normalize_quick_text_group_ids(
    group_ids_value: Option<Value>,
    legacy_group_id: Option<String>,
    changed: &mut bool,
) -> Vec<String> {
    let mut group_ids = Vec::new();

    match group_ids_value {
        Some(Value::Array(values)) => {
            for value in values {
                match value {
                    Value::String(entry) => {
                        let trimmed_entry = entry.trim();
                        if trimmed_entry.is_empty() {
                            *changed = true;
                            continue;
                        }

                        group_ids.push(trimmed_entry.to_string());
                    }
                    _ => *changed = true,
                }
            }
        }
        Some(_) => *changed = true,
        None => {}
    }

    if let Some(group_id) = legacy_group_id {
        let trimmed_group_id = group_id.trim();
        if trimmed_group_id.is_empty() {
            *changed = true;
        } else {
            group_ids.push(trimmed_group_id.to_string());
        }
    }

    dedupe_string_values(group_ids, changed)
}

fn sync_legacy_quick_text_group_id(quick_text: &mut QuickText, changed: &mut bool) {
    let next_group_id = quick_text.group_ids.first().cloned();
    if quick_text.group_id != next_group_id {
        quick_text.group_id = next_group_id;
        *changed = true;
    }
}

fn normalize_quick_text_group_sort_orders(
    group_sort_orders_value: Option<Value>,
    group_ids: &[String],
    fallback_sort_order: i32,
    changed: &mut bool,
) -> HashMap<String, i32> {
    let mut parsed_group_sort_orders = HashMap::new();

    match group_sort_orders_value {
        Some(Value::Object(entries)) => {
            for (group_id, value) in entries {
                if !group_ids.contains(&group_id) {
                    *changed = true;
                    continue;
                }

                if parsed_group_sort_orders.contains_key(&group_id) {
                    *changed = true;
                    continue;
                }

                match value {
                    Value::Number(number) => {
                        if let Some(sort_order) = number.as_i64() {
                            parsed_group_sort_orders.insert(group_id, sort_order as i32);
                        } else if let Some(sort_order) = number.as_f64() {
                            if sort_order.is_finite() {
                                parsed_group_sort_orders.insert(group_id, sort_order.round() as i32);
                                *changed = true;
                            } else {
                                *changed = true;
                            }
                        } else {
                            *changed = true;
                        }
                    }
                    _ => *changed = true,
                }
            }
        }
        Some(_) => *changed = true,
        None => {}
    }

    let mut normalized_group_sort_orders = HashMap::new();
    for group_id in group_ids {
        let sort_order = parsed_group_sort_orders
            .remove(group_id)
            .unwrap_or_else(|| {
                *changed = true;
                fallback_sort_order
            });
        normalized_group_sort_orders.insert(group_id.clone(), sort_order);
    }

    normalized_group_sort_orders
}

fn filter_known_note_ids(
    mut note_ids: Vec<String>,
    valid_note_ids: &HashSet<String>,
    changed: &mut bool,
) -> Vec<String> {
    let original_len = note_ids.len();
    note_ids.retain(|note_id| valid_note_ids.contains(note_id));
    if note_ids.len() != original_len {
        *changed = true;
    }
    note_ids
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
            images: Vec::new(),
        };
    };

    Link {
        title: string_value(map.remove("title"), "", changed),
        url: string_value(map.remove("url"), "", changed),
        images: item_images_value(map.remove("images"), changed),
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

fn quick_text_from_value(value: Value, fallback_index: i32, changed: &mut bool) -> QuickText {
    let Value::Object(mut map) = value else {
        *changed = true;
        return QuickText {
            id: Uuid::new_v4().to_string(),
            title: String::new(),
            content: String::new(),
            group_ids: Vec::new(),
            group_id: None,
            sort_order: fallback_index,
            group_sort_orders: HashMap::new(),
        };
    };

    let id = string_value(map.remove("id"), "", changed);
    let group_id = string_value(map.remove("group_id"), "", changed);
    let mut quick_text = QuickText {
        id: if id.is_empty() {
            *changed = true;
            Uuid::new_v4().to_string()
        } else {
            id
        },
        title: string_value(map.remove("title"), "", changed),
        content: string_value(map.remove("content"), "", changed),
        group_ids: normalize_quick_text_group_ids(
            map.remove("group_ids"),
            if group_id.trim().is_empty() {
                None
            } else {
                Some(group_id)
            },
            changed,
        ),
        group_id: None,
        sort_order: i32_value(map.remove("sort_order"), fallback_index, changed),
        group_sort_orders: HashMap::new(),
    };

    quick_text.group_sort_orders = normalize_quick_text_group_sort_orders(
        map.remove("group_sort_orders"),
        &quick_text.group_ids,
        quick_text.sort_order,
        changed,
    );

    sync_legacy_quick_text_group_id(&mut quick_text, changed);
    quick_text
}

fn quick_text_group_from_value(
    value: Value,
    fallback_index: i32,
    changed: &mut bool,
) -> QuickTextGroup {
    let Value::Object(mut map) = value else {
        *changed = true;
        let now = Utc::now().to_rfc3339();
        return QuickTextGroup {
            id: format!("quick-text-group-{fallback_index}"),
            name: "Sin nombre".to_string(),
            description: String::new(),
            sort_order: fallback_index,
            created_at: now.clone(),
            updated_at: now,
        };
    };

    let id = string_value(map.remove("id"), "", changed);
    let name = string_value(map.remove("name"), "", changed);
    let created_at = string_value(map.remove("created_at"), "", changed);
    let updated_at = string_value(map.remove("updated_at"), "", changed);
    let now = Utc::now().to_rfc3339();

    QuickTextGroup {
        id: if id.trim().is_empty() {
            *changed = true;
            format!("quick-text-group-{fallback_index}")
        } else {
            id
        },
        name: if name.trim().is_empty() {
            *changed = true;
            "Sin nombre".to_string()
        } else {
            name
        },
        description: string_value(map.remove("description"), "", changed),
        sort_order: i32_value(map.remove("sort_order"), fallback_index, changed),
        created_at: if created_at.trim().is_empty() {
            *changed = true;
            now.clone()
        } else {
            created_at
        },
        updated_at: if updated_at.trim().is_empty() {
            *changed = true;
            now
        } else {
            updated_at
        },
    }
}

fn flow_from_value(value: Value, changed: &mut bool) -> Flow {
    let Value::Object(mut map) = value else {
        *changed = true;
        return Flow::default();
    };

    if map.remove("description").is_some() {
        *changed = true;
    }

    if map.remove("status").is_some() {
        *changed = true;
    }

    Flow {
        id: string_value(map.remove("id"), "", changed),
        category_id: string_value(map.remove("category_id"), GENERAL_CATEGORY_ID, changed),
        title: string_value(map.remove("title"), "", changed),
        nodes: flow_nodes_value(map.remove("nodes"), changed),
        edges: flow_edges_value(map.remove("edges"), changed),
        created_at: string_value(map.remove("created_at"), "", changed),
        updated_at: string_value(map.remove("updated_at"), "", changed),
    }
}

fn flow_nodes_value(value: Option<Value>, changed: &mut bool) -> Vec<FlowNode> {
    match value {
        Some(Value::Array(values)) => values
            .into_iter()
            .map(|value| flow_node_from_value(value, changed))
            .collect(),
        Some(_) => {
            *changed = true;
            Vec::new()
        }
        None => Vec::new(),
    }
}

fn flow_edges_value(value: Option<Value>, changed: &mut bool) -> Vec<FlowEdge> {
    match value {
        Some(Value::Array(values)) => values
            .into_iter()
            .map(|value| flow_edge_from_value(value, changed))
            .collect(),
        Some(_) => {
            *changed = true;
            Vec::new()
        }
        None => Vec::new(),
    }
}

fn flow_node_from_value(value: Value, changed: &mut bool) -> FlowNode {
    let Value::Object(mut map) = value else {
        *changed = true;
        return FlowNode::default();
    };

    if map.remove("subtitle").is_some() {
        *changed = true;
    }

    FlowNode {
        id: string_value(map.remove("id"), "", changed),
        r#type: string_value(map.remove("type"), "process", changed),
        title: string_value(map.remove("title"), "", changed),
        description: string_value(map.remove("description"), "", changed),
        linked_note_ids: string_array_value(map.remove("linked_note_ids"), changed),
        position: flow_position_from_value(map.remove("position"), changed),
    }
}

fn flow_edge_from_value(value: Value, changed: &mut bool) -> FlowEdge {
    let Value::Object(mut map) = value else {
        *changed = true;
        return FlowEdge::default();
    };

    FlowEdge {
        id: string_value(map.remove("id"), "", changed),
        source: string_value(map.remove("source"), "", changed),
        target: string_value(map.remove("target"), "", changed),
        label: string_value(map.remove("label"), "", changed),
    }
}

fn flow_position_from_value(value: Option<Value>, changed: &mut bool) -> FlowPosition {
    let Some(value) = value else {
        return FlowPosition::default();
    };

    let Value::Object(mut map) = value else {
        *changed = true;
        return FlowPosition::default();
    };

    FlowPosition {
        x: i32_value(map.remove("x"), 0, changed),
        y: i32_value(map.remove("y"), 0, changed),
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
                        images: Vec::new(),
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
            ],
            "__SYSTEM_FLOWS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(changed);
        assert!(data.categories.contains_key(GENERAL_CATEGORY_ID));
        assert_eq!(
            data.categories.get("alpha").and_then(|category| category.parent_id.as_deref()),
            None
        );
        assert_eq!(data.tasks[0].category_id, GENERAL_CATEGORY_ID);
        assert!(!data.tasks[0].id.is_empty());
        assert!(data.tasks[0].images.is_empty());
        assert!(data.quick_texts.is_empty());
        assert!(data.flows.is_empty());
        assert!(data.global_flow_linked_note_ids.is_empty());
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
                    "id": "note_1",
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
                    "id": "task_1",
                    "title": "Tarea",
                    "comment": "",
                    "type": "task",
                    "done": false,
                    "category_id": "general"
                }
            ],
            "__SYSTEM_QUICK_TEXTS__": [],
            "__SYSTEM_QUICK_TEXT_GROUPS__": [],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(!changed);
        assert_eq!(data.tasks[0].id, "note_1");
        assert_eq!(data.tasks[0].images.len(), 1);
        assert_eq!(data.tasks[0].images[0].name, "captura.png");
        assert!(data.tasks[1].images.is_empty());
        assert!(data.quick_texts.is_empty());
        assert!(data.flows.is_empty());
    }

    #[test]
    fn normalize_data_preserves_link_images() {
        let raw = json!({
            "__SCHEMA_VERSION__": SCHEMA_VERSION,
            "__SYSTEM_CATEGORIES__": {
                "general": {
                    "id": "general",
                    "name": "General",
                    "parent_id": null,
                    "icon": "Carpeta",
                    "links": [
                        {
                            "title": "Example",
                            "url": "https://example.com",
                            "images": [
                                {
                                    "id": "img_test",
                                    "data_url": "data:image/png;base64,abc",
                                    "name": "test.png"
                                }
                            ]
                        }
                    ],
                    "notes": ""
                }
            },
            "__SYSTEM_TASKS__": [],
            "__SYSTEM_QUICK_TEXTS__": [],
            "__SYSTEM_QUICK_TEXT_GROUPS__": [],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(!changed);
        let link = &data.categories["general"].links[0];
        assert_eq!(link.images.len(), 1);
        assert_eq!(link.images[0].data_url, "data:image/png;base64,abc");
        assert_eq!(link.images[0].name, "test.png");
    }

    #[test]
    fn normalize_data_defaults_missing_link_images_to_empty() {
        let raw = json!({
            "__SCHEMA_VERSION__": SCHEMA_VERSION,
            "__SYSTEM_CATEGORIES__": {
                "general": {
                    "id": "general",
                    "name": "General",
                    "parent_id": null,
                    "icon": "Carpeta",
                    "links": [
                        {
                            "title": "Legacy",
                            "url": "https://example.com"
                        }
                    ],
                    "notes": ""
                }
            },
            "__SYSTEM_TASKS__": [],
            "__SYSTEM_QUICK_TEXTS__": [],
            "__SYSTEM_QUICK_TEXT_GROUPS__": [],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, _changed) = normalize_data(raw);

        assert!(data.categories["general"].links[0].images.is_empty());
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
            ],
            "__SYSTEM_QUICK_TEXT_GROUPS__": [],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(!changed);
        assert_eq!(data.quick_texts.len(), 1);
        assert_eq!(data.quick_texts[0].id, "qt_1");
        assert_eq!(data.quick_texts[0].title, "Firma");
        assert_eq!(data.quick_texts[0].content, "Hola,\nCarlos");
        assert!(data.quick_texts[0].group_ids.is_empty());
        assert_eq!(data.quick_texts[0].group_id, None);
        assert!(data.flows.is_empty());
    }

    #[test]
    fn normalize_data_migrates_legacy_quick_text_group_id_to_group_ids() {
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
            "__SYSTEM_QUICK_TEXT_GROUPS__": [
                {
                    "id": "group_a",
                    "name": "Grupo A",
                    "description": "",
                    "sort_order": 1,
                    "created_at": "2026-05-18T00:00:00.000Z",
                    "updated_at": "2026-05-18T00:00:00.000Z"
                }
            ],
            "__SYSTEM_QUICK_TEXTS__": [
                {
                    "id": "qt_legacy",
                    "title": "Firma",
                    "content": "Hola",
                    "group_id": "group_a",
                    "sort_order": 1
                }
            ],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(changed);
        assert_eq!(data.quick_texts[0].group_ids, vec!["group_a".to_string()]);
        assert_eq!(data.quick_texts[0].group_id, Some("group_a".to_string()));
    }

    #[test]
    fn normalize_data_filters_and_dedupes_quick_text_group_ids() {
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
            "__SYSTEM_QUICK_TEXT_GROUPS__": [
                {
                    "id": "group_a",
                    "name": "Grupo A",
                    "description": "",
                    "sort_order": 1,
                    "created_at": "2026-05-18T00:00:00.000Z",
                    "updated_at": "2026-05-18T00:00:00.000Z"
                },
                {
                    "id": "group_b",
                    "name": "Grupo B",
                    "description": "",
                    "sort_order": 2,
                    "created_at": "2026-05-18T00:00:00.000Z",
                    "updated_at": "2026-05-18T00:00:00.000Z"
                }
            ],
            "__SYSTEM_QUICK_TEXTS__": [
                {
                    "id": "qt_multi",
                    "title": "Firma",
                    "content": "Hola",
                    "group_ids": ["group_a", "group_b", "group_a", "missing_group"],
                    "group_id": "group_b",
                    "sort_order": 1
                }
            ],
            "__SYSTEM_FLOWS__": [],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": []
        });

        let (data, changed) = normalize_data(raw);

        assert!(changed);
        assert_eq!(
            data.quick_texts[0].group_ids,
            vec!["group_a".to_string(), "group_b".to_string()]
        );
        assert_eq!(data.quick_texts[0].group_id, Some("group_a".to_string()));
    }

    #[test]
    fn normalize_data_preserves_flows() {
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
                    "id": "note_1",
                    "title": "Nota enlazada",
                    "comment": "",
                    "type": "note",
                    "done": false,
                    "category_id": "general"
                }
            ],
            "__SYSTEM_QUICK_TEXTS__": [],
            "__SYSTEM_QUICK_TEXT_GROUPS__": [],
            "__SYSTEM_FLOWS__": [
                {
                    "id": "flow_1",
                    "category_id": "general",
                    "title": "Flujo 1",
                    "description": "",
                    "status": "draft",
                    "nodes": [
                        {
                            "id": "node_1",
                            "type": "process",
                            "title": "Paso 1",
                            "description": "",
                            "linked_note_ids": ["note_1", "note_1", "missing_note"],
                            "position": { "x": 120, "y": 80 }
                        }
                    ],
                    "edges": [],
                    "created_at": "2026-05-03T00:00:00.000Z",
                    "updated_at": "2026-05-03T00:00:00.000Z"
                }
            ],
            "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": ["note_1", "missing_note", "note_1"]
        });

        let (data, changed) = normalize_data(raw);

        assert!(changed);
        assert_eq!(data.flows.len(), 1);
        assert_eq!(data.flows[0].id, "flow_1");
        assert_eq!(data.flows[0].category_id, "general");
        assert_eq!(data.flows[0].nodes.len(), 1);
        assert_eq!(data.flows[0].nodes[0].linked_note_ids, vec!["note_1".to_string()]);
        assert_eq!(data.flows[0].nodes[0].position.x, 120);
        assert_eq!(data.flows[0].nodes[0].position.y, 80);
        assert_eq!(data.global_flow_linked_note_ids, vec!["note_1".to_string()]);
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

    #[test]
    fn migrate_legacy_data_defaults_link_images_to_empty() {
        let raw = json!({
            "General": {
                "icon": "Trabajo",
                "links": [
                    {
                        "title": "Legacy",
                        "url": "https://example.com"
                    }
                ],
                "notes": ""
            }
        });

        let data = migrate_legacy_data(raw);

        assert_eq!(data.categories[GENERAL_CATEGORY_ID].links.len(), 1);
        assert!(data.categories[GENERAL_CATEGORY_ID].links[0].images.is_empty());
    }
}
