import flet as ft
from ui.components.link_card import build_link_card


class LinksView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.links_column = ft.Column(spacing=10, scroll=ft.ScrollMode.AUTO)
        self.lbl_title = ft.Text("", size=24, weight="bold", color=ft.Colors.BLACK87)

        self.btn_open_all = ft.IconButton(
            icon=ft.Icons.ROCKET_LAUNCH,
            tooltip="Abrir TODOS los enlaces",
            icon_color=ft.Colors.GREEN_700,
            icon_size=26,
        )
        self.btn_view_notes = ft.IconButton(
            icon=ft.Icons.ASSIGNMENT,
            tooltip="Ver Notas y Tareas de esta Categoría",
            icon_color=ft.Colors.AMBER_800,
            icon_size=26,
        )
        self.btn_import = ft.IconButton(
            icon=ft.Icons.UPLOAD_FILE,
            tooltip="Importar",
            icon_color=ft.Colors.TEAL_600,
        )
        self.btn_edit_cat = ft.IconButton(
            icon=ft.Icons.EDIT,
            tooltip="Editar Categoría",
            icon_color=ft.Colors.BLUE_GREY_700,
        )
        self.btn_delete_cat = ft.IconButton(
            icon=ft.Icons.DELETE_FOREVER,
            icon_color=ft.Colors.RED_600,
            tooltip="Borrar Categoría",
        )
        self.btn_add_note = ft.ElevatedButton(
            "Agregar Nota a esta Categoría",
            icon=ft.Icons.NOTE_ADD,
            style=ft.ButtonStyle(
                color=ft.Colors.WHITE,
                bgcolor=ft.Colors.TEAL_700,
                padding=15,
                shape=ft.RoundedRectangleBorder(radius=8),
            ),
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
                            self.lbl_title,
                            ft.Container(expand=True),
                            self.btn_open_all,
                            ft.VerticalDivider(width=10),
                            self.btn_view_notes,
                            ft.VerticalDivider(width=10),
                            self.btn_import,
                            self.btn_edit_cat,
                            self.btn_delete_cat,
                        ]
                    ),
                    ft.Divider(),
                    ft.Text("Enlaces Guardados", size=16, color=ft.Colors.GREY_700),
                    ft.Container(content=self.links_column, expand=True),
                    ft.Divider(),
                    ft.Container(
                        alignment=ft.alignment.center_left,
                        content=self.btn_add_note,
                        padding=ft.padding.only(top=10, bottom=20),
                    ),
                    ft.Container(height=50),
                ]
            ),
        )

    def refresh(
        self, app_data: dict, current_category: str, on_open, on_delete
    ) -> None:
        self.links_column.controls.clear()
        if current_category and current_category in app_data:
            for link in app_data[current_category]["links"]:
                card = build_link_card(link, on_open, on_delete)
                self.links_column.controls.append(card)
        self.page.update()
