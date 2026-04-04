
import json
import os

TASKS_KEY = "__SYSTEM_TASKS__"

def test_filtering():
    data = {
        "TTS": {
            "links": [],
            "icon": "Música",
            "type": "notebook"
        },
        "__SYSTEM_TASKS__": [
            {
                "title": "NaturalReader",
                "comment": "https://chromewebstore.google.com/detail/naturalreader-ai-text-to/...",
                "type": "note",
                "done": False,
                "category": "TTS"
            }
        ]
    }
    
    category = "TTS"
    found_items = []
    
    if TASKS_KEY in data:
        for item in data[TASKS_KEY]:
            print(f"Checking item: {item.get('title')} with category: {item.get('category')}")
            if item.get("category") != category:
                print(f"  Discarding: {item.get('category')} != {category}")
                continue
            found_items.append(item)
            print(f"  Match found!")
            
    print(f"Found {len(found_items)} items for category {category}")

if __name__ == "__main__":
    test_filtering()
