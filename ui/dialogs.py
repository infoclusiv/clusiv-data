import flet as ft
from config import ICON_MAP


class AppDialogs:
    def __init__(self):
        self.cat_input = ft.TextField(label="Nombre", autofocus=True)
        self.cat_icon = ft.Dropdown(
            label="Icono",
            options=[ft.dropdown.Option(k) for k in ICON_MAP.keys()],
            value="Carpeta",
            expand=True,
        )
        self.dlg_category = ft.AlertDialog(
            title=ft.Text("Categoría"),
            content=ft.Column([self.cat_input, self.cat_icon], height=120, tight=True),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton("Guardar", on_click=lambda e: None),
            ],
        )

        self.link_title = ft.TextField(label="Título (Opcional)")
        self.link_url = ft.TextField(label="URL")
        self.dlg_link = ft.AlertDialog(
            title=ft.Text("Nuevo Enlace"),
            content=ft.Column([self.link_title, self.link_url], height=150, tight=True),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton("Guardar", on_click=lambda e: None),
            ],
        )

        self.dlg_confirm_link = ft.AlertDialog(
            title=ft.Text("Eliminar Enlace"),
            content=ft.Text("¿Estás seguro de que quieres borrar este enlace?"),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton(
                    "Sí, borrar",
                    on_click=lambda e: None,
                    style=ft.ButtonStyle(color=ft.Colors.RED),
                ),
            ],
        )

        self.item_title = ft.TextField(label="Título", autofocus=True)
        self.item_desc = ft.TextField(
            label="Contenido / Comentario",
            multiline=True,
            min_lines=3,
            max_lines=5,
            text_size=14,
        )
        self.item_category = ft.Dropdown(label="Asignar a Categoría", options=[])
        self.item_type = ft.RadioGroup(
            content=ft.Row(
                [
                    ft.Radio(value="task", label="Tarea"),
                    ft.Radio(value="note", label="Nota"),
                ]
            )
        )
        self.dlg_item = ft.AlertDialog(
            title=ft.Text("Nuevo Elemento"),
            content=ft.Container(
                width=400,
                content=ft.Column(
                    [
                        self.item_type,
                        ft.Divider(),
                        self.item_title,
                        self.item_category,
                        self.item_desc,
                    ],
                    tight=True,
                    spacing=10,
                ),
            ),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton("Guardar", on_click=lambda e: None),
            ],
        )

        self.dlg_confirm_item = ft.AlertDialog(
            title=ft.Text("Eliminar Elemento"),
            content=ft.Text("¿Estás seguro de que quieres borrar esta nota o tarea?"),
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton(
                    "Sí, borrar",
                    on_click=lambda e: None,
                    style=ft.ButtonStyle(color=ft.Colors.RED),
                ),
            ],
        )

        self.bulk_input = ft.TextField(
            label="Lista de URLs", multiline=True, min_lines=10
        )
        self.dlg_bulk = ft.AlertDialog(
            title=ft.Text("Importar Enlaces"),
            content=self.bulk_input,
            actions=[
                ft.TextButton("Cancelar", on_click=lambda e: None),
                ft.TextButton("Procesar", on_click=lambda e: None),
            ],
        )
