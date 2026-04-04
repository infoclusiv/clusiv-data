
from core.category_utils import build_category_record, create_default_data, get_item_category_id
from config import GENERAL_CATEGORY_ID, TASKS_KEY

def test_filtering():
    data = create_default_data()
    data["__SYSTEM_CATEGORIES__"]["tts"] = build_category_record(
        "tts",
        "TTS",
        GENERAL_CATEGORY_ID,
        icon="Música",
        category_type="notebook",
    )
    data[TASKS_KEY] = [
        {
            "title": "NaturalReader",
            "comment": "https://chromewebstore.google.com/detail/naturalreader-ai-text-to/...",
            "type": "note",
            "done": False,
            "category_id": "tts",
        }
    ]

    category_id = "tts"
    found_items = []

    if TASKS_KEY in data:
        for item in data[TASKS_KEY]:
            item_category_id = get_item_category_id(item)
            print(
                f"Checking item: {item.get('title')} with category_id: {item_category_id}"
            )
            if item_category_id != category_id:
                print(f"  Discarding: {item_category_id} != {category_id}")
                continue
            found_items.append(item)
            print(f"  Match found!")

    print(f"Found {len(found_items)} items for category_id {category_id}")

if __name__ == "__main__":
    test_filtering()

