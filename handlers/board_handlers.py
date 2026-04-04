import flet as ft
from state.app_state import AppState
from ui.dialogs import AppDialogs
from core.data_manager import DataManager
from core.category_utils import (
    get_category_breadcrumb,
    get_category_options,
    get_item_category_id,
)
from config import GENERAL_CATEGORY_ID, TASKS_KEY


class BoardHandlers:
    def __init__(
        self, page, app_data, state: AppState, dialogs: AppDialogs, refresh_callback
    ):
        self.page = page
        self.app_data = app_data
        self.state = state
        self.dialogs = dialogs
        self.refresh_callback = refresh_callback

    def _populate_item_categories(self, selected_category_id: str | None) -> None:
        options = []
        available_ids: set[str] = set()
        for category_id, label in get_category_options(self.app_data):
            options.append(ft.dropdown.Option(key=category_id, text=label))
            available_ids.add(category_id)

        self.dialogs.item_category.options = options
        if selected_category_id in available_ids:
            self.dialogs.item_category.value = selected_category_id
        else:
            self.dialogs.item_category.value = GENERAL_CATEGORY_ID

    def open_new_dialog(self, e):
        self.state.editing_item_obj = None
        self.dialogs.dlg_item.title = ft.Text("Nuevo Elemento")
        self.dialogs.item_title.value = ""
        self.dialogs.item_desc.value = ""
        self.dialogs.item_title.error_text = None
        self.dialogs.item_type.value = "task"
        self._populate_item_categories(
            self.state.current_board_filter_id
            or self.state.current_category_id
            or GENERAL_CATEGORY_ID
        )
        self.page.show_dialog(self.dialogs.dlg_item)
        self.page.update()

    def open_quick_note_dialog(self, e):
        self.state.editing_item_obj = None
        current_breadcrumb = get_category_breadcrumb(
            self.app_data,
            self.state.current_category_id,
        )
        self.dialogs.dlg_item.title = ft.Text(
            f"Nueva Nota en '{current_breadcrumb}'"
        )
        self.dialogs.item_title.value = ""
        self.dialogs.item_desc.value = ""
        self.dialogs.item_title.error_text = None
        self.dialogs.item_type.value = "note"
        self._populate_item_categories(self.state.current_category_id or GENERAL_CATEGORY_ID)
        self.page.show_dialog(self.dialogs.dlg_item)
        self.page.update()

    def open_edit_dialog(self, item):
        self.state.editing_item_obj = item
        self.dialogs.dlg_item.title = ft.Text("Editar Elemento")
        self.dialogs.item_title.value = item["title"]
        self.dialogs.item_desc.value = item.get("comment", "")
        self.dialogs.item_type.value = item.get("type", "task")
        current_item_cat = get_item_category_id(item)
        self._populate_item_categories(current_item_cat)
        self.dialogs.item_title.error_text = None
        self.page.show_dialog(self.dialogs.dlg_item)
        self.page.update()

    def save(self, e):
        title = self.dialogs.item_title.value.strip()
        comment = self.dialogs.item_desc.value.strip()
        item_type = self.dialogs.item_type.value
        cat_selection = self.dialogs.item_category.value or GENERAL_CATEGORY_ID

        if not title:
            self.dialogs.item_title.error_text = "El título es obligatorio"
            self.dialogs.item_title.update()
            return

        if self.state.editing_item_obj:
            self.state.editing_item_obj["title"] = title
            self.state.editing_item_obj["comment"] = comment
            self.state.editing_item_obj["type"] = item_type
            self.state.editing_item_obj["category_id"] = cat_selection
            self.state.editing_item_obj.pop("category", None)
        else:
            new_item = {
                "title": title,
                "comment": comment,
                "type": item_type,
                "done": False,
                "category_id": cat_selection,
            }
            if TASKS_KEY not in self.app_data:
                self.app_data[TASKS_KEY] = []
            self.app_data[TASKS_KEY].append(new_item)

        DataManager.save_data(self.app_data)
        self.page.pop_dialog()
        self.refresh_callback()
        self.page.update()

    def request_delete(self, e, item_obj):
        self.state.item_to_delete_temp = item_obj
        self.page.show_dialog(self.dialogs.dlg_confirm_item)
        self.page.update()

    def confirm_delete(self, e):
        if self.state.item_to_delete_temp and TASKS_KEY in self.app_data:
            try:
                self.app_data[TASKS_KEY].remove(self.state.item_to_delete_temp)
                DataManager.save_data(self.app_data)
            except ValueError:
                pass
        self.state.item_to_delete_temp = None
        self.page.pop_dialog()
        self.refresh_callback()
        self.page.update()

    def toggle_task_status(self, task_obj, is_checked):
        task_obj["done"] = is_checked
        DataManager.save_data(self.app_data)
        self.refresh_callback()
        self.page.update()
