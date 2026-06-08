use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::{Category, Item};

pub const GENERAL_CATEGORY_ID: &str = "general";
pub const GENERAL_CATEGORY_NAME: &str = "General";
pub const DEFAULT_HOME_TEXT: &str = "Sigue avanzando, un paso a la vez.";
pub const SCHEMA_VERSION: u32 = 16;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct QuickText {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
    #[serde(default)]
    pub group_ids: Vec<String>,
    #[serde(default)]
    pub group_id: Option<String>,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub group_sort_orders: HashMap<String, i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct QuickTextGroup {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub sort_order: i32,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct FlowPosition {
    #[serde(default)]
    pub x: i32,
    #[serde(default)]
    pub y: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct FlowNode {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub r#type: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub comments: String,
    #[serde(default)]
    pub linked_note_ids: Vec<String>,
    #[serde(default)]
    pub position: FlowPosition,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct FlowEdge {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub target: String,
    #[serde(default)]
    pub label: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct Flow {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub category_id: Option<String>,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub comments: String,
    #[serde(default)]
    pub linked_note_ids: Vec<String>,
    #[serde(default)]
    pub nodes: Vec<FlowNode>,
    #[serde(default)]
    pub edges: Vec<FlowEdge>,
    #[serde(default)]
    pub created_at: String,
    #[serde(default)]
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    #[serde(rename = "__SCHEMA_VERSION__")]
    pub schema_version: u32,
    #[serde(rename = "__SYSTEM_HOME_TEXT__", default = "default_home_text")]
    pub home_text: String,
    #[serde(rename = "__SYSTEM_CATEGORIES__")]
    pub categories: HashMap<String, Category>,
    #[serde(rename = "__SYSTEM_TASKS__")]
    pub tasks: Vec<Item>,
    #[serde(rename = "__SYSTEM_QUICK_TEXTS__", default)]
    pub quick_texts: Vec<QuickText>,
    #[serde(rename = "__SYSTEM_QUICK_TEXT_GROUPS__", default)]
    pub quick_text_groups: Vec<QuickTextGroup>,
    #[serde(rename = "__SYSTEM_FLOWS__", default)]
    pub flows: Vec<Flow>,
    #[serde(rename = "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__", default)]
    pub global_flow_linked_note_ids: Vec<String>,
    #[serde(rename = "__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__", default)]
    pub global_quick_text_linked_note_ids: Vec<String>,
}

fn default_home_text() -> String {
    DEFAULT_HOME_TEXT.to_string()
}

impl AppData {
    pub fn default_data() -> Self {
        let mut categories = HashMap::new();
        categories.insert(
            GENERAL_CATEGORY_ID.to_string(),
            Category {
                id: GENERAL_CATEGORY_ID.to_string(),
                name: GENERAL_CATEGORY_NAME.to_string(),
                parent_id: None,
                icon: "Carpeta".to_string(),
                links: Vec::new(),
                notes: String::new(),
            },
        );

        Self {
            schema_version: SCHEMA_VERSION,
            home_text: default_home_text(),
            categories,
            tasks: Vec::new(),
            quick_texts: Vec::new(),
            quick_text_groups: Vec::new(),
            flows: Vec::new(),
            global_flow_linked_note_ids: Vec::new(),
            global_quick_text_linked_note_ids: Vec::new(),
        }
    }
}

impl Default for AppData {
    fn default() -> Self {
        Self::default_data()
    }
}
