use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::{Category, Item};

pub const GENERAL_CATEGORY_ID: &str = "general";
pub const GENERAL_CATEGORY_NAME: &str = "General";
pub const SCHEMA_VERSION: u32 = 6;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct QuickText {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub content: String,
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
    pub subtitle: String,
    #[serde(default)]
    pub description: String,
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
    pub category_id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub description: String,
    #[serde(default)]
    pub status: String,
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
    #[serde(rename = "__SYSTEM_CATEGORIES__")]
    pub categories: HashMap<String, Category>,
    #[serde(rename = "__SYSTEM_TASKS__")]
    pub tasks: Vec<Item>,
    #[serde(rename = "__SYSTEM_QUICK_TEXTS__", default)]
    pub quick_texts: Vec<QuickText>,
    #[serde(rename = "__SYSTEM_FLOWS__", default)]
    pub flows: Vec<Flow>,
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
            categories,
            tasks: Vec::new(),
            quick_texts: Vec::new(),
            flows: Vec::new(),
        }
    }
}

impl Default for AppData {
    fn default() -> Self {
        Self::default_data()
    }
}
