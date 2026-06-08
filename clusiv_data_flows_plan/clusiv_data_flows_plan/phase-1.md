# Phase 1 — Permitir flujos sin categoría en el modelo y normalización

## Objetivo único

Actualizar el modelo de datos y la normalización para que un flujo pueda tener `category_id` nulo sin que el frontend o backend lo conviertan automáticamente en la categoría `General`.

## Contexto técnico observado

Actualmente el flujo está modelado en TypeScript con `category_id: string` y `CreateFlowInput.categoryId: string`. La normalización de frontend reemplaza valores ausentes o inválidos por `GENERAL_CATEGORY_ID`. El backend Rust también modela `Flow.category_id` como `String` y normaliza valores faltantes/invalidos hacia `GENERAL_CATEGORY_ID`.

Esto impide representar correctamente flujos “sin categoría”. Antes de agregar UI para crear flujos no vinculados, la capa de datos debe soportarlos de forma segura.

## Comportamiento esperado

Después de esta fase:

1. Un flujo puede tener `category_id: null`.
2. Un flujo creado con categoría válida conserva esa categoría.
3. Un flujo creado con `category_id: null` permanece sin categoría después de guardar, recargar y normalizar.
4. La normalización no debe convertir un `null` explícito en `general`.
5. Los flujos con `category_id` string inválido pueden seguir migrándose de forma segura a `general` para compatibilidad legacy, salvo que el análisis del código indique que conviene migrarlos a `null`.
6. La vista por categoría debe seguir mostrando únicamente flujos cuyo `category_id` coincide con la categoría actual.
7. La vista global debe seguir obteniendo todos los flujos mediante `getFlows`.

## Criterios de éxito

- `Flow.category_id` acepta `string | null` en TypeScript.
- `CreateFlowInput.categoryId` acepta `string | null`.
- `UpdateFlowInput.categoryId` puede representar explícitamente `null` si en el futuro se quiere desvincular un flujo.
- `normalizeFlow` preserva `category_id: null` cuando el valor fuente es `null`.
- `normalizeAppData` no reemplaza `null` por `GENERAL_CATEGORY_ID`.
- El backend Rust puede serializar y deserializar `category_id: null` sin fallar.
- `save_data` no pierde ni transforma `category_id: null`.
- `openFlowEditor` no falla al abrir un flujo sin categoría.
- `pnpm check` pasa.
- Las pruebas existentes relacionadas con flujos siguen pasando.

## Cómo verificar

1. Ejecutar:

   ```bash
   pnpm check
   pnpm run test:flows
   ```

2. Crear o modificar temporalmente un `data.json` de prueba con un flujo como:

   ```json
   {
     "id": "flow_test_unlinked",
     "category_id": null,
     "title": "Flujo sin categoría",
     "comments": "",
     "linked_note_ids": [],
     "nodes": [],
     "edges": [],
     "created_at": "2026-01-01T00:00:00.000Z",
     "updated_at": "2026-01-01T00:00:00.000Z"
   }
   ```

3. Iniciar la app en modo desarrollo.
4. Confirmar que el flujo sigue teniendo `category_id: null` después de cargar y guardar.
5. Confirmar que no aparece dentro de una categoría específica.
6. Confirmar que sí aparece en la vista global de Flujos.
7. Abrir el editor de ese flujo y confirmar que no hay errores en consola.

## Señales observables de fallo

- `category_id: null` se convierte automáticamente en `general`.
- `pnpm check` falla por tipos incompatibles en `Flow.category_id`.
- El backend rechaza el archivo JSON al encontrar `category_id: null`.
- La app se queda en pantalla de carga al iniciar.
- La vista global de Flujos no renderiza.
- El editor de flujo falla al abrir un flujo no vinculado.
- La consola muestra errores relacionados con `getCategory`, `expandCategoryPath`, `category_id` o serialización Tauri/Rust.

## Archivos/componentes involucrados

Revisar y modificar solo lo necesario en:

- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/store/appState.svelte.ts`
- `src-tauri/src/models/app_data.rs`
- `src-tauri/src/commands/data.rs`

Revisar sin modificar salvo que sea necesario:

- `src/lib/views/FlowsView.svelte`
- `src/lib/views/FlowEditorView.svelte`
- `src/lib/views/CategoryView.svelte`
- `src/lib/components/flows/FlowCard.svelte`
- Tests existentes bajo `src/lib/**/**.test.mjs`

## Preconditions antes de implementar

- Confirmar que `Flow.category_id` sigue existiendo como campo principal de relación con categorías.
- Confirmar que no existe otra capa de persistencia distinta a `save_data/load_data` que imponga categoría obligatoria.
- Confirmar que el backend sigue usando structs Rust de `src-tauri/src/models/app_data.rs` para deserializar `AppData`.
- Confirmar que `getFlowsForCategory` sigue siendo el único filtro principal para flujos por categoría.

## Notas de implementación segura

- Preferir `category_id: string | null` sobre strings mágicos como `"unlinked"` o `"none"`.
- En Rust, usar `Option<String>` para `Flow.category_id`.
- En funciones de normalización, distinguir entre:
  - `null` explícito = flujo sin categoría, válido.
  - string válido = categoría vinculada, válido.
  - string vacío, missing, tipo incorrecto = legacy o dato corrupto; decidir fallback conservador.
- Evitar cambiar el significado de la categoría `General`.
- No implementar todavía la UI global de creación en esta fase.

## Stop conditions

Detente y reporta antes de codificar si encuentras cualquiera de estos casos:

- El repositorio ya tiene una solución parcial para flujos no vinculados en otra rama o archivo.
- `category_id` está usado como clave obligatoria en una estructura externa no revisada.
- Tauri/Rust no permite cambiar `Flow.category_id` a `Option<String>` sin una migración más amplia.
- La app depende de que todo flujo tenga una categoría para navegación crítica no trivial.
- Se detecta que `comments` o `linked_note_ids` de los flujos ya se están perdiendo en backend y eso bloquea la persistencia segura de esta fase.

## Fuera de alcance de esta fase

- Agregar botón flotante.
- Agregar modal de creación.
- Cambiar el diseño visual de Flujos.
- Agregar edición de categoría en flujos existentes.
