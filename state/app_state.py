class AppState:
    def __init__(self):
        self.current_category: str | None = None
        self.editing_category_old_name: str | None = None
        self.current_view: str = "category"
        self.editing_item_obj: dict | None = None
        self.current_board_filter: str | None = None
        self.link_to_delete_temp: dict | None = None
        self.item_to_delete_temp: dict | None = None
