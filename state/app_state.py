class AppState:
    def __init__(self):
        self.current_category_id: str | None = None
        self.editing_category_id: str | None = None
        self.current_view: str = "category"
        self.editing_item_obj: dict | None = None
        self.current_board_mode: str = "gallery"
        self.current_board_filter_id: str | None = None
        self.nav_category_ids: list[str] = []
        self.link_to_delete_temp: dict | None = None
        self.item_to_delete_temp: dict | None = None
