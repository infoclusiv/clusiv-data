import os
import shutil
from datetime import datetime
from config import DATA_FILE, BACKUP_DIR


class BackupManager:
    @staticmethod
    def create_backup(manual: bool = False) -> tuple[bool, str]:
        if not os.path.exists(DATA_FILE):
            return False, "No hay datos para respaldar."
        if not os.path.exists(BACKUP_DIR):
            os.makedirs(BACKUP_DIR)
        try:
            timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
            prefix = "manual_" if manual else "auto_"
            backup_name = f"backup_{prefix}{timestamp}.json"
            backup_path = os.path.join(BACKUP_DIR, backup_name)
            shutil.copy2(DATA_FILE, backup_path)
            BackupManager.cleanup_old_backups()
            return True, f"Backup creado: {backup_name}"
        except Exception as e:
            return False, str(e)

    @staticmethod
    def cleanup_old_backups(max_backups: int = 5) -> None:
        try:
            files = [
                os.path.join(BACKUP_DIR, f)
                for f in os.listdir(BACKUP_DIR)
                if f.endswith(".json")
            ]
            files.sort(key=os.path.getmtime, reverse=True)
            if len(files) > max_backups:
                for f in files[max_backups:]:
                    os.remove(f)
        except Exception:
            pass
