import flet as ft
from config import ICON_MAP, TASKS_KEY


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
    nav_rail: ft.NavigationRail, app_data: dict, page: ft.Page
) -> None:
    nav_rail.destinations.clear()
    categories = [k for k in app_data.keys() if k != TASKS_KEY]
    for cat_name in categories:
        cat_data = app_data[cat_name]
        icon_obj = ICON_MAP.get(cat_data.get("icon", "Carpeta"), ft.Icons.FOLDER)
        nav_rail.destinations.append(
            ft.NavigationRailDestination(
                icon=icon_obj, selected_icon=icon_obj, label=cat_name
            )
        )
    page.update()
