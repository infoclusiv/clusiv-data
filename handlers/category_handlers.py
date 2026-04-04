import flet as ft
from state.app_state import AppState
from ui.dialogs import AppDialogs
from core.data_manager import DataManager
from config import TASKS_KEY


class CategoryHandlers:
    def __init__(
        self, page, app_data, state: AppState, dialogs: AppDialogs, refresh_callback
    ):
        self.page = page
        self.app_data = app_data
        self.state = state
        self.dialogs = dialogs
        self.refresh_callback = refresh_callback

    def open_new_dialog(self, e):
        self.state.editing_category_old_name = None
        self.dialogs.dlg_category.title = ft.Text("Nueva Categoría")
        self.dialogs.cat_input.value = ""
        self.dialogs.cat_input.error_text = None
        self.dialogs.cat_icon.value = "Carpeta"
        self.page.open(self.dialogs.dlg_category)
        self.page.update()

    def open_edit_dialog(self, e):
        self.state.editing_category_old_name = self.state.current_category
        self.dialogs.dlg_category.title = ft.Text("Editar Categoría")
        self.dialogs.cat_input.value = self.state.current_category
        self.dialogs.cat_icon.value = self.app_data[self.state.current_category].get(
            "icon", "Carpeta"
        )
        self.page.open(self.dialogs.dlg_category)
        self.page.update()

    def save(self, e):
        new_name = self.dialogs.cat_input.value.strip()
        selected_icon_key = self.dialogs.cat_icon.value
        if not new_name:
            self.dialogs.cat_input.error_text = "Requerido"
            self.dialogs.cat_input.update()
            return

        if self.state.editing_category_old_name:
            if (
                new_name != self.state.editing_category_old_name
                and new_name in self.app_data
            ):
                self.dialogs.cat_input.error_text = "Ya existe"
                self.dialogs.cat_input.update()
                return
            data = self.app_data[self.state.editing_category_old_name]
            data["icon"] = selected_icon_key
            if new_name != self.state.editing_category_old_name:
                self.app_data[new_name] = data
                del self.app_data[self.state.editing_category_old_name]
                if TASKS_KEY in self.app_data:
                    for item in self.app_data[TASKS_KEY]:
                        if item.get("category") == self.state.editing_category_old_name:
                            item["category"] = new_name
                self.state.current_category = new_name
            else:
                self.app_data[self.state.current_category]["icon"] = selected_icon_key
        else:
            if new_name in self.app_data:
                self.dialogs.cat_input.error_text = "Ya existe"
                self.dialogs.cat_input.update()
                return
            self.app_data[new_name] = {"links": [], "icon": selected_icon_key}
            self.state.current_category = new_name

        DataManager.save_data(self.app_data)
        self.page.close(self.dialogs.dlg_category)
        self.refresh_callback()
        self.page.update()

    def delete(self, e):
        if self.state.current_category and self.state.current_category in self.app_data:

            def confirm_delete_cat(e):
                if TASKS_KEY in self.app_data:
                    for item in self.app_data[TASKS_KEY]:
                        if item.get("category") == self.state.current_category:
                            item["category"] = None
                del self.app_data[self.state.current_category]
                DataManager.save_data(self.app_data)
                self.page.close(dlg_confirm_cat)
                keys = [k for k in self.app_data if k != TASKS_KEY]
                if keys:
                    self.state.current_category = keys[0]
                else:
                    self.state.current_category = None
                self.refresh_callback()
                self.page.update()

            dlg_confirm_cat = ft.AlertDialog(
                title=ft.Text("Eliminar Categoría"),
                content=ft.Text(
                    "¿Estás seguro? Se borrarán todos los enlaces de esta categoría."
                ),
                actions=[
                    ft.TextButton(
                        "Cancelar", on_click=lambda e: self.page.close(dlg_confirm_cat)
                    ),
                    ft.TextButton(
                        "Sí, Eliminar",
                        on_click=confirm_delete_cat,
                        style=ft.ButtonStyle(color=ft.Colors.RED),
                    ),
                ],
            )
            self.page.open(dlg_confirm_cat)
            self.page.update()
