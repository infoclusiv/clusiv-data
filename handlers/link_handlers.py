import flet as ft
from state.app_state import AppState
from ui.dialogs import AppDialogs
from core.data_manager import DataManager
from core.category_utils import get_category


class LinkHandlers:
    def __init__(
        self, page, app_data, state: AppState, dialogs: AppDialogs, refresh_callback
    ):
        self.page = page
        self.app_data = app_data
        self.state = state
        self.dialogs = dialogs
        self.refresh_callback = refresh_callback

    def _get_current_category(self) -> dict | None:
        return get_category(self.app_data, self.state.current_category_id)

    def open_add_dialog(self, e):
        self.dialogs.link_title.value = ""
        self.dialogs.link_url.value = ""
        self.page.show_dialog(self.dialogs.dlg_link)
        self.page.update()

    def add(self, e):
        title = self.dialogs.link_title.value.strip()
        url = self.dialogs.link_url.value.strip()
        current_category = self._get_current_category()
        if url and current_category:
            if not title:
                title = url
            if not url.startswith("http"):
                url = "https://" + url
            current_category.setdefault("links", []).append(
                {"title": title, "url": url}
            )
            DataManager.save_data(self.app_data)
            self.page.pop_dialog()
            self.dialogs.link_title.value = ""
            self.dialogs.link_url.value = ""
            self.refresh_callback()
            self.page.update()
        elif not url:
            self.dialogs.link_url.error_text = "URL requerida"
            self.dialogs.link_url.update()

    def request_delete(self, link_obj):
        self.state.link_to_delete_temp = link_obj
        self.page.show_dialog(self.dialogs.dlg_confirm_link)
        self.page.update()

    def confirm_delete(self, e):
        current_category = self._get_current_category()
        if current_category and self.state.link_to_delete_temp:
            try:
                current_category.setdefault("links", []).remove(
                    self.state.link_to_delete_temp
                )
                DataManager.save_data(self.app_data)
            except ValueError:
                pass
        self.state.link_to_delete_temp = None
        self.page.pop_dialog()
        self.refresh_callback()
        self.page.update()

    def open_bulk_dialog(self, e):
        self.dialogs.bulk_input.value = ""
        self.page.show_dialog(self.dialogs.dlg_bulk)
        self.page.update()

    def process_bulk_import(self, e):
        raw_text = self.dialogs.bulk_input.value
        current_category = self._get_current_category()
        if raw_text and current_category:
            for line in raw_text.split("\n"):
                url = line.strip()
                if url:
                    if not url.startswith("http"):
                        url = "https://" + url
                    current_category.setdefault("links", []).append(
                        {"title": url, "url": url}
                    )
            DataManager.save_data(self.app_data)
        self.dialogs.bulk_input.value = ""
        self.page.pop_dialog()
        self.refresh_callback()
        self.page.update()

    def open_link(self, url):
        self.page.launch_url(url)

    def open_all(self, e):
        current_category = self._get_current_category()
        if current_category:
            links = current_category.get("links", [])
            if not links:
                self.show_message("No hay enlaces para abrir.", ft.Colors.ORANGE)
                return
            self.show_message(f"Abriendo {len(links)} enlaces...", ft.Colors.GREEN)
            for link in links:
                self.page.launch_url(link["url"])

    def show_message(self, msg, color=ft.Colors.WHITE):
        snackbar = ft.SnackBar(content=ft.Text(msg, color=color))
        self.page.overlay.append(snackbar)
        snackbar.open = True
        self.page.update()
