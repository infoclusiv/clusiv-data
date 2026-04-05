use std::collections::HashMap;

use serde::{Deserialize, Serialize};

use super::{Category, CategoryType, Item};

pub const GENERAL_CATEGORY_ID: &str = "general";
pub const GENERAL_CATEGORY_NAME: &str = "General";
pub const SCHEMA_VERSION: u32 = 2;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppData {
    #[serde(rename = "__SCHEMA_VERSION__")]
    pub schema_version: u32,
    #[serde(rename = "__SYSTEM_CATEGORIES__")]
    pub categories: HashMap<String, Category>,
    #[serde(rename = "__SYSTEM_TASKS__")]
    pub tasks: Vec<Item>,
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
                category_type: CategoryType::Niche,
                links: Vec::new(),
                notes: String::new(),
            },
        );

        Self {
            schema_version: SCHEMA_VERSION,
            categories,
            tasks: Vec::new(),
        }
    }
}

impl Default for AppData {
    fn default() -> Self {
        Self::default_data()
    }
}