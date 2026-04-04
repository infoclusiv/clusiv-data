import flet as ft
from config import ICON_MAP, CATEGORY_TYPE_NOTEBOOK
from core.category_utils import get_flat_category_entries


def build_nav_rail(on_change) -> ft.NavigationRail:
    return ft.NavigationRail(
        selected_index=None,
        label_type=ft.NavigationRailLabelType.ALL,
        min_width=100,
        min_extended_width=200,
        group_alignment=-0.9,
        destinations=[],
        expand=True,
        on_change=on_change,
    )


def refresh_nav_rail(
    nav_rail: ft.NavigationRail, app_data: dict
) -> list[str]:
    nav_rail.destinations.clear()
    category_ids: list[str] = []
    for category, depth in get_flat_category_entries(app_data):
        cat_data = category
        cat_type = cat_data.get("type", "niche")
        if cat_type == CATEGORY_TYPE_NOTEBOOK:
            icon_obj = ft.Icons.BOOK
        else:
            icon_obj = ICON_MAP.get(cat_data.get("icon", "Carpeta"), ft.Icons.FOLDER)
        prefix = "> " * depth
        nav_rail.destinations.append(
            ft.NavigationRailDestination(
                icon=icon_obj,
                selected_icon=icon_obj,
                label=f"{prefix}{cat_data['name']}",
            )
        )
        category_ids.append(cat_data["id"])
    return category_ids
