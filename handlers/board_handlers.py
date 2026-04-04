import flet as ft
from state.app_state import AppState
from ui.dialogs import AppDialogs
from core.data_manager import DataManager
from config import TASKS_KEY


class BoardHandlers:
    def __init__(
        self, page, app_data, state: AppState, dialogs: AppDialogs, refresh_callback
    ):
        self.page = page
        self.app_data = app_data
        self.state = state
        self.dialogs = dialogs
        self.refresh_callback = refresh_callback

    def open_new_dialog(self, e):
        self.state.editing_item_obj = None
        self.dialogs.dlg_item.title = ft.Text("Nuevo Elemento")
        self.dialogs.item_title.value = ""
        self.dialogs.item_desc.value = ""
        self.dialogs.item_title.error_text = None
        self.dialogs.item_type.value = "task"
        cat_keys = [k for k in self.app_data if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        self.dialogs.item_category.options = options
        self.dialogs.item_category.value = (
            self.state.current_board_filter
            if self.state.current_board_filter
            else "Ninguna (General)"
        )
        self.page.open(self.dialogs.dlg_item)
        self.page.update()

    def open_quick_note_dialog(self, e):
        self.state.editing_item_obj = None
        self.dialogs.dlg_item.title = ft.Text(
            f"Nueva Nota en '{self.state.current_category}'"
        )
        self.dialogs.item_title.value = ""
        self.dialogs.item_desc.value = ""
        self.dialogs.item_title.error_text = None
        self.dialogs.item_type.value = "note"
        cat_keys = [k for k in self.app_data if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        self.dialogs.item_category.options = options
        self.dialogs.item_category.value = self.state.current_category
        self.page.open(self.dialogs.dlg_item)
        self.page.update()

    def open_edit_dialog(self, item):
        self.state.editing_item_obj = item
        self.dialogs.dlg_item.title = ft.Text("Editar Elemento")
        self.dialogs.item_title.value = item["title"]
        self.dialogs.item_desc.value = item.get("comment", "")
        self.dialogs.item_type.value = item.get("type", "task")
        cat_keys = [k for k in self.app_data if k != TASKS_KEY]
        options = [ft.dropdown.Option("Ninguna (General)")]
        for k in cat_keys:
            options.append(ft.dropdown.Option(k))
        self.dialogs.item_category.options = options
        current_item_cat = item.get("category", None)
        self.dialogs.item_category.value = (
            current_item_cat if current_item_cat else "Ninguna (General)"
        )
        self.dialogs.item_title.error_text = None
        self.page.open(self.dialogs.dlg_item)
        self.page.update()

    def save(self, e):
        title = self.dialogs.item_title.value.strip()
        comment = self.dialogs.item_desc.value.strip()
        item_type = self.dialogs.item_type.value
        cat_selection = self.dialogs.item_category.value
        if cat_selection == "Ninguna (General)":
            cat_selection = None

        if not title:
            self.dialogs.item_title.error_text = "El título es obligatorio"
            self.dialogs.item_title.update()
            return

        if self.state.editing_item_obj:
            self.state.editing_item_obj["title"] = title
            self.state.editing_item_obj["comment"] = comment
            self.state.editing_item_obj["type"] = item_type
            self.state.editing_item_obj["category"] = cat_selection
        else:
            new_item = {
                "title": title,
                "comment": comment,
                "type": item_type,
                "done": False,
                "category": cat_selection,
            }
            if TASKS_KEY not in self.app_data:
                self.app_data[TASKS_KEY] = []
            self.app_data[TASKS_KEY].append(new_item)

        DataManager.save_data(self.app_data)
        self.page.close(self.dialogs.dlg_item)
        self.refresh_callback()
        self.page.update()

    def request_delete(self, e, item_obj):
        self.state.item_to_delete_temp = item_obj
        self.page.open(self.dialogs.dlg_confirm_item)
        self.page.update()

    def confirm_delete(self, e):
        if self.state.item_to_delete_temp and TASKS_KEY in self.app_data:
            try:
                self.app_data[TASKS_KEY].remove(self.state.item_to_delete_temp)
                DataManager.save_data(self.app_data)
            except ValueError:
                pass
        self.state.item_to_delete_temp = None
        self.page.close(self.dialogs.dlg_confirm_item)
        self.refresh_callback()
        self.page.update()

    def toggle_task_status(self, task_obj, is_checked):
        task_obj["done"] = is_checked
        DataManager.save_data(self.app_data)
        self.refresh_callback()
        self.page.update()
