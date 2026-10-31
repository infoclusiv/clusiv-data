# Etiquetas de notas

- Cada nota tiene un arreglo `tags` en `__SYSTEM_TASKS__`. Las notas anteriores sin el campo pasan a `[]`.
- Se pueden añadir múltiples etiquetas desde los editores. El botón «Etiqueta» de cada tarjeta abre el editor.
- En el editor, «Crear y añadir» selecciona inmediatamente la nueva etiqueta y la muestra en la nota. También se aplican inmediatamente las casillas. «Listo» cierra el desplegable; **Guardar** en el editor persiste los cambios en JSON. Cerrar el editor sin guardar descarta los cambios no guardados. En cambio, el filtro de la lista continúa usando «Aplicar»/«Cancelar».
- Las etiquetas existentes se infieren de las notas (no hay catálogo independiente). Si ninguna nota usa una etiqueta, desaparece de las opciones.
- En Categoría → Notas el filtro es un desplegable con búsqueda, selección múltiple y botón Aplicar. Múltiples etiquetas usan **OR** (coincidencia con cualquiera). El buscador también revisa título, contenido y etiquetas.
- Los filtros se limpian al cambiar de categoría o pulsar «Limpiar filtros».
- Los datos de etiquetas viajan con el JSON de las notas en las copias de seguridad y se normalizan en TypeScript y Rust.
- Comprobar con `pnpm run test:note-tags`, `pnpm run check` y `pnpm run tauri dev`. Probar crear/editar/restaurar notas en Windows.
