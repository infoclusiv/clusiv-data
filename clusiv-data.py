import flet as ft
import json
import os
import shutil
import ctypes
from datetime import datetime

# --- CONFIGURACIÓN DE RUTAS ---
script_dir = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(script_dir, "data.json")
BACKUP_DIR = os.path.join(script_dir, "backups")

TASKS_KEY = "__SYSTEM_TASKS__"

# --- CONFIGURACIÓN DE ICONOS ---
ICON_MAP = {
    "Carpeta": ft.Icons.FOLDER,
    "Trabajo": ft.Icons.WORK,
    "Casa": ft.Icons.HOME,
    "Escuela": ft.Icons.SCHOOL,
    "Código": ft.Icons.CODE,
    "Juegos": ft.Icons.GAMES,
    "Música": ft.Icons.MUSIC_NOTE,
    "Video": ft.Icons.VIDEO_LIBRARY,
    "Favorito": ft.Icons.STAR,
    "Dinero": ft.Icons.ATTACH_MONEY,
    "Viajes": ft.Icons.FLIGHT,
    "Compras": ft.Icons.SHOPPING_CART,
    "Ideas": ft.Icons.LIGHTBULB,
}


class BackupManager:
    @staticmethod
    def create_backup(manual=False):
        if not os.path.exists(DATA_FILE):
            return False, "No hay datos para respaldar."
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            prefix = "manual_" if manual else "auto_"
            backup_name = f"backup_{prefix}{timestamp}.json"
            backup_path = os.path.join(BACKUP_DIR, backup_name)
            shutil.copy2(DATA_FILE, backup_path)
            BackupManager.cleanup_old_backups()
            return True, f"Backup creado: {backup_name}"
        except Exception as e:
            return False, str(e)

    @staticmethod
    def cleanup_old_backups():
        try:
            files = [
                os.path.join(BACKUP_DIR, f)
                for f in os.listdir(BACKUP_DIR)
                if f.endswith(".json")
            ]
            files.sort(key=os.path.getmtime, reverse=True)
            if len(files) > 5:
                for f in files[5:]:
                    os.remove(f)
        except:
            pass


class DataManager:
    @staticmethod
    def load_data():
        if not os.path.exists(DATA_FILE):
            return {TASKS_KEY: []}
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if TASKS_KEY not in data:
                    data[TASKS_KEY] = []
                return data
        except:
            return {TASKS_KEY: []}

    @staticmethod
    def save_data(data):
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)


def main(page: ft.Page):
    # --- Configuración de la Página ---
    try:
        myappid = "clusiv.data.app.v1"
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(myappid)
    except Exception:
        pass
    # --------------------------------------------------------
    page.title = "Clusiv Data"
    page.window_icon = "clusiv-data.ico"
    page.theme_mode = ft.ThemeMode.LIGHT
    page.padding = 0
    page.window_width = 1100
    page.window_height = 750

    BackupManager.create_backup(manual=False)
    app_data = DataManager.load_data()

    # Variables de estado
    current_category = None
    editing_category_old_name = None
    current_view = "category"
    editing_item_obj = None
    current_board_filter = None

    link_to_delete_temp = None
    item_to_delete_temp = None

    page.snack_bar = ft.SnackBar(content=ft.Text(""))

    def show_message(msg, color=ft.Colors.WHITE):
        page.snack_bar.content.value = msg
        page.snack_bar.content.color = color
        page.snack_bar.open = True
        page.update()

    links_column = ft.Column(spacing=10, scroll=ft.ScrollMode.AUTO)
    lbl_category_title = ft.Text("", size=24, weight="bold", color=ft.Colors.BLACK87)

    # --- UI TABLERO ---
    lbl_board_title = ft.Text(
        "Notas y Tareas", size=24, weight="bold", color=ft.Colors.BLACK87
    )
    lbl_board_subtitle = ft.Text(
        "Organiza tus ideas y pendientes", size=14, color=ft.Colors.GREY_600
    )

    notes_grid = ft.GridView(
        runs_count=5,
        max_extent=300,
        child_aspect_ratio=1.2,
        spacing=15,
        run_spacing=15,
        expand=False,
    )
    tasks_grid = ft.GridView(
        runs_count=5,
        max_extent=300,
        child_aspect_ratio=1.2,
        spacing=15,
        run_spacing=15,
        expand=False,
    )

    nav_rail = ft.NavigationRail(
        selected_index=None,
        label_type=ft.NavigationRailLabelType.ALL,
        min_width=100,
        min_extended_width=200,
        group_alignment=-0.9,
        destinations=[],
        expand=True,
        on_change=lambda e: change_category(e.control.selected_index),
    )

    # --- LÓGICA ---

    def perform_manual_backup(e):
        success, msg = BackupManager.create_backup(manual=True)
        if success:
            show_message("✅ Copia de seguridad creada.")
        else:
            show_message(f"❌ Error: {msg}", ft.Colors.RED_200)

    def save_category_action(e):
        nonlocal current_category
        new_name = dlg_cat_input.value.strip()
        selected_icon_key = dlg_cat_icon.value
        if not new_name:
            dlg_cat_input.error_text = "Requerido"
            dlg_cat_input.update()
            return

        if editing_category_old_name:
            if new_name != editing_category_old_name and new_name in app_data:
                dlg_cat_input.error_text = "Ya existe"
                dlg_cat_input.update()
                return
            data = app_data[editing_category_old_name]
            data["icon"] = selected_icon_key
            if new_name != editing_category_old_name:
                app_data[new_name] = data
                del app_data[editing_category_old_name]
                current_category = new_name
                if TASKS_KEY in app_data:
                    for item in app_data[TASKS_KEY]:
                        if item.get("category") == editing_category_old_name:
                            item["category"] = new_name
            else:
                app_data[current_category]["icon"] = selected_icon_key
        else:
            if new_name in app_data:
                dlg_cat_input.error_text = "Ya existe"
                dlg_cat_input.update()
                return
            app_data[new_name] = {"links": [], "icon": selected_icon_key}
            current_category = new_name

        DataManager.save_data(app_data)
        refresh_nav_rail()
        keys = [k for k in app_data.keys() if k != TASKS_KEY]
        if current_category in keys:
            idx = keys.index(current_category)
            nav_rail.selected_index = idx
            change_category(idx)
        page.close(dlg_category)
        page.update()

    def delete_category(e):
        if current_category and current_category in app_data:

            def confirm_delete_cat(e):
                nonlocal current_category
                if TASKS_KEY in app_data:
                    for item in app_data[TASKS_KEY]:
                        if item.get("category") == current_category:
                            item["category"] = None
                del app_data[current_category]
                DataManager.save_data(app_data)
                refresh_nav_rail()
                page.close(dlg_confirm_cat)
                keys = [k for k in app_data.keys() if k != TASKS_KEY]
                if keys:
                    nav_rail.selected_index = 0
                    change_category(0)
                else:
                    current_category = None
                    clear_view()
                page.update()

            dlg_confirm_cat = ft.AlertDialog(
                title=ft.Text("Eliminar Categoría"),
                content=ft.Text(
                    "¿Estás seguro? Se borrarán todos los enlaces de esta categoría."
                ),
                actions=[
                    ft.TextButton(
                        "Cancelar", on_click=lambda e: page.close(dlg_confirm_cat)
                    ),
                    ft.TextButton(
                        "Sí, Eliminar",
                        on_click=confirm_delete_cat,
                        style=ft.ButtonStyle(color=ft.Colors.RED),
                    ),
                ],
            )
            page.open(dlg_confirm_cat)

    # --- Lógica de Enlaces ---
    def add_link(e):
        title = dlg_link_title.value.strip()
        url = dlg_link_url.value.strip()
        if url and current_category:
            if not title:
                title = url
            if not url.startswith("http"):
                url = "https://" + url
            app_data[current_category]["links"].append({"title": title, "url": url})
            DataManager.save_data(app_data)
            refresh_links_view()
            page.close(dlg_link)
            dlg_link_title.value = ""
            dlg_link_url.value = ""
            page.update()
        elif not url:
            dlg_link_url.error_text = "URL requerida"
            dlg_link_url.update()

    def request_delete_link(link_obj):
        nonlocal link_to_delete_temp
        link_to_delete_temp = link_obj
        page.open(dlg_confirm_link)

    def confirm_delete_link(e):
        nonlocal link_to_delete_temp
        if current_category and link_to_delete_temp:
            try:
                app_data[current_category]["links"].remove(link_to_delete_temp)
                DataManager.save_data(app_data)
                refresh_links_view()
            except ValueError:
                pass
        link_to_delete_temp = None
        page.close(dlg_confirm_link)

    def process_bulk_import(e):
        raw_text = dlg_bulk_input.value
        if raw_text:
            for line in raw_text.split("\n"):
                url = line.strip()
                if url:
                    if not url.startswith("http"):
                        url = "https://" + url
                    app_data[current_category]["links"].append(
                        {"title": url, "url": url}
                    )
            DataManager.save_data(app_data)
            refresh_links_view()
        dlg_bulk_input.value = ""
        page.close(dlg_bulk)
        page.update()

    def open_link(url):
        page.launch_url(url)

    # NUEVA FUNCIÓN: Abrir todos los enlaces de la categoría
    def open_all_category_links(e):
        if current_category and current_category in app_data:
            links = app_data[current_category].get("links", [])
            if not links:
                show_message("No hay enlaces para abrir.", ft.Colors.ORANGE)
                return

            show_message(f"Abriendo {len(links)} enlaces...", ft.Colors.GREEN)
            for link in links:
                page.launch_url(link["url"])

    # --- Lógica de Items (Notas/Tareas) ---
    def save_board_item(e):
        title = dlg_item_title.value.strip()
        comment = dlg_item_desc.value.strip()
        item_type = dlg_item_type.value
        cat_selection = dlg_item_category.value
        if cat_selection == "Ninguna (General)":
            cat_selection = None

        if not title:
            dlg_item_title.error_text = "El título es obligatorio"
            dlg_item_title.update()
            return

        if editing_item_obj:
            editing_item_obj["title"] = title
            editing_item_obj["comment"] = comment
            editing_item_obj["type"] = item_type
            editing_item_obj["category"] = cat_selection
        else:
            new_item = {
                "title": title,
                "comment": comment,
                "type": item_type,
                "done": False,
                "category": cat_selection,
            }
            if TASKS_KEY not in app_data:
                app_data[TASKS_KEY] = []
            app_data[TASKS_KEY].append(new_item)

        DataManager.save_data(app_data)
        refresh_board_view()
        page.close(dlg_item)

        if current_view == "category":
            show_message(f"✅ Nota guardada en '{cat_selection}'")

        page.update()

    def request_delete_board_item(e, item_obj):
        nonlocal item_to_delete_temp
        item_to_delete_temp = item_obj
        page.open(dlg_confirm_item)

    def confirm_delete_board_item(e):
        nonlocal item_to_delete_temp
        if item_to_delete_temp and TASKS_KEY in app_data:
            try:
                app_data[TASKS_KEY].remove(item_to_delete_temp)
                DataManager.save_data(app_data)
                refresh_board_view()
            except ValueError:
                pass
        item_to_delete_temp = None
        page.close(dlg_confirm_item)

    def delete_board_item(item_obj):
        app_data[TASKS_KEY].remove(item_obj)
        DataManager.save_data(app_data)
        refresh_board_view()

    def toggle_task_status(task_obj, is_checked):
        task_obj["done"] = is_checked
        DataManager.save_data(app_data)
        refresh_board_view()

    # --- Renderizado ---

    def refresh_nav_rail():
        nav_rail.destinations.clear()
        categories = [k for k in app_data.keys() if k != TASKS_KEY]
        for cat_name in categories:
            cat_data = app_data[cat_name]
            icon_obj = ICON_MAP.get(cat_data.get("icon", "Carpeta"), ft.Icons.FOLDER)
            nav_rail.destinations.append(
                ft.NavigationRailDestination(
                    icon=icon_obj, selected_icon=icon_obj, label=cat_name
                )
            )
        page.update()

    def refresh_links_view():
        links_column.controls.clear()
        if current_category and current_category in app_data:
            for link in app_data[current_category]["links"]:
                card = ft.Card(
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
                                    on_click=lambda _, u=link["url"]: open_link(u),
                                ),
                                ft.IconButton(
                                    icon=ft.Icons.DELETE_OUTLINE,
                                    icon_color=ft.Colors.RED_600,
                                    tooltip="Borrar",
                                    on_click=lambda _, l=link: request_delete_link(l),
                                ),
                            ],
                            alignment=ft.MainAxisAlignment.SPACE_BETWEEN,
                        ),
                        padding=15,
                        on_click=lambda _, u=link["url"]: open_link(u),
                        ink=True,
                    ),
                )
                links_column.controls.append(card)
        page.update()

    def refresh_board_view():
        notes_grid.controls.clear()
        tasks_grid.controls.clear()

        if current_board_filter:
            lbl_board_title.value = f"Notas de: {current_board_filter}"
            lbl_board_subtitle.value = "Viendo solo elementos de esta categoría"
        else:
            lbl_board_title.value = "Notas y Tareas (General)"
            lbl_board_subtitle.value = "Todas tus notas y pendientes globales"

        if TASKS_KEY in app_data:
            for item in app_data[TASKS_KEY]:
                item_cat = item.get("category", None)
                if current_board_filter and item_cat != current_board_filter:
                    continue

                itype = item.get("type", "task")

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
                if not current_board_filter and item_cat:
                    cat_label = ft.Container(
                        content=ft.Text(item_cat, size=10, color=ft.Colors.WHITE),
                        bgcolor=ft.Colors.BLUE_GREY_400,
                        padding=ft.padding.symmetric(horizontal=6, vertical=2),
                        border_radius=10,
                        margin=ft.margin.only(bottom=5),
                    )

                if itype == "note":
                    card = ft.Card(
                        color=ft.Colors.AMBER_50,
                        elevation=1,
                        tooltip=comment_text
                        if has_comment
                        else "Sin comentarios adicionales",
                        content=ft.Container(
                            padding=15,
                            on_click=lambda _, t=item: open_edit_item_dialog(t),
                            ink=True,
                            content=ft.Column(
                                [
                                    cat_label,
                                    ft.Row(
                                        [
                                            ft.Icon(
                                                ft.Icons.NOTE,
                                                size=16,
                                                color=ft.Colors.AMBER_800,
                                            ),
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
                                                on_click=lambda e,
                                                t=item: request_delete_board_item(e, t),
                                            ),
                                        ],
                                        alignment=ft.MainAxisAlignment.END,
                                    ),
                                ]
                            ),
                        ),
                    )
                    notes_grid.controls.append(card)
                else:
                    is_done = item.get("done", False)
                    card = ft.Card(
                        color=ft.Colors.GREEN_50 if is_done else ft.Colors.WHITE,
                        elevation=2,
                        tooltip=comment_text
                        if has_comment
                        else "Sin comentarios adicionales",
                        content=ft.Container(
                            padding=15,
                            opacity=0.6 if is_done else 1.0,
                            on_click=lambda _, t=item: open_edit_item_dialog(t),
                            ink=True,
                            content=ft.Column(
                                [
                                    cat_label,
                                    ft.Row(
                                        [
                                            ft.Checkbox(
                                                value=is_done,
                                                on_change=lambda e, t=item: (
                                                    toggle_task_status(
                                                        t, e.control.value
                                                    ),
                                                    setattr(
                                                        e, "stop_propagation", True
                                                    ),
                                                )[-1]
                                                if True
                                                else None,
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
                                                on_click=lambda e,
                                                t=item: request_delete_board_item(e, t),
                                            ),
                                        ],
                                        alignment=ft.MainAxisAlignment.END,
                                    ),
                                ]
                            ),
                        ),
                    )
                    tasks_grid.controls.append(card)
        page.update()

    def change_category(index):
        nonlocal current_category, current_view
        if index is None:
            return
        categories = [k for k in app_data.keys() if k != TASKS_KEY]
        if 0 <= index < len(categories):
            current_category = categories[index]
            current_view = "category"
            lbl_category_title.value = current_category
            refresh_links_view()
            main_content_links.visible = True
            main_content_board.visible = False
            welcome_content.visible = False
            page.floating_action_button = fab_add_link
            page.update()

    def switch_to_board_view(e):
        nonlocal current_view, current_board_filter
        current_view = "board"
        current_board_filter = None
        nav_rail.selected_index = None
        refresh_board_view()
        main_content_links.visible = False
        main_content_board.visible = True
        welcome_content.visible = False
        page.floating_action_button = fab_add_item
        page.update()

    def open_category_specific_board(e):
        nonlocal current_view, current_board_filter
        if not current_category:
            return
        current_view = "board"
        current_board_filter = current_category
        refresh_board_view()
        main_content_links.visible = False
        main_content_board.visible = True
        welcome_content.visible = False
        page.floating_action_button = fab_add_item
        page.update()

    def clear_view():
        main_content_links.visible = False
        main_content_board.visible = False
        welcome_content.visible = True
        page.update()

    # --- DIALOGOS ---
    dlg_cat_input = ft.TextField(label="Nombre", autofocus=True)
    dlg_cat_icon = ft.Dropdown(
        label="Icono",
        options=[ft.dropdown.Option(k) for k in ICON_MAP.keys()],
        value="Carpeta",
        expand=True,
    )
    dlg_category = ft.AlertDialog(
        title=ft.Text("Categoría"),
        content=ft.Column([dlg_cat_input, dlg_cat_icon], height=120, tight=True),
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_category)),
            ft.TextButton("Guardar", on_click=save_category_action),
        ],
    )

    dlg_link_title = ft.TextField(label="Título (Opcional)")
    dlg_link_url = ft.TextField(label="URL")
    dlg_link = ft.AlertDialog(
        title=ft.Text("Nuevo Enlace"),
        content=ft.Column([dlg_link_title, dlg_link_url], height=150, tight=True),
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_link)),
            ft.TextButton("Guardar", on_click=add_link),
        ],
    )

    dlg_confirm_link = ft.AlertDialog(
        title=ft.Text("Eliminar Enlace"),
        content=ft.Text("¿Estás seguro de que quieres borrar este enlace?"),
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_confirm_link)),
            ft.TextButton(
                "Sí, borrar",
                on_click=confirm_delete_link,
                style=ft.ButtonStyle(color=ft.Colors.RED),
            ),
        ],
    )

    dlg_confirm_item = ft.AlertDialog(
        title=ft.Text("Eliminar Elemento"),
        content=ft.Text("¿Estás seguro de que quieres borrar esta nota o tarea?"),
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_confirm_item)),
            ft.TextButton(
                "Sí, borrar",
                on_click=confirm_delete_board_item,
                style=ft.ButtonStyle(color=ft.Colors.RED),
            ),
        ],
    )

    dlg_item_title = ft.TextField(label="Título", autofocus=True)
    dlg_item_desc = ft.TextField(
        label="Contenido / Comentario",
        multiline=True,
        min_lines=3,
        max_lines=5,
        text_size=14,
    )
    dlg_item_category = ft.Dropdown(label="Asignar a Categoría", options=[])
    dlg_item_type = ft.RadioGroup(
        content=ft.Row(
            [
                ft.Radio(value="task", label="Tarea"),
                ft.Radio(value="note", label="Nota"),
            ]
        )
    )
    dlg_item = ft.AlertDialog(
        title=ft.Text("Nuevo Elemento"),
        content=ft.Container(
            width=400,
            content=ft.Column(
                [
                    dlg_item_type,
                    ft.Divider(),
                    dlg_item_title,
                    dlg_item_category,
                    dlg_item_desc,
                ],
                tight=True,
                spacing=10,
            ),
        ),
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_item)),
            ft.TextButton("Guardar", on_click=save_board_item),
        ],
    )

    dlg_bulk_input = ft.TextField(label="Lista de URLs", multiline=True, min_lines=10)
    dlg_bulk = ft.AlertDialog(
        title=ft.Text("Importar Enlaces"),
        content=dlg_bulk_input,
        actions=[
            ft.TextButton("Cancelar", on_click=lambda e: page.close(dlg_bulk)),
            ft.TextButton("Procesar", on_click=process_bulk_import),
        ],
    )

    def open_new_cat_dialog(e):
        nonlocal editing_category_old_name
        editing_category_old_name = None
        dlg_category.title = ft.Text("Nueva Categoría")
        dlg_cat_input.value = ""
        dlg_cat_input.error_text = None
        page.open(dlg_category)

    def open_edit_cat_dialog(e):
        nonlocal editing_category_old_name
        editing_category_old_name = current_category
        dlg_category.title = ft.Text("Editar Categoría")
        dlg_cat_input.value = current_category
        dlg_cat_icon.value = app_data[current_category].get("icon", "Carpeta")
        page.open(dlg_category)

    def open_link_dialog(e):
        dlg_link_title.value = ""
        dlg_link_url.value = ""
        page.open(dlg_link)

    def open_bulk_dialog(e):
        dlg_bulk_input.value = ""
        page.open(dlg_bulk)

    def open_new_item_dialog(e):
        nonlocal editing_item_obj
        editing_item_obj = None
        dlg_item.title = ft.Text("Nuevo Elemento")
        dlg_item_title.value = ""
        dlg_item_desc.value = ""
        dlg_item_title.error_text = None
        dlg_item_type.value = "task"
        cat_keys = [k for k in app_data.keys() if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        dlg_item_category.options = options
        dlg_item_category.value = (
            current_board_filter if current_board_filter else "Ninguna (General)"
        )
        page.open(dlg_item)

    def open_quick_note_dialog_from_cat(e):
        nonlocal editing_item_obj
        editing_item_obj = None

        dlg_item.title = ft.Text(f"Nueva Nota en '{current_category}'")
        dlg_item_title.value = ""
        dlg_item_desc.value = ""
        dlg_item_title.error_text = None

        dlg_item_type.value = "note"

        cat_keys = [k for k in app_data.keys() if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        dlg_item_category.options = options

        dlg_item_category.value = current_category

        page.open(dlg_item)

    def open_edit_item_dialog(item):
        nonlocal editing_item_obj
        editing_item_obj = item
        dlg_item.title = ft.Text("Editar Elemento")
        dlg_item_title.value = item["title"]
        dlg_item_desc.value = item.get("comment", "")
        dlg_item_type.value = item.get("type", "task")
        cat_keys = [k for k in app_data.keys() if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        dlg_item_category.options = options
        current_item_cat = item.get("category", None)
        dlg_item_category.value = (
            current_item_cat if current_item_cat else "Ninguna (General)"
        )
        dlg_item_title.error_text = None
        page.open(dlg_item)

    # --- Layout ---

    fab_add_link = ft.FloatingActionButton(
        icon=ft.Icons.ADD, text="Agregar Enlace", on_click=open_link_dialog
    )
    fab_add_item = ft.FloatingActionButton(
        icon=ft.Icons.ADD_COMMENT,
        text="Nuevo Ítem",
        on_click=open_new_item_dialog,
        bgcolor=ft.Colors.TEAL_100,
    )

    btn_view_cat_notes = ft.IconButton(
        icon=ft.Icons.ASSIGNMENT,
        tooltip="Ver Notas y Tareas de esta Categoría",
        icon_color=ft.Colors.AMBER_800,
        icon_size=26,
        on_click=open_category_specific_board,
    )

    btn_add_quick_note = ft.ElevatedButton(
        "Agregar Nota a esta Categoría",
        icon=ft.Icons.NOTE_ADD,
        style=ft.ButtonStyle(
            color=ft.Colors.WHITE,
            bgcolor=ft.Colors.TEAL_700,
            padding=15,
            shape=ft.RoundedRectangleBorder(radius=8),
        ),
        on_click=open_quick_note_dialog_from_cat,
    )

    main_content_links = ft.Container(
        expand=True,
        visible=False,
        padding=20,
        content=ft.Column(
            [
                ft.Row(
                    [
                        lbl_category_title,
                        ft.Container(expand=True),
                        # AQUÍ ESTÁ EL BOTÓN NUEVO:
                        ft.IconButton(
                            icon=ft.Icons.ROCKET_LAUNCH,
                            tooltip="Abrir TODOS los enlaces",
                            icon_color=ft.Colors.GREEN_700,
                            icon_size=26,
                            on_click=open_all_category_links,
                        ),
                        ft.VerticalDivider(width=10),
                        btn_view_cat_notes,
                        ft.VerticalDivider(width=10),
                        ft.IconButton(
                            icon=ft.Icons.UPLOAD_FILE,
                            tooltip="Importar",
                            icon_color=ft.Colors.TEAL_600,
                            on_click=open_bulk_dialog,
                        ),
                        ft.IconButton(
                            icon=ft.Icons.EDIT,
                            tooltip="Editar Categoría",
                            icon_color=ft.Colors.BLUE_GREY_700,
                            on_click=open_edit_cat_dialog,
                        ),
                        ft.IconButton(
                            icon=ft.Icons.DELETE_FOREVER,
                            icon_color=ft.Colors.RED_600,
                            tooltip="Borrar Categoría",
                            on_click=delete_category,
                        ),
                    ]
                ),
                ft.Divider(),
                ft.Text("Enlaces Guardados", size=16, color=ft.Colors.GREY_700),
                ft.Container(content=links_column, expand=True),
                ft.Divider(),
                ft.Container(
                    alignment=ft.alignment.center_left,
                    content=btn_add_quick_note,
                    padding=ft.padding.only(top=10, bottom=20),
                ),
                ft.Container(height=50),
            ]
        ),
    )

    main_content_board = ft.Container(
        expand=True,
        visible=False,
        padding=20,
        content=ft.Column(
            [
                lbl_board_title,
                lbl_board_subtitle,
                ft.Divider(),
                ft.Row(
                    [
                        ft.Icon(ft.Icons.NOTE, color=ft.Colors.AMBER_700),
                        ft.Text("Notas", weight="bold", size=18),
                    ]
                ),
                ft.Container(content=notes_grid, expand=True),
                ft.Divider(),
                ft.Row(
                    [
                        ft.Icon(ft.Icons.CHECK_CIRCLE, color=ft.Colors.GREEN_700),
                        ft.Text("Tareas", weight="bold", size=18),
                    ]
                ),
                ft.Container(content=tasks_grid, expand=True),
            ],
            scroll=ft.ScrollMode.AUTO,
            expand=True,
        ),
    )

    welcome_content = ft.Container(
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
            on_click=open_new_cat_dialog,
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
                        ft.Container(expand=True),
                        btn_backup,
                    ],
                    width=200,
                    spacing=0,
                ),
                ft.VerticalDivider(width=1),
                main_content_links,
                main_content_board,
                welcome_content,
            ],
            expand=True,
        )
    )

    refresh_nav_rail()
    categories = [k for k in app_data.keys() if k != TASKS_KEY]
    if categories:
        nav_rail.selected_index = 0
        change_category(0)
    else:
        clear_view()


ft.app(target=main, assets_dir="assets")
