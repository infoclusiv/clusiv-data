from __future__ import annotations

import uuid

from config import (
    CATEGORIES_KEY,
    CATEGORY_TYPE_NICHE,
    GENERAL_CATEGORY_ID,
    GENERAL_CATEGORY_NAME,
    SCHEMA_VERSION,
    SCHEMA_VERSION_KEY,
    TASKS_KEY,
)


def build_category_record(
    category_id: str,
    name: str,
    parent_id: str | None,
    icon: str = "Carpeta",
    category_type: str = CATEGORY_TYPE_NICHE,
    links: list[dict] | None = None,
    notes: str = "",
) -> dict:
    return {
        "id": category_id,
        "name": name,
        "parent_id": parent_id,
        "icon": icon,
        "type": category_type,
        "links": list(links or []),
        "notes": notes,
    }


def create_default_data() -> dict:
    return {
        SCHEMA_VERSION_KEY: SCHEMA_VERSION,
        CATEGORIES_KEY: {
            GENERAL_CATEGORY_ID: build_category_record(
                GENERAL_CATEGORY_ID,
                GENERAL_CATEGORY_NAME,
                None,
            )
        },
        TASKS_KEY: [],
    }


def get_category_map(app_data: dict) -> dict[str, dict]:
    categories = app_data.setdefault(CATEGORIES_KEY, {})
    if GENERAL_CATEGORY_ID not in categories:
        categories[GENERAL_CATEGORY_ID] = build_category_record(
            GENERAL_CATEGORY_ID,
            GENERAL_CATEGORY_NAME,
            None,
        )
    return categories


def get_tasks(app_data: dict) -> list[dict]:
    return app_data.setdefault(TASKS_KEY, [])


def get_category(app_data: dict, category_id: str | None) -> dict | None:
    if not category_id:
        return None
    return get_category_map(app_data).get(category_id)


def get_item_category_id(item: dict) -> str:
    return item.get("category_id") or GENERAL_CATEGORY_ID


def generate_category_id(app_data: dict) -> str:
    categories = get_category_map(app_data)
    while True:
        candidate = f"cat_{uuid.uuid4().hex[:10]}"
        if candidate not in categories:
            return candidate


def _category_sort_key(category: dict) -> tuple[int, str, str]:
    is_general = category.get("id") == GENERAL_CATEGORY_ID
    return (0 if is_general else 1, category.get("name", "").lower(), category.get("id", ""))


def get_root_categories(app_data: dict) -> list[dict]:
    categories = [
        category
        for category in get_category_map(app_data).values()
        if category.get("parent_id") is None
    ]
    return sorted(categories, key=_category_sort_key)


def get_child_categories(app_data: dict, parent_id: str | None) -> list[dict]:
    categories = [
        category
        for category in get_category_map(app_data).values()
        if category.get("parent_id") == parent_id
    ]
    return sorted(categories, key=_category_sort_key)


def get_flat_category_entries(app_data: dict) -> list[tuple[dict, int]]:
    entries: list[tuple[dict, int]] = []

    def walk(current_parent_id: str | None, depth: int) -> None:
        for category in get_child_categories(app_data, current_parent_id):
            entries.append((category, depth))
            walk(category["id"], depth + 1)

    walk(None, 0)
    return entries


def get_descendant_ids(app_data: dict, category_id: str) -> set[str]:
    descendants: set[str] = set()
    for child in get_child_categories(app_data, category_id):
        child_id = child["id"]
        descendants.add(child_id)
        descendants.update(get_descendant_ids(app_data, child_id))
    return descendants


def category_has_children(app_data: dict, category_id: str) -> bool:
    return any(
        category.get("parent_id") == category_id
        for category in get_category_map(app_data).values()
    )


def would_create_cycle(
    app_data: dict,
    category_id: str,
    new_parent_id: str | None,
) -> bool:
    if not new_parent_id:
        return False
    if category_id == new_parent_id:
        return True
    return new_parent_id in get_descendant_ids(app_data, category_id)


def is_name_taken_under_parent(
    app_data: dict,
    name: str,
    parent_id: str | None,
    exclude_category_id: str | None = None,
) -> bool:
    normalized_name = name.strip().lower()
    for category in get_child_categories(app_data, parent_id):
        if category["id"] == exclude_category_id:
            continue
        if category.get("name", "").strip().lower() == normalized_name:
            return True
    return False


def get_category_breadcrumb(
    app_data: dict,
    category_id: str | None,
    include_general: bool = True,
) -> str:
    if not category_id:
        return GENERAL_CATEGORY_NAME

    parts: list[str] = []
    seen: set[str] = set()
    current = get_category(app_data, category_id)

    while current:
        current_id = current["id"]
        if current_id in seen:
            break
        seen.add(current_id)
        name = current.get("name", "")
        if include_general or current_id != GENERAL_CATEGORY_ID:
            parts.append(name)
        parent_id = current.get("parent_id")
        current = get_category(app_data, parent_id)

    if not parts:
        return GENERAL_CATEGORY_NAME
    return " / ".join(reversed(parts))


def get_available_parent_entries(
    app_data: dict,
    editing_category_id: str | None = None,
) -> list[tuple[str, str]]:
    excluded_ids: set[str] = set()
    if editing_category_id:
        excluded_ids.add(editing_category_id)
        excluded_ids.update(get_descendant_ids(app_data, editing_category_id))

    entries: list[tuple[str, str]] = []
    for category, _depth in get_flat_category_entries(app_data):
        category_id = category["id"]
        if category_id in excluded_ids:
            continue
        entries.append((category_id, get_category_breadcrumb(app_data, category_id)))
    return entries


def get_category_options(app_data: dict) -> list[tuple[str, str]]:
    return [
        (category["id"], get_category_breadcrumb(app_data, category["id"]))
        for category, _depth in get_flat_category_entries(app_data)
    ]
