import flet as ft


def build_link_card(link: dict, on_open, on_delete) -> ft.Card:
    return ft.Card(
        color=ft.Colors.WHITE,
        elevation=2,
        content=ft.Container(
            content=ft.Row(
                [
                    ft.Icon(ft.Icons.LINK, color=ft.Colors.BLUE_700),
                    ft.Text(
                        link["title"],
                        weight="bold",
                        expand=True,
                        size=16,
                        color=ft.Colors.BLACK87,
                        overflow=ft.TextOverflow.ELLIPSIS,
                    ),
                    ft.IconButton(
                        icon=ft.Icons.OPEN_IN_NEW,
                        tooltip="Abrir",
                        icon_color=ft.Colors.GREY_700,
                        on_click=lambda _, u=link["url"]: on_open(u),
                    ),
                    ft.IconButton(
                        icon=ft.Icons.DELETE_OUTLINE,
                        icon_color=ft.Colors.RED_600,
                        tooltip="Borrar",
                        on_click=lambda _, l=link: on_delete(l),
                    ),
                ],
                alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
            ),
            padding=15,
            on_click=lambda _, u=link["url"]: on_open(u),
            ink=True,
        ),
    )
