import flet as ft


def build_welcome_view() -> ft.Container:
    return ft.Container(
        expand=True,
        alignment=ft.alignment.center,
        content=ft.Column(
            [
                ft.Icon(
                    ft.Icons.DASHBOARD_CUSTOMIZE, size=60, color=ft.Colors.GREY_400
                ),
                ft.Text(
                    "Selecciona una opción del menú", size=20, color=ft.Colors.GREY_500
                ),
            ],
            horizontal_alignment=ft.CrossAxisAlignment.CENTER,
        ),
    )
