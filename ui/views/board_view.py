import flet as ft
from config import (
    CATEGORY_TYPE_NOTEBOOK,
    GENERAL_CATEGORY_ID,
    ICON_MAP,
    TASKS_KEY,
)
from core.category_utils import (
    get_category,
    get_category_breadcrumb,
    get_child_categories,
    get_flat_category_entries,
    get_item_category_id,
)
from ui.components.board_card import build_note_card, build_task_card
from ui.components.subcategory_card import build_subcategory_card


class BoardView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.gallery_grid = ft.GridView(
            runs_count=4,
            max_extent=260,
            child_aspect_ratio=1.3,
            spacing=15,
            run_spacing=15,
            expand=True,
        )
        self.notes_grid = ft.GridView(
            runs_count=5,
            max_extent=300,
            child_aspect_ratio=1.2,
            spacing=15,
            run_spacing=15,
            expand=False,
        )
        self.tasks_grid = ft.GridView(
            runs_count=5,
            max_extent=300,
            child_aspect_ratio=1.2,
            spacing=15,
            run_spacing=15,
            expand=False,
        )
        self.gallery_title = ft.Text(
            "Notas y Tareas", size=24, weight="bold", color=ft.Colors.BLACK87
        )
        self.gallery_subtitle = ft.Text(
            "Elige una categoría para ver solo sus notas y tareas.",
            size=14,
            color=ft.Colors.GREY_600,
        )
        self.detail_icon = ft.Icon(ft.Icons.FOLDER, color=ft.Colors.TEAL_700)
        self.detail_title = ft.Text(
            "", size=24, weight="bold", color=ft.Colors.BLACK87
        )
        self.detail_subtitle = ft.Text("", size=14, color=ft.Colors.GREY_600)
        self.subcategories_wrap = ft.Row(wrap=True, spacing=12, run_spacing=12)
        self.subcategories_section = ft.Column(
            [
                ft.Row(
                    [
                        ft.Icon(ft.Icons.FOLDER_OPEN, color=ft.Colors.TEAL_700),
                        ft.Text("Subcategorías", weight="bold", size=18),
                    ]
                ),
                self.subcategories_wrap,
                ft.Divider(),
            ],
            spacing=10,
            visible=False,
        )
        self.empty_notes = ft.Text(
            "No hay notas en esta categoría.",
            size=13,
            color=ft.Colors.GREY_600,
            italic=True,
            visible=False,
        )
        self.empty_tasks = ft.Text(
            "No hay tareas en esta categoría.",
            size=13,
            color=ft.Colors.GREY_600,
            italic=True,
            visible=False,
        )
        self.btn_back = ft.TextButton(
            "Volver a categorías",
            icon=ft.Icons.ARROW_BACK,
            style=ft.ButtonStyle(color=ft.Colors.TEAL_700),
        )
        self.gallery_view = self._build_gallery_view()
        self.detail_view = self._build_detail_view()
        self.container = self._build()

    def _build(self) -> ft.Container:
        return ft.Container(
            expand=True,
            visible=False,
            padding=20,
            content=ft.Column(
                [self.gallery_view, self.detail_view],
                expand=True,
            ),
        )

    def _build_gallery_view(self) -> ft.Column:
        return ft.Column(
            [
                self.gallery_title,
                self.gallery_subtitle,
                ft.Divider(),
                ft.Container(content=self.gallery_grid, expand=True),
            ],
            expand=True,
            visible=True,
        )

    def _build_detail_view(self) -> ft.Column:
        return ft.Column(
            [
                self.btn_back,
                ft.Row(
                    [
                        self.detail_icon,
                        self.detail_title,
                    ]
                ),
                self.detail_subtitle,
                ft.Divider(),
                self.subcategories_section,
                ft.Row(
                    [
                        ft.Icon(ft.Icons.NOTE, color=ft.Colors.AMBER_700),
                        ft.Text("Notas", weight="bold", size=18),
                    ]
                ),
                ft.Container(
                    content=ft.Column(
                        [self.empty_notes, self.notes_grid],
                        spacing=10,
                    ),
                    expand=True,
                ),
                ft.Divider(),
                ft.Row(
                    [
                        ft.Icon(ft.Icons.CHECK_CIRCLE, color=ft.Colors.GREEN_700),
                        ft.Text("Tareas", weight="bold", size=18),
                    ]
                ),
                ft.Container(
                    content=ft.Column(
                        [self.empty_tasks, self.tasks_grid],
                        spacing=10,
                    ),
                    expand=True,
                ),
            ],
            scroll=ft.ScrollMode.AUTO,
            expand=True,
            visible=False,
        )

    def _get_category_icon(self, category: dict):
        if category.get("id") == GENERAL_CATEGORY_ID:
            return ft.Icons.INBOX
        if category.get("type") == CATEGORY_TYPE_NOTEBOOK:
            return ft.Icons.BOOK
        return ICON_MAP.get(category.get("icon", "Carpeta"), ft.Icons.FOLDER)

    def _refresh_subcategories(
        self,
        app_data: dict,
        category_id: str,
        on_open_category,
    ) -> None:
        self.subcategories_wrap.controls.clear()
        children = get_child_categories(app_data, category_id)
        for child in children:
            child_type = child.get("type")
            subtitle = (
                "Bloc de notas"
                if child_type == CATEGORY_TYPE_NOTEBOOK
                else "Categoría con enlaces"
            )
            self.subcategories_wrap.controls.append(
                build_subcategory_card(
                    child.get("name", ""),
                    subtitle,
                    self._get_category_icon(child),
                    on_open=lambda cid=child["id"]: on_open_category(cid),
                )
            )
        self.subcategories_section.visible = len(children) > 0

    def _count_items(self, app_data: dict, category_id: str) -> tuple[int, int]:
        note_count = 0
        task_count = 0
        for item in app_data.get(TASKS_KEY, []):
            if get_item_category_id(item) != category_id:
                continue

            if item.get("type", "task") == "note":
                note_count += 1
            else:
                task_count += 1

        return note_count, task_count

    def _format_counts(self, note_count: int, task_count: int) -> str:
        note_label = "nota" if note_count == 1 else "notas"
        task_label = "tarea" if task_count == 1 else "tareas"
        return f"{note_count} {note_label} • {task_count} {task_label}"

    def _build_category_card(
        self,
        label: str,
        category_value: str | None,
        icon,
        description: str,
        note_count: int,
        task_count: int,
        color,
        on_open_category,
    ) -> ft.Card:
        return ft.Card(
            bgcolor=color,
            elevation=1,
            content=ft.Container(
                padding=20,
                ink=True,
                border_radius=14,
                on_click=lambda _, cat=category_value: on_open_category(cat),
                content=ft.Column(
                    [
                        ft.Row(
                            [
                                ft.Icon(icon, size=28, color=ft.Colors.TEAL_700),
                                ft.Container(expand=True),
                                ft.Icon(
                                    ft.Icons.CHEVRON_RIGHT,
                                    size=16,
                                    color=ft.Colors.GREY_500,
                                ),
                            ]
                        ),
                        ft.Text(
                            label,
                            size=18,
                            weight="bold",
                            color=ft.Colors.BLACK87,
                            max_lines=2,
                            overflow=ft.TextOverflow.ELLIPSIS,
                        ),
                        ft.Text(
                            description,
                            size=13,
                            color=ft.Colors.GREY_700,
                            max_lines=2,
                            overflow=ft.TextOverflow.ELLIPSIS,
                        ),
                        ft.Container(expand=True),
                        ft.Text(
                            self._format_counts(note_count, task_count),
                            size=12,
                            color=ft.Colors.GREY_800,
                            weight="bold",
                        ),
                    ],
                    expand=True,
                    spacing=10,
                ),
            ),
        )

    def _refresh_gallery(self, app_data: dict, on_open_category) -> None:
        self.gallery_grid.controls.clear()

        for category_data, depth in get_flat_category_entries(app_data):
            category_id = category_data["id"]
            category_type = category_data.get("type")
            note_count, task_count = self._count_items(app_data, category_id)
            icon = self._get_category_icon(category_data)
            description = (
                "Notas y tareas generales"
                if category_id == GENERAL_CATEGORY_ID
                else get_category_breadcrumb(app_data, category_id)
            )
            if category_id == GENERAL_CATEGORY_ID:
                color = ft.Colors.TEAL_50
            elif category_type == CATEGORY_TYPE_NOTEBOOK:
                color = ft.Colors.AMBER_50
            elif depth > 0:
                color = ft.Colors.BLUE_GREY_50
            else:
                color = ft.Colors.WHITE
            self.gallery_grid.controls.append(
                self._build_category_card(
                    category_data.get("name", ""),
                    category_id,
                    icon,
                    description,
                    note_count,
                    task_count,
                    color,
                    on_open_category,
                )
            )

    def _refresh_detail(
        self,
        app_data: dict,
        board_category_id: str | None,
        on_edit,
        on_delete,
        on_toggle,
        on_open_category,
    ) -> None:
        self.notes_grid.controls.clear()
        self.tasks_grid.controls.clear()
        self.subcategories_wrap.controls.clear()

        if not board_category_id:
            self.detail_title.value = ""
            self.detail_subtitle.value = ""
            self.subcategories_section.visible = False
            self.empty_notes.visible = False
            self.empty_tasks.visible = False
            return

        category = get_category(app_data, board_category_id)
        if not category:
            self.detail_title.value = ""
            self.detail_subtitle.value = ""
            self.subcategories_section.visible = False
            self.empty_notes.visible = False
            self.empty_tasks.visible = False
            return

        self.detail_title.value = category.get("name", "")
        self.detail_subtitle.value = get_category_breadcrumb(app_data, board_category_id)
        self.detail_icon.name = self._get_category_icon(category)
        self.detail_icon.color = (
            ft.Colors.AMBER_800
            if category.get("type") == CATEGORY_TYPE_NOTEBOOK
            else ft.Colors.TEAL_700
        )

        self._refresh_subcategories(app_data, board_category_id, on_open_category)
        self.empty_notes.value = "No hay notas en esta categoría."
        self.empty_tasks.value = "No hay tareas en esta categoría."

        for item in app_data.get(TASKS_KEY, []):
            if get_item_category_id(item) != board_category_id:
                continue

            item_type = item.get("type", "task")
            if item_type == "note":
                self.notes_grid.controls.append(
                    build_note_card(item, on_edit, on_delete, True)
                )
            else:
                self.tasks_grid.controls.append(
                    build_task_card(item, on_edit, on_delete, on_toggle, True)
                )

        self.empty_notes.visible = len(self.notes_grid.controls) == 0
        self.empty_tasks.visible = len(self.tasks_grid.controls) == 0

    def refresh(
        self,
        app_data: dict,
        board_mode: str,
        board_category_id: str | None,
        on_edit,
        on_delete,
        on_toggle,
        on_open_category,
        on_back,
    ) -> None:
        self.btn_back.on_click = on_back
        self._refresh_gallery(app_data, on_open_category)
        self._refresh_detail(
            app_data,
            board_category_id,
            on_edit,
            on_delete,
            on_toggle,
            on_open_category,
        )

        self.gallery_view.visible = board_mode == "gallery"
        self.detail_view.visible = board_mode == "detail"

        self.page.update()
