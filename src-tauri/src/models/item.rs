use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum ItemType {
    #[default]
    Task,
    Note,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct ItemImage {
    pub id: String,
    #[serde(default)]
    pub data_url: String,
    #[serde(default)]
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct NoteLink {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct NoteDocument {
    #[serde(default)]
    pub id: String,
    #[serde(default)]
    pub name: String,
    #[serde(default)]
    pub mime_type: String,
    #[serde(default)]
    pub data_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Item {
    #[serde(default)]
    pub id: String,
    pub title: String,
    #[serde(default)]
    pub comment: String,
    #[serde(default)]
    pub images: Vec<ItemImage>,
    #[serde(default)]
    pub links: Vec<NoteLink>,
    #[serde(default)]
    pub documents: Vec<NoteDocument>,
    #[serde(default)]
    pub tags: Vec<String>,
    #[serde(rename = "type", default)]
    pub item_type: ItemType,
    #[serde(default)]
    pub done: bool,
    pub category_id: String,
}
