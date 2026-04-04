import flet as ft

from config import CATEGORY_TYPE_NOTEBOOK, ICON_MAP
from core.category_utils import get_category, get_category_breadcrumb, get_child_categories
from ui.components.link_card import build_link_card
from ui.components.subcategory_card import build_subcategory_card


class LinksView:
    def __init__(self, page: ft.Page):
        self.page = page
        self.links_column = ft.Column(spacing=10, scroll=ft.ScrollMode.AUTO)
        self.lbl_title = ft.Text("", size=24, weight="bold", color=ft.Colors.BLACK87)
        self.lbl_subtitle = ft.Text("", size=13, color=ft.Colors.GREY_600)
        self.subcategories_wrap = ft.Row(wrap=True, spacing=12, run_spacing=12)
        self.subcategories_section = ft.Column(
            [
                ft.Row(
                    [
                        ft.Icon(ft.Icons.FOLDER_OPEN, color=ft.Colors.TEAL_700),
                        ft.Text("Subcategorías", size=16, weight="bold"),
                    ]
                ),
                self.subcategories_wrap,
                ft.Divider(),
            ],
            spacing=10,
            visible=False,
        )

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
                    self.lbl_subtitle,
                    ft.Divider(),
                    self.subcategories_section,
                    ft.Text("Enlaces Guardados", size=16, color=ft.Colors.GREY_700),
                    ft.Container(content=self.links_column, expand=True),
                    ft.Divider(),
                    ft.Container(
                        content=self.btn_add_note,
                        padding=ft.padding.only(top=10, bottom=20),
                    ),
                    ft.Container(height=50),
                ]
            ),
        )

    def refresh(
        self,
        app_data: dict,
        current_category_id: str,
        on_open_category,
        on_open_link,
        on_delete,
    ) -> None:
        self.links_column.controls.clear()
        self.subcategories_wrap.controls.clear()

        category = get_category(app_data, current_category_id)
        if not category:
            self.lbl_title.value = ""
            self.lbl_subtitle.value = ""
            self.subcategories_section.visible = False
            self.page.update()
            return

        self.lbl_title.value = category.get("name", "")
        self.lbl_subtitle.value = get_category_breadcrumb(app_data, current_category_id)

        children = get_child_categories(app_data, current_category_id)
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

        for link in category.get("links", []):
            card = build_link_card(link, on_open_link, on_delete)
            self.links_column.controls.append(card)
        self.page.update()
