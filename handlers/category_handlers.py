import flet as ft
from state.app_state import AppState
from ui.dialogs import AppDialogs
from core.data_manager import DataManager
from core.category_utils import (
    build_category_record,
    category_has_children,
    generate_category_id,
    get_available_parent_entries,
    get_category,
    get_category_map,
    get_item_category_id,
    is_name_taken_under_parent,
    would_create_cycle,
)
from config import (
    CATEGORY_TYPE_NICHE,
    CATEGORY_TYPE_NOTEBOOK,
    GENERAL_CATEGORY_ID,
    GENERAL_CATEGORY_NAME,
    ROOT_CATEGORY_OPTION,
    TASKS_KEY,
)


class CategoryHandlers:
    def __init__(
        self, page, app_data, state: AppState, dialogs: AppDialogs, refresh_callback
    ):
        self.page = page
        self.app_data = app_data
        self.state = state
        self.dialogs = dialogs
        self.refresh_callback = refresh_callback

    def _show_message(self, msg, color=ft.Colors.WHITE):
        snackbar = ft.SnackBar(content=ft.Text(msg, color=color))
        self.page.overlay.append(snackbar)
        snackbar.open = True
        self.page.update()

    def _reset_dialog_state(self) -> None:
        self.dialogs.cat_type.visible = True
        self.dialogs.cat_type_label.visible = False
        self.dialogs.cat_input.disabled = False
        self.dialogs.cat_parent.disabled = False
        self.dialogs.cat_input.error_text = None
        self.dialogs.cat_parent.error_text = None

    def _populate_parent_options(
        self,
        editing_category_id: str | None = None,
        selected_parent_id: str | None = None,
    ) -> None:
        options = [
            ft.dropdown.Option(
                key=ROOT_CATEGORY_OPTION,
                text="Sin categoría padre (nivel superior)",
            )
        ]
        available_ids = {ROOT_CATEGORY_OPTION}
        for category_id, label in get_available_parent_entries(
            self.app_data,
            editing_category_id,
        ):
            options.append(ft.dropdown.Option(key=category_id, text=label))
            available_ids.add(category_id)

        self.dialogs.cat_parent.options = options
        if selected_parent_id in available_ids:
            self.dialogs.cat_parent.value = selected_parent_id
        else:
            self.dialogs.cat_parent.value = ROOT_CATEGORY_OPTION

    def open_new_dialog(self, e):
        self.state.editing_category_id = None
        self._reset_dialog_state()
        self.dialogs.dlg_category.title = ft.Text("Nueva Categoría")
        self.dialogs.cat_type.value = CATEGORY_TYPE_NICHE
        self.dialogs.cat_input.value = ""
        self.dialogs.cat_input.error_text = None
        self.dialogs.cat_icon.value = "Carpeta"
        self._populate_parent_options(selected_parent_id=self.state.current_category_id)
        self.page.show_dialog(self.dialogs.dlg_category)
        self.page.update()

    def open_edit_dialog(self, e):
        category = get_category(self.app_data, self.state.current_category_id)
        if not category:
            return

        self.state.editing_category_id = self.state.current_category_id
        self._reset_dialog_state()
        self.dialogs.dlg_category.title = ft.Text("Editar Categoría")
        self.dialogs.cat_input.value = category.get("name", "")
        self.dialogs.cat_icon.value = category.get("icon", "Carpeta")
        current_type = category.get("type", CATEGORY_TYPE_NICHE)
        self.dialogs.cat_type.visible = False
        self.dialogs.cat_type_label.visible = True
        type_label = (
            "Nicho (con enlaces)"
            if current_type == CATEGORY_TYPE_NICHE
            else "Bloc de notas"
        )
        self.dialogs.cat_type_label.value = f"Tipo: {type_label} (no editable)"
        self._populate_parent_options(
            editing_category_id=category["id"],
            selected_parent_id=category.get("parent_id") or ROOT_CATEGORY_OPTION,
        )

        is_general_category = category["id"] == GENERAL_CATEGORY_ID
        self.dialogs.cat_input.disabled = is_general_category
        self.dialogs.cat_parent.disabled = is_general_category

        self.page.show_dialog(self.dialogs.dlg_category)
        self.page.update()

    def save(self, e):
        new_name = self.dialogs.cat_input.value.strip()
        selected_icon_key = self.dialogs.cat_icon.value
        selected_parent = self.dialogs.cat_parent.value or ROOT_CATEGORY_OPTION
        parent_id = None if selected_parent == ROOT_CATEGORY_OPTION else selected_parent
        editing_category_id = self.state.editing_category_id

        if editing_category_id == GENERAL_CATEGORY_ID:
            new_name = GENERAL_CATEGORY_NAME
            parent_id = None

        if not new_name:
            self.dialogs.cat_input.error_text = "Requerido"
            self.dialogs.cat_input.update()
            return

        if editing_category_id and would_create_cycle(
            self.app_data,
            editing_category_id,
            parent_id,
        ):
            self.dialogs.cat_parent.error_text = "La categoría padre no es válida"
            self.dialogs.cat_parent.update()
            return

        if is_name_taken_under_parent(
            self.app_data,
            new_name,
            parent_id,
            exclude_category_id=editing_category_id,
        ):
            self.dialogs.cat_input.error_text = "Ya existe dentro de esa categoría padre"
            self.dialogs.cat_input.update()
            return

        categories = get_category_map(self.app_data)
        if editing_category_id:
            data = get_category(self.app_data, editing_category_id)
            if not data:
                return
            data["icon"] = selected_icon_key
            if editing_category_id != GENERAL_CATEGORY_ID:
                data["name"] = new_name
                data["parent_id"] = parent_id
            self.state.current_category_id = editing_category_id
        else:
            new_category_id = generate_category_id(self.app_data)
            categories[new_category_id] = build_category_record(
                new_category_id,
                new_name,
                parent_id,
                icon=selected_icon_key,
                category_type=self.dialogs.cat_type.value,
            )
            self.state.current_category_id = new_category_id

        self._reset_dialog_state()

        DataManager.save_data(self.app_data)
        self.page.pop_dialog()
        self.refresh_callback()
        self.page.update()

    def delete(self, e):
        category = get_category(self.app_data, self.state.current_category_id)
        if not category:
            return

        category_id = category["id"]
        if category_id == GENERAL_CATEGORY_ID:
            self._show_message(
                "La categoría General no se puede eliminar.",
                ft.Colors.ORANGE_200,
            )
            return

        if category_has_children(self.app_data, category_id):
            self._show_message(
                "No puedes borrar una categoría que tiene subcategorías.",
                ft.Colors.ORANGE_200,
            )
            return

        def confirm_delete_cat(e):
            deleted_category_id = category_id
            fallback_category_id = category.get("parent_id") or GENERAL_CATEGORY_ID

            if TASKS_KEY in self.app_data:
                for item in self.app_data[TASKS_KEY]:
                    if get_item_category_id(item) == deleted_category_id:
                        item["category_id"] = GENERAL_CATEGORY_ID

            del get_category_map(self.app_data)[deleted_category_id]

            if self.state.current_board_filter_id == deleted_category_id:
                self.state.current_board_mode = "gallery"
                self.state.current_board_filter_id = None

            DataManager.save_data(self.app_data)
            self.page.pop_dialog()
            if get_category(self.app_data, fallback_category_id):
                self.state.current_category_id = fallback_category_id
            else:
                self.state.current_category_id = GENERAL_CATEGORY_ID
            self.refresh_callback()
            self.page.update()

        dlg_confirm_cat = ft.AlertDialog(
            title=ft.Text("Eliminar Categoría"),
            content=ft.Text(
                "¿Estás seguro? Se borrarán los enlaces de esta categoría y sus notas/tareas pasarán a General."
            ),
            actions=[
                ft.TextButton(
                    "Cancelar", on_click=lambda e: self.page.pop_dialog()
                ),
                ft.TextButton(
                    "Sí, Eliminar",
                    on_click=confirm_delete_cat,
                    style=ft.ButtonStyle(color=ft.Colors.RED),
                ),
            ],
        )
        self.page.show_dialog(dlg_confirm_cat)
        self.page.update()
