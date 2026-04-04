import flet as ft
from config import TASKS_KEY
from ui.components.board_card import build_note_card, build_task_card


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
        self.lbl_title = ft.Text("", size=24, weight="bold", color=ft.Colors.BLACK87)
        self.lbl_subtitle = ft.Text(
            "Notas y tareas de esta categoría", size=14, color=ft.Colors.GREY_600
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
                    ft.Row(
                        [
                            ft.Icon(ft.Icons.NOTE, color=ft.Colors.AMBER_700),
                            ft.Text("Notas", weight="bold", size=18),
                        ]
                    ),
                    ft.Container(content=self.notes_grid, expand=True),
                    ft.Divider(),
                    ft.Row(
                        [
                            ft.Icon(ft.Icons.CHECK_CIRCLE, color=ft.Colors.GREEN_700),
                            ft.Text("Tareas", weight="bold", size=18),
                        ]
                    ),
                    ft.Container(content=self.tasks_grid, expand=True),
                ],
                scroll=ft.ScrollMode.AUTO,
                expand=True,
            ),
        )

    def refresh(
        self,
        app_data: dict,
        category: str,
        on_edit,
        on_delete,
        on_toggle,
    ) -> None:
        self.notes_grid.controls.clear()
        self.tasks_grid.controls.clear()
        self.lbl_title.value = category

        if TASKS_KEY in app_data:
            for item in app_data[TASKS_KEY]:
                if item.get("category") != category:
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

        self.page.update()
