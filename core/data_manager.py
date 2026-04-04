import os
import json
from config import (
    CATEGORIES_KEY,
    CATEGORY_TYPE_NICHE,
    DATA_FILE,
    GENERAL_CATEGORY_ID,
    GENERAL_CATEGORY_NAME,
    SCHEMA_VERSION,
    SCHEMA_VERSION_KEY,
    TASKS_KEY,
)
from core.category_utils import (
    build_category_record,
    create_default_data,
    generate_category_id,
    get_category_map,
    get_tasks,
)


class DataManager:
    @staticmethod
    def load_data() -> dict:
        if not os.path.exists(DATA_FILE):
            return create_default_data()
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                raw_data = json.load(f)
        except Exception:
            return create_default_data()

        data, was_changed = DataManager._normalize_data(raw_data)
        if was_changed:
            DataManager.save_data(data)
        return data

    @staticmethod
    def save_data(data: dict) -> None:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4, ensure_ascii=False)

    @staticmethod
    def _normalize_data(data: dict) -> tuple[dict, bool]:
        if not isinstance(data, dict):
            return create_default_data(), True

        if CATEGORIES_KEY not in data or SCHEMA_VERSION_KEY not in data:
            return DataManager._migrate_legacy_data(data), True

        changed = False
        data.setdefault(SCHEMA_VERSION_KEY, SCHEMA_VERSION)
        data[SCHEMA_VERSION_KEY] = SCHEMA_VERSION

        categories = get_category_map(data)
        tasks = get_tasks(data)

        general_category = categories.get(GENERAL_CATEGORY_ID)
        if general_category is None:
            categories[GENERAL_CATEGORY_ID] = build_category_record(
                GENERAL_CATEGORY_ID,
                GENERAL_CATEGORY_NAME,
                None,
            )
            general_category = categories[GENERAL_CATEGORY_ID]
            changed = True

        general_category["id"] = GENERAL_CATEGORY_ID
        general_category["name"] = GENERAL_CATEGORY_NAME
        general_category["parent_id"] = None
        general_category.setdefault("icon", "Carpeta")
        general_category.setdefault("type", CATEGORY_TYPE_NICHE)
        general_category.setdefault("links", [])
        general_category.setdefault("notes", "")

        valid_category_ids = set(categories.keys())
        for category_id, category in categories.items():
            category.setdefault("id", category_id)
            category.setdefault("name", GENERAL_CATEGORY_NAME if category_id == GENERAL_CATEGORY_ID else "Sin nombre")
            category.setdefault("parent_id", None)
            category.setdefault("icon", "Carpeta")
            category.setdefault("type", CATEGORY_TYPE_NICHE)
            category.setdefault("links", [])
            category.setdefault("notes", "")
            if category_id == GENERAL_CATEGORY_ID:
                category["parent_id"] = None
            elif category.get("parent_id") not in valid_category_ids:
                category["parent_id"] = GENERAL_CATEGORY_ID
                changed = True

        for item in tasks:
            category_id = item.get("category_id")
            if not category_id or category_id not in valid_category_ids:
                item["category_id"] = GENERAL_CATEGORY_ID
                changed = True
            item.pop("category", None)

        return data, changed

    @staticmethod
    def _migrate_legacy_data(data: dict) -> dict:
        new_data = create_default_data()
        categories = get_category_map(new_data)
        legacy_name_to_id: dict[str, str] = {GENERAL_CATEGORY_NAME: GENERAL_CATEGORY_ID}

        legacy_general_payload = None
        legacy_categories: list[tuple[str, dict]] = []
        for key, value in data.items():
            if key == TASKS_KEY or key.startswith("__"):
                continue
            if not isinstance(value, dict):
                continue
            if key.strip().lower() == GENERAL_CATEGORY_NAME.lower():
                legacy_general_payload = value
            else:
                legacy_categories.append((key, value))

        if legacy_general_payload:
            categories[GENERAL_CATEGORY_ID].update(
                {
                    "icon": legacy_general_payload.get("icon", "Carpeta"),
                    "type": legacy_general_payload.get("type", CATEGORY_TYPE_NICHE),
                    "links": list(legacy_general_payload.get("links", [])),
                    "notes": legacy_general_payload.get("notes", ""),
                }
            )

        for legacy_name, legacy_payload in legacy_categories:
            category_id = generate_category_id(new_data)
            categories[category_id] = build_category_record(
                category_id,
                legacy_name,
                GENERAL_CATEGORY_ID,
                icon=legacy_payload.get("icon", "Carpeta"),
                category_type=legacy_payload.get("type", CATEGORY_TYPE_NICHE),
                links=legacy_payload.get("links", []),
                notes=legacy_payload.get("notes", ""),
            )
            legacy_name_to_id[legacy_name] = category_id

        migrated_tasks: list[dict] = []
        for item in data.get(TASKS_KEY, []):
            migrated_item = dict(item)
            legacy_category_name = migrated_item.pop("category", None)

            if legacy_category_name and legacy_category_name not in legacy_name_to_id:
                category_id = generate_category_id(new_data)
                categories[category_id] = build_category_record(
                    category_id,
                    legacy_category_name,
                    GENERAL_CATEGORY_ID,
                )
                legacy_name_to_id[legacy_category_name] = category_id

            migrated_item["category_id"] = legacy_name_to_id.get(
                legacy_category_name,
                GENERAL_CATEGORY_ID,
            )
            migrated_tasks.append(migrated_item)

        new_data[TASKS_KEY] = migrated_tasks
        return new_data
