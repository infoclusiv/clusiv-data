export const GENERAL_CATEGORY_ID = "general";
export const GENERAL_CATEGORY_NAME = "General";
export const ROOT_CATEGORY_OPTION = "__ROOT_CATEGORY__";
export const SCHEMA_VERSION = 5;

export const ICON_KEYS = [
  "Carpeta",
  "Trabajo",
  "Casa",
  "Escuela",
  "Código",
  "Juegos",
  "Música",
  "Video",
  "Favorito",
  "Dinero",
  "Viajes",
  "Compras",
  "Ideas",
] as const;

export type IconKey = (typeof ICON_KEYS)[number];

export function isIconKey(value: string): value is IconKey {
  return ICON_KEYS.includes(value as IconKey);
}
