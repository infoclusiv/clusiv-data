# phase-3 — Agregar cobertura de regresión y verificación final

## Objetivo único

Agregar pruebas focalizadas y una verificación final para asegurar que los comentarios de enlaces se normalizan, persisten y no rompen enlaces antiguos.

## Comportamiento esperado

Después de esta fase debe existir evidencia automatizada o semiautomatizada de que:

- `normalizeLink` conserva `comments` cuando es string.
- `normalizeLink` usa `comments: ""` cuando el enlace antiguo no trae comentarios.
- `normalizeLinks` no descarta enlaces por no tener comentarios.
- Crear/editar enlaces no rompe `title`, `url` ni `images`.
- El backend Rust puede cargar enlaces sin comentarios y guardarlos con comentario vacío o default seguro.

## Archivos/componentes involucrados

Posibles archivos a modificar o crear:

- `src/lib/utils/linkComments.test.mjs` o nombre similar.
- `package.json` para agregar un script de test específico, si se decide crear test Node.
- `src-tauri/src/commands/data.rs` para agregar o ajustar tests Rust relacionados con normalización de enlaces.

No modificar el comportamiento funcional de:

- `src/lib/components/dialogs/LinkDialog.svelte`
- `src/lib/components/cards/LinkCard.svelte`
- `src/lib/views/LinksView.svelte`

## Implementación propuesta

### 1. Agregar test frontend de normalización

Crear un test pequeño siguiendo el estilo de los tests existentes en `src/lib/utils/*.test.mjs`.

Ejemplo conceptual:

```js
import assert from "node:assert/strict";
import { normalizeLink, normalizeLinks } from "./categoryUtils.ts";

function runTest(name, fn) {
  try {
    fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    throw error;
  }
}

runTest("normalizes missing link comments to empty string", () => {
  const link = normalizeLink({ title: "A", url: "https://a.test", images: [] }, 1);
  assert.equal(link.comments, "");
});

runTest("preserves link comments", () => {
  const link = normalizeLink({
    title: "A",
    url: "https://a.test",
    images: [],
    comments: "Contexto importante",
  }, 1);
  assert.equal(link.comments, "Contexto importante");
});

runTest("normalizeLinks keeps legacy links without comments", () => {
  const links = normalizeLinks([{ title: "A", url: "https://a.test", images: [] }]);
  assert.equal(links.length, 1);
  assert.equal(links[0].comments, "");
});
```

Ajustar imports si el loader de alias o TypeScript lo requiere.

### 2. Agregar script en package.json si aplica

Si se crea `src/lib/utils/linkComments.test.mjs`, agregar:

```json
"test:link-comments": "node --experimental-strip-types src/lib/utils/linkComments.test.mjs"
```

Opcionalmente agregarlo a un script agrupado si existe uno adecuado. No modificar scripts no relacionados.

### 3. Agregar o ajustar test Rust

En `src-tauri/src/commands/data.rs`, si es viable, agregar un test en el módulo `tests` que confirme que un enlace sin `comments` se normaliza sin fallar y que el resultado tiene comentario vacío.

Ejemplo conceptual:

```rust
#[test]
fn normalize_data_defaults_missing_link_comments() {
    let raw = json!({
        "__SCHEMA_VERSION__": SCHEMA_VERSION,
        "__SYSTEM_HOME_TEXT__": "Enfoque",
        "__SYSTEM_CATEGORIES__": {
            "general": {
                "id": "general",
                "name": "General",
                "parent_id": null,
                "icon": "Carpeta",
                "links": [
                    {
                        "title": "Example",
                        "url": "https://example.com",
                        "images": []
                    }
                ],
                "notes": ""
            }
        },
        "__SYSTEM_TASKS__": [],
        "__SYSTEM_QUICK_TEXTS__": [],
        "__SYSTEM_QUICK_TEXT_GROUPS__": [],
        "__SYSTEM_FLOWS__": [],
        "__SYSTEM_GLOBAL_FLOW_LINKED_NOTE_IDS__": [],
        "__SYSTEM_GLOBAL_QUICK_TEXT_LINKED_NOTE_IDS__": []
    });

    let (data, _changed) = normalize_data(raw);
    let link = &data.categories.get(GENERAL_CATEGORY_ID).unwrap().links[0];
    assert_eq!(link.comments, "");
}
```

Ajustar si el módulo de tests ya tiene helpers disponibles.

### 4. Ejecutar verificación completa

Comandos sugeridos:

```bash
pnpm check
pnpm run test:link-comments
pnpm build
```

Si se agregó test Rust:

```bash
cd src-tauri
cargo test
```

Si `cargo test` es demasiado amplio o lento, ejecutar al menos el test específico si el entorno lo permite.

## Criterios de éxito

- El test frontend nuevo pasa.
- `pnpm check` pasa.
- `pnpm build` pasa o, si falla por un motivo ajeno al cambio, el fallo se documenta con evidencia clara.
- Si se agrega test Rust, `cargo test` o el test específico pasa.
- Crear/editar enlaces con y sin comentarios funciona manualmente.
- Enlaces antiguos sin comentarios siguen cargando.
- Imágenes de enlaces siguen funcionando.

## Cómo verificar

1. Ejecutar test frontend:

```bash
pnpm run test:link-comments
```

2. Ejecutar checks generales:

```bash
pnpm check
pnpm build
```

3. Ejecutar test Rust si se modificó backend:

```bash
cd src-tauri
cargo test
```

4. Verificación manual en UI:

- Crear enlace con comentario.
- Editar enlace y confirmar comentario.
- Crear enlace sin comentario.
- Editar enlace con imagen y confirmar que imagen y comentario conviven.

## Señales observables de fallo

- Tests fallan porque `normalizeLink` devuelve `comments` como `undefined`.
- Tests fallan porque `normalizeLinks` descarta enlaces legacy.
- `pnpm check` falla por tipos desalineados entre `Link`, `LinkFormInput` y uso real.
- `cargo test` falla porque Rust `Link` no tiene `comments` o porque la normalización no lo construye.
- La app guarda el comentario en frontend pero el archivo persistido lo pierde al pasar por backend.
- Enlaces antiguos con imágenes pierden imágenes después de guardar comentarios.

## Precondiciones antes de implementar

- `phase-1` debe estar completada.
- `phase-2` debe estar completada.
- El campo visual de comentarios debe guardar y recargar correctamente en una prueba manual básica.
- El entorno debe poder ejecutar al menos `pnpm check`.

## Condiciones de parada

Detenerse y reportar antes de continuar si:

- La suite existente ya tiene un patrón de tests diferente y el nuevo test no encaja.
- La configuración actual de Node no permite importar `.ts` como en los scripts existentes.
- `cargo test` falla por problemas preexistentes no relacionados y no es posible aislar el test nuevo.
- Los comentarios persisten en frontend pero se pierden tras reiniciar la app; eso indica que la fase 1 quedó incompleta y se debe volver a revisar backend/persistencia antes de cerrar.

