use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "snake_case")]
pub enum CategoryType {
    #[default]
    Niche,
    Notebook,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
pub struct Link {
    #[serde(default)]
    pub title: String,
    #[serde(default)]
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct Category {
    pub id: String,
    pub name: String,
    pub parent_id: Option<String>,
    #[serde(default = "default_icon")]
    pub icon: String,
    #[serde(rename = "type", default)]
    pub category_type: CategoryType,
    #[serde(default)]
    pub links: Vec<Link>,
    #[serde(default)]
    pub notes: String,
}

fn default_icon() -> String {
    "Carpeta".to_string()
}