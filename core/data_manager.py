import os
import json
from config import DATA_FILE, TASKS_KEY


class DataManager:
    @staticmethod
    def load_data() -> dict:
        if not os.path.exists(DATA_FILE):
            return {TASKS_KEY: []}
        try:
            with open(DATA_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)
                if TASKS_KEY not in data:
                    data[TASKS_KEY] = []
                return data
        except Exception:
            return {TASKS_KEY: []}

    @staticmethod
    def save_data(data: dict) -> None:
        with open(DATA_FILE, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=4)
