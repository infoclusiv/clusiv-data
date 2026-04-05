import type { ComponentType } from "svelte";
import {
  BookOpen,
  Briefcase,
  Code2,
  DollarSign,
  Folder,
  Gamepad2,
  GraduationCap,
  Home,
  Lightbulb,
  Music,
  Plane,
  ShoppingCart,
  Star,
  Video,
} from "lucide-svelte";

import type { IconKey } from "$lib/utils/constants";

export const ICON_COMPONENTS: Record<IconKey, ComponentType> = {
  Carpeta: Folder,
  Trabajo: Briefcase,
  Casa: Home,
  Escuela: GraduationCap,
  Código: Code2,
  Juegos: Gamepad2,
  Música: Music,
  Video: Video,
  Favorito: Star,
  Dinero: DollarSign,
  Viajes: Plane,
  Compras: ShoppingCart,
  Ideas: Lightbulb,
};

export function getIcon(key: string): ComponentType {
  return ICON_COMPONENTS[key as IconKey] ?? Folder;
}

export const NOTEBOOK_ICON = BookOpen;