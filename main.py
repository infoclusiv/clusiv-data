import flet as ft
import ctypes

from config import TASKS_KEY, CATEGORY_TYPE_NICHE, CATEGORY_TYPE_NOTEBOOK
from core.data_manager import DataManager
from core.backup_manager import BackupManager
from state.app_state import AppState
from ui.dialogs import AppDialogs
from ui.nav_rail import build_nav_rail, refresh_nav_rail
from ui.views.links_view import LinksView
from ui.views.board_view import BoardView
from ui.views.notebook_view import NotebookView
from ui.views.welcome_view import build_welcome_view
from handlers.category_handlers import CategoryHandlers
from handlers.link_handlers import LinkHandlers
from handlers.board_handlers import BoardHandlers


def main(page: ft.Page):
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(
            "clusiv.data.app.v1"
        )
    except Exception:
        pass

    page.title = "Clusiv Data"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 0
    page.window_width = 1100
    page.window_height = 750

    BackupManager.create_backup(manual=False)
    app_data = DataManager.load_data()
    state = AppState()
    dialogs = AppDialogs()

    links_view = LinksView(page)
    board_view = BoardView(page)
    notebook_view = NotebookView(page)
    welcome_view = build_welcome_view()

    def refresh_all():
        refresh_nav_rail(nav_rail, app_data, page)
        if state.current_view == "category" and state.current_category:
            cat_type = app_data.get(state.current_category, {}).get("type", CATEGORY_TYPE_NICHE)
            if cat_type == CATEGORY_TYPE_NOTEBOOK:
                notebook_view.refresh(
                    app_data,
                    state.current_category,
                    board_handlers.open_edit_dialog,
                    board_handlers.request_delete,
                    board_handlers.toggle_task_status,
                )
            else:
                links_view.refresh(
                    app_data,
                    state.current_category,
                    link_handlers.open_link,
                    link_handlers.request_delete,
                )
        elif state.current_view == "board":
            board_view.refresh(
                app_data,
                state.current_board_filter,
                board_handlers.open_edit_dialog,
                board_handlers.request_delete,
                board_handlers.toggle_task_status,
            )

    def show_message(msg, color=ft.Colors.WHITE):
        snackbar = ft.SnackBar(content=ft.Text(msg, color=color))
        page.overlay.append(snackbar)
        snackbar.open = True
        page.update()

    cat_handlers = CategoryHandlers(page, app_data, state, dialogs, refresh_all)
    link_handlers = LinkHandlers(page, app_data, state, dialogs, refresh_all)
    board_handlers = BoardHandlers(page, app_data, state, dialogs, refresh_all)

    link_handlers.show_message = show_message

    nav_rail = build_nav_rail(
        on_change=lambda e: change_category(e.control.selected_index)
    )

    def change_category(index):
        if index is None:
            return
        categories = [k for k in app_data if k != TASKS_KEY]
        if 0 <= index < len(categories):
            state.current_category = categories[index]
            state.current_view = "category"
            cat_type = app_data[state.current_category].get("type", CATEGORY_TYPE_NICHE)
            if cat_type == CATEGORY_TYPE_NOTEBOOK:
                state.current_board_filter = None
                notebook_view.container.visible = True
                links_view.container.visible = False
                board_view.container.visible = False
                welcome_view.visible = False
                page.floating_action_button = fab_add_notebook
                notebook_view.refresh(
                    app_data,
                    state.current_category,
                    board_handlers.open_edit_dialog,
                    board_handlers.request_delete,
                    board_handlers.toggle_task_status,
                )
            else:
                state.current_board_filter = None
                links_view.container.visible = True
                notebook_view.container.visible = False
                board_view.container.visible = False
                welcome_view.visible = False
                page.floating_action_button = fab_add_link
                links_view.lbl_title.value = state.current_category
                links_view.refresh(
                    app_data,
                    state.current_category,
                    link_handlers.open_link,
                    link_handlers.request_delete,
                )
            page.update()

    def switch_to_board_view(e):
        state.current_view = "board"
        state.current_board_filter = None
        nav_rail.selected_index = None
        board_view.refresh(
            app_data,
            state.current_board_filter,
            board_handlers.open_edit_dialog,
            board_handlers.request_delete,
            board_handlers.toggle_task_status,
        )
        links_view.container.visible = False
        board_view.container.visible = True
        welcome_view.visible = False
        page.floating_action_button = fab_add_item
        page.update()

    def open_category_specific_board(e):
        if not state.current_category:
            return
        state.current_view = "board"
        state.current_board_filter = state.current_category
        board_view.refresh(
            app_data,
            state.current_board_filter,
            board_handlers.open_edit_dialog,
            board_handlers.request_delete,
            board_handlers.toggle_task_status,
        )
        links_view.container.visible = False
        board_view.container.visible = True
        welcome_view.visible = False
        page.floating_action_button = fab_add_item
        page.update()

    def clear_view():
        links_view.container.visible = False
        board_view.container.visible = False
        notebook_view.container.visible = False
        welcome_view.visible = True
        page.update()

    def perform_manual_backup(e):
        success, msg = BackupManager.create_backup(manual=True)
        if success:
            show_message("✅ Copia de seguridad creada.")
        else:
            show_message(f"❌ Error: {msg}", ft.Colors.RED_200)

    dialogs.dlg_category.actions[0].on_click = lambda e: page.close(
        dialogs.dlg_category
    )
    dialogs.dlg_category.actions[1].on_click = cat_handlers.save

    dialogs.dlg_link.actions[0].on_click = lambda e: page.close(dialogs.dlg_link)
    dialogs.dlg_link.actions[1].on_click = link_handlers.add

    dialogs.dlg_confirm_link.actions[0].on_click = lambda e: page.close(
        dialogs.dlg_confirm_link
    )
    dialogs.dlg_confirm_link.actions[1].on_click = link_handlers.confirm_delete

    dialogs.dlg_item.actions[0].on_click = lambda e: page.close(dialogs.dlg_item)
    dialogs.dlg_item.actions[1].on_click = board_handlers.save

    dialogs.dlg_confirm_item.actions[0].on_click = lambda e: page.close(
        dialogs.dlg_confirm_item
    )
    dialogs.dlg_confirm_item.actions[1].on_click = board_handlers.confirm_delete

    dialogs.dlg_bulk.actions[0].on_click = lambda e: page.close(dialogs.dlg_bulk)
    dialogs.dlg_bulk.actions[1].on_click = link_handlers.process_bulk_import

    links_view.btn_open_all.on_click = link_handlers.open_all
    links_view.btn_view_notes.on_click = open_category_specific_board
    links_view.btn_import.on_click = link_handlers.open_bulk_dialog
    links_view.btn_edit_cat.on_click = cat_handlers.open_edit_dialog
    links_view.btn_delete_cat.on_click = cat_handlers.delete
    links_view.btn_add_note.on_click = board_handlers.open_quick_note_dialog

    fab_add_link = ft.FloatingActionButton(
        icon=ft.Icons.ADD, text="Agregar Enlace", on_click=link_handlers.open_add_dialog
    )
    fab_add_item = ft.FloatingActionButton(
        icon=ft.Icons.ADD_COMMENT,
        text="Nuevo Ítem",
        on_click=board_handlers.open_new_dialog,
        bgcolor=ft.Colors.TEAL_100,
    )
    fab_add_notebook = ft.FloatingActionButton(
        icon=ft.Icons.ADD,
        text="Nueva Nota/Tarea",
        on_click=board_handlers.open_quick_note_dialog,
        bgcolor=ft.Colors.AMBER_100,
    )

    btn_go_board = ft.Container(
        content=ft.ElevatedButton(
            "Notas y Tareas",
            icon=ft.Icons.CHECKLIST_RTL,
            style=ft.ButtonStyle(
                shape=ft.RoundedRectangleBorder(radius=10),
                color=ft.Colors.TEAL_700,
                bgcolor=ft.Colors.TEAL_50,
            ),
            on_click=switch_to_board_view,
            width=180,
        ),
        padding=ft.padding.only(top=20, bottom=10, left=10, right=10),
    )
    btn_backup = ft.Container(
        content=ft.ElevatedButton(
            "Crear Backup",
            icon=ft.Icons.SAVE_ALT,
            style=ft.ButtonStyle(
                color=ft.Colors.BLUE_GREY_900,
                bgcolor=ft.Colors.BLUE_GREY_50,
                shape=ft.RoundedRectangleBorder(radius=10),
            ),
            on_click=perform_manual_backup,
            width=180,
        ),
        padding=ft.padding.only(top=5, bottom=20, left=10, right=10),
    )
    btn_add_cat = ft.Container(
        content=ft.ElevatedButton(
            "Nueva Categoría",
            icon=ft.Icons.ADD,
            on_click=cat_handlers.open_new_dialog,
            width=180,
        ),
        padding=ft.padding.symmetric(horizontal=10),
    )

    page.add(
        ft.Row(
            [
                ft.Column(
                    [
                        btn_go_board,
                        btn_add_cat,
                        nav_rail,
                        btn_backup,
                    ],
                    width=200,
                    spacing=0,
                ),
                ft.VerticalDivider(width=1),
                links_view.container,
                board_view.container,
                notebook_view.container,
                welcome_view,
            ],
            expand=True,
        )
    )

    refresh_nav_rail(nav_rail, app_data, page)
    categories = [k for k in app_data if k != TASKS_KEY]
    if categories:
        nav_rail.selected_index = 0
        change_category(0)
    else:
        clear_view()


ft.app(target=main, assets_dir="assets")
