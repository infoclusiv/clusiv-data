import flet as ft
from config import CATEGORY_TYPE_NOTEBOOK, ICON_MAP, TASKS_KEY
from core.category_utils import (
    get_category,
    get_category_breadcrumb,
    get_child_categories,
    get_item_category_id,
)
from ui.components.board_card import build_note_card, build_task_card
from ui.components.subcategory_card import build_subcategory_card


class NotebookView:
    def __init__(self, page: ft.Page):
        self.page = page
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
        self.lbl_title = ft.Text("", size=24, weight="bold", color=ft.Colors.BLACK87)
        self.lbl_subtitle = ft.Text(
            "", size=14, color=ft.Colors.GREY_600
        )
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
        self.container = self._build()

    def _build(self) -> ft.Container:
        return ft.Container(
            expand=True,
            visible=False,
            padding=20,
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon(ft.Icons.BOOK, color=ft.Colors.TEAL_700),
                            self.lbl_title,
                        ]
                    ),
                    self.lbl_subtitle,
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
            ),
        )

    def refresh(
        self,
        app_data: dict,
        category_id: str,
        on_open_category,
        on_edit,
        on_delete,
        on_toggle,
    ) -> None:
        self.notes_grid.controls.clear()
        self.tasks_grid.controls.clear()
        self.subcategories_wrap.controls.clear()

        category = get_category(app_data, category_id)
        if not category:
            self.lbl_title.value = ""
            self.lbl_subtitle.value = ""
            self.subcategories_section.visible = False
            self.page.update()
            return

        self.lbl_title.value = category.get("name", "")
        self.lbl_subtitle.value = get_category_breadcrumb(app_data, category_id)

        children = get_child_categories(app_data, category_id)
        for child in children:
            child_type = child.get("type")
            icon = (
                ft.Icons.BOOK
                if child_type == CATEGORY_TYPE_NOTEBOOK
                else ICON_MAP.get(child.get("icon", "Carpeta"), ft.Icons.FOLDER)
            )
            subtitle = (
                "Bloc de notas"
                if child_type == CATEGORY_TYPE_NOTEBOOK
                else "Categoría con enlaces"
            )
            self.subcategories_wrap.controls.append(
                build_subcategory_card(
                    child.get("name", ""),
                    subtitle,
                    icon,
                    on_open=lambda cid=child["id"]: on_open_category(cid),
                )
            )
        self.subcategories_section.visible = len(children) > 0

        if TASKS_KEY in app_data:
            for item in app_data[TASKS_KEY]:
                if get_item_category_id(item) != category_id:
                    continue
                itype = item.get("type", "task")
                if itype == "note":
                    card = build_note_card(
                        item, on_edit, on_delete, show_category_label=True
                    )
                    self.notes_grid.controls.append(card)
                else:
                    card = build_task_card(
                        item, on_edit, on_delete, on_toggle, show_category_label=True
                    )
                    self.tasks_grid.controls.append(card)

        self.empty_notes.visible = len(self.notes_grid.controls) == 0
        self.empty_tasks.visible = len(self.tasks_grid.controls) == 0

        self.page.update()
