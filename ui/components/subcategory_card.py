import flet as ft


def build_subcategory_card(label: str, subtitle: str, icon, on_open) -> ft.Card:
    return ft.Card(
        bgcolor=ft.Colors.BLUE_GREY_50,
        elevation=1,
        content=ft.Container(
            width=220,
            padding=15,
            ink=True,
            border_radius=12,
            on_click=lambda _: on_open(),
            content=ft.Column(
                [
                    ft.Row(
                        [
                            ft.Icon(icon, color=ft.Colors.TEAL_700, size=20),
                            ft.Container(expand=True),
                            ft.Icon(
                                ft.Icons.CHEVRON_RIGHT,
                                color=ft.Colors.GREY_500,
                                size=18,
                            ),
                        ]
                    ),
                    ft.Text(
                        label,
                        size=15,
                        weight="bold",
                        color=ft.Colors.BLACK87,
                        max_lines=2,
                        overflow=ft.TextOverflow.ELLIPSIS,
                    ),
                    ft.Text(
                        subtitle,
                        size=12,
                        color=ft.Colors.GREY_700,
                        max_lines=2,
                        overflow=ft.TextOverflow.ELLIPSIS,
                    ),
                ],
                spacing=8,
                tight=True,
            ),
        ),
    )