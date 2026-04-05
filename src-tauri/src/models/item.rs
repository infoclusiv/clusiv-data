use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    #[default]
    Task,
    Note,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Item {
    pub title: String,
    #[serde(default)]
    pub comment: String,
    #[serde(rename = "type", default)]
    pub item_type: ItemType,
    #[serde(default)]
    pub done: bool,
    pub category_id: String,
}