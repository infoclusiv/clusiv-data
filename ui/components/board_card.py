import flet as ft


def build_note_card(
    item: dict, on_edit, on_delete, show_category_label: bool
) -> ft.Card:
    comment_text = item.get("comment", "").strip()
    has_comment = len(comment_text) > 0

    comment_indicator = (
        ft.Icon(
            ft.Icons.INSERT_COMMENT,
            size=16,
            color=ft.Colors.TEAL_400,
            tooltip="Ver comentario (Pasa el mouse sobre la tarjeta)",
        )
        if has_comment
        else ft.Container(width=0)
    )

    cat_label = ft.Container()
    if not show_category_label and item.get("category"):
        cat_label = ft.Container(
            content=ft.Text(item["category"], size=10, color=ft.Colors.WHITE),
            bgcolor=ft.Colors.BLUE_GREY_400,
            padding=ft.padding.symmetric(horizontal=6, vertical=2),
            border_radius=10,
            margin=ft.margin.only(bottom=5),
        )

    return ft.Card(
        color=ft.Colors.AMBER_50,
        elevation=1,
        tooltip=comment_text if has_comment else "Sin comentarios adicionales",
        content=ft.Container(
            padding=15,
            on_click=lambda _, t=item: on_edit(t),
            ink=True,
            content=ft.Column(
                [
                    cat_label,
                    ft.Row(
                        [
                            ft.Icon(ft.Icons.NOTE, size=16, color=ft.Colors.AMBER_800),
                            ft.Text(
                                item["title"],
                                weight="bold",
                                size=16,
                                expand=True,
                                color=ft.Colors.BLACK87,
                                max_lines=3,
                                overflow=ft.TextOverflow.ELLIPSIS,
                            ),
                        ],
                        alignment=ft.MainAxisAlignment.START,
                    ),
                    ft.Container(
                        content=ft.Text(
                            comment_text,
                            size=14,
                            color=ft.Colors.BLACK87,
                            max_lines=5,
                            overflow=ft.TextOverflow.ELLIPSIS,
                        ),
                        expand=True,
                    ),
                    ft.Row(
                        [
                            comment_indicator,
                            ft.Container(expand=True),
                            ft.IconButton(
                                icon=ft.Icons.DELETE,
                                icon_size=18,
                                icon_color=ft.Colors.RED_400,
                                tooltip="Borrar",
                                on_click=lambda e, t=item: on_delete(e, t),
                            ),
                        ],
                        alignment=ft.MainAxisAlignment.END,
                    ),
                ]
            ),
        ),
    )


def build_task_card(
    item: dict, on_edit, on_delete, on_toggle, show_category_label: bool
) -> ft.Card:
    is_done = item.get("done", False)
    comment_text = item.get("comment", "").strip()
    has_comment = len(comment_text) > 0

    comment_indicator = (
        ft.Icon(
            ft.Icons.INSERT_COMMENT,
            size=16,
            color=ft.Colors.TEAL_400,
            tooltip="Ver comentario (Pasa el mouse sobre la tarjeta)",
        )
        if has_comment
        else ft.Container(width=0)
    )

    cat_label = ft.Container()
    if not show_category_label and item.get("category"):
        cat_label = ft.Container(
            content=ft.Text(item["category"], size=10, color=ft.Colors.WHITE),
            bgcolor=ft.Colors.BLUE_GREY_400,
            padding=ft.padding.symmetric(horizontal=6, vertical=2),
            border_radius=10,
            margin=ft.margin.only(bottom=5),
        )

    return ft.Card(
        color=ft.Colors.GREEN_50 if is_done else ft.Colors.WHITE,
        elevation=2,
        tooltip=comment_text if has_comment else "Sin comentarios adicionales",
        content=ft.Container(
            padding=15,
            opacity=0.6 if is_done else 1.0,
            on_click=lambda _, t=item: on_edit(t),
            ink=True,
            content=ft.Column(
                [
                    cat_label,
                    ft.Row(
                        [
                            ft.Checkbox(
                                value=is_done,
                                on_change=lambda e, t=item: on_toggle(
                                    t, e.control.value
                                ),
                            ),
                            ft.Text(
                                item["title"],
                                expand=True,
                                max_lines=3,
                                overflow=ft.TextOverflow.ELLIPSIS,
                                style=ft.TextStyle(
                                    size=16,
                                    weight=ft.FontWeight.BOLD,
                                    decoration=ft.TextDecoration.LINE_THROUGH
                                    if is_done
                                    else ft.TextDecoration.NONE,
                                    color=ft.Colors.BLACK87,
                                ),
                            ),
                        ],
                        alignment=ft.MainAxisAlignment.START,
                    ),
                    ft.Container(
                        content=ft.Text(
                            comment_text,
                            size=14,
                            color=ft.Colors.GREY_800,
                            max_lines=3,
                            overflow=ft.TextOverflow.ELLIPSIS,
                        ),
                        expand=True,
                    ),
                    ft.Row(
                        [
                            comment_indicator,
                            ft.Container(expand=True),
                            ft.IconButton(
                                icon=ft.Icons.DELETE,
                                icon_size=18,
                                icon_color=ft.Colors.RED_400,
                                tooltip="Borrar",
                                on_click=lambda e, t=item: on_delete(e, t),
                            ),
                        ],
                        alignment=ft.MainAxisAlignment.END,
                    ),
                ]
            ),
        ),
    )
