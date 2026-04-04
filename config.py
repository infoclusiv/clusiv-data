import os
import flet as ft

script_dir = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(script_dir, "data.json")
BACKUP_DIR = os.path.join(script_dir, "backups")
TASKS_KEY = "__SYSTEM_TASKS__"
CATEGORIES_KEY = "__SYSTEM_CATEGORIES__"
SCHEMA_VERSION_KEY = "__SCHEMA_VERSION__"
SCHEMA_VERSION = 2
GENERAL_CATEGORY_ID = "general"
GENERAL_CATEGORY_NAME = "General"
ROOT_CATEGORY_OPTION = "__ROOT_CATEGORY__"
CATEGORY_TYPE_NICHE = "niche"
CATEGORY_TYPE_NOTEBOOK = "notebook"

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
