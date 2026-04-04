import os
import flet as ft

script_dir = os.path.dirname(os.path.abspath(__file__))
DATA_FILE = os.path.join(script_dir, "data.json")
BACKUP_DIR = os.path.join(script_dir, "backups")
TASKS_KEY = "__SYSTEM_TASKS__"

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
