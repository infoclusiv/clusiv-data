# README_AGENT — Plan incremental para comentarios en enlaces

## Objetivo

Implementar en el repositorio `clusiv-data` la posibilidad de agregar y editar comentarios asociados a cada enlace. El campo debe vivir dentro del diálogo de crear/editar enlace y debe aparecer debajo de la sección actual de imágenes.

## Contexto arquitectónico observado

Este plan fue preparado después de revisar el repositorio `infoclusiv/clusiv-data` mediante el conector de GitHub.

Hallazgos relevantes:

- El proyecto es una aplicación Svelte 5 + Vite + Tauri. Los comandos principales están en `package.json`: `pnpm dev`, `pnpm build`, `pnpm check` y varios tests Node con `--experimental-strip-types`.
- El estado frontend se centraliza principalmente en `src/lib/store/appState.svelte.ts`.
- La persistencia frontend usa comandos Tauri: `load_data` y `save_data`, invocados desde `loadAppData`, `persistData` y `mutateAppData`.
- El modelo frontend `Link` vive en `src/lib/store/types.ts` y actualmente contiene `title`, `url` e `images`.
- El modelo backend Rust `Link` vive en `src-tauri/src/models/category.rs` y actualmente contiene `title`, `url` e `images`.
- La normalización frontend de enlaces está en `normalizeLink` / `normalizeLinks` dentro de `src/lib/utils/categoryUtils.ts`.
- La normalización backend de enlaces está en `link_from_value` / `links_value` dentro de `src-tauri/src/commands/data.rs`.
- El diálogo visual de enlace está en `src/lib/components/dialogs/LinkDialog.svelte`. Actualmente inicializa `linkTitle`, `linkUrl`, `images`, guarda con `addLink` / `updateLink`, y la sección de imágenes termina antes de cerrar el contenedor principal del diálogo.
- `src/lib/components/ui/Input.svelte` ya soporta `multiline` y `rows`, por lo que no debería ser necesario crear un componente nuevo para comentarios.
- `src/lib/views/LinksView.svelte` abre `LinkDialog` para crear/editar enlaces y pasa `editingLink` / `editingLinkIndex`.
- `src/lib/components/cards/LinkCard.svelte` muestra título, URL y contador de imágenes. Este plan no requiere mostrar el comentario en la tarjeta a menos que se confirme explícitamente como nuevo alcance.

## Instrucciones obligatorias para el agente implementador

1. Lee este `README_AGENT.md` primero.
2. Ejecuta los documentos de fase en orden:
   - `phase-1.md`
   - `phase-2.md`
   - `phase-3.md`
3. Implementa solo una fase a la vez.
4. Antes de programar cada fase:
   - Lee completamente el documento de la fase.
   - Analiza el repositorio y entiende la arquitectura relacionada y los componentes afectados.
   - Valida que la implementación propuesta coincide con la causa real y con el comportamiento actual del código.
5. Durante la implementación:
   - Sigue estrictamente el alcance de la fase.
   - Evita refactors no relacionados.
   - Evita cambios visuales o funcionales innecesarios.
   - Preserva la funcionalidad existente de enlaces, imágenes, categorías, notas, tareas, flujos, backups y navegación.
6. Después de implementar cada fase:
   - Verifica todos los criterios de éxito definidos en el documento de fase.
   - Confirma señales observables y comportamiento esperado.
   - Reporta inconsistencias, conflictos arquitectónicos, información faltante o señales de que el plan podría ser incorrecto antes de continuar.
7. No avances a la siguiente fase hasta que la fase actual esté implementada y verificada.

## Principios de seguridad del cambio

- No cambiar el nombre de `LinkDialog.svelte` ni su contrato público salvo lo indicado.
- No cambiar la semántica de `title`, `url` ni `images`.
- No eliminar soporte para enlaces existentes sin comentarios.
- El comentario debe ser opcional.
- En datos antiguos, enlaces sin comentario deben normalizarse con comentario vacío.
- No registrar el texto completo del comentario en logs. Si se agrega logging, usar solo longitud o booleanos como `hasComments`.
- No introducir una migración destructiva.
- No cambiar el diseño general del modal salvo para insertar el campo de comentarios debajo de imágenes.

## Comandos sugeridos

Usar `pnpm` cuando sea posible:

```bash
pnpm install
pnpm check
pnpm build
```

Si se agregan tests nuevos en `package.json`, ejecutarlos individualmente y luego ejecutar los checks generales disponibles.

