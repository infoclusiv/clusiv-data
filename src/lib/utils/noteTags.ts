import type { Item } from "$lib/store/types";

/** Trim, limit and de-duplicate tag names case-insensitively. */
export function normalizeNoteTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result: string[] = [];
  const seen = new Set<string>();
  for (const candidate of value) {
    if (typeof candidate !== "string") continue;
    const tag = candidate.trim().replace(/\s+/g, " ").slice(0, 48);
    const key = tag.toLocaleLowerCase();
    if (!tag || seen.has(key)) continue;
    seen.add(key);
    result.push(tag);
    if (result.length >= 30) break;
  }
  return result;
}

export function getAvailableNoteTags(items: Item[]): string[] {
  return normalizeNoteTags(items
    .filter((item) => item.type === "note")
    .flatMap((item) => item.tags ?? []))
    .sort((a, b) => a.localeCompare(b, "es", { sensitivity: "base" }));
}

/** Multiple selected tags use OR: show notes matching any selected tag. */
export function filterNotesByTags(notes: Item[], selected: string[], search = ""): Item[] {
  const keys = new Set(normalizeNoteTags(selected).map((tag) => tag.toLocaleLowerCase()));
  const term = search.trim().toLocaleLowerCase();
  return notes.filter((note) => {
    const tags = normalizeNoteTags(note.tags);
    const tagMatch = keys.size === 0 || tags.some((tag) => keys.has(tag.toLocaleLowerCase()));
    const queryMatch = !term || [note.title, note.comment, ...tags]
      .some((value) => value.toLocaleLowerCase().includes(term));
    return tagMatch && queryMatch;
  });
}

const TAG_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-sky-100 text-sky-800",
  "bg-orange-100 text-orange-800",
  "bg-slate-200 text-slate-700",
  "bg-rose-100 text-rose-800",
  "bg-teal-100 text-teal-800",
] as const;

export function getNoteTagColor(tag: string): string {
  let hash = 0;
  for (const char of tag.toLocaleLowerCase()) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TAG_COLORS[hash % TAG_COLORS.length];
}
