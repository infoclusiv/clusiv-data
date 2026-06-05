# phase-1 — Ampliar el contrato de datos de Link para comentarios

## Objetivo único

Agregar soporte persistente para un campo opcional de comentarios en cada enlace, sin cambiar todavía la interfaz visual del diálogo.

## Comportamiento esperado

Después de esta fase, el modelo de datos debe aceptar y conservar un campo de texto para comentarios en cada `Link`. Los enlaces existentes que no tengan el campo deben seguir funcionando y normalizarse con comentario vacío.

Nombre recomendado del campo: `comments`.

Razón:

- El usuario habla de “comentarios”.
- En el repositorio ya existen entidades con `comments`, por ejemplo flujos y nodos de flujo en el modelo TypeScript.
- Evita mezclar semánticas con `Item.comment`, que es singular y pertenece a notas/tareas.

Si al revisar el código real aparece una convención más fuerte a favor de `comment`, detenerse y reportarlo antes de implementar.

## Archivos/componentes involucrados

Revisar y modificar solo lo necesario en:

- `src/lib/store/types.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/store/appState.svelte.ts`
- `src-tauri/src/models/category.rs`
- `src-tauri/src/commands/data.rs`
- Posiblemente `src/lib/utils/constants.ts` y `src-tauri/src/models/app_data.rs` solo si se decide incrementar versión de schema.

## Implementación propuesta

### 1. Actualizar tipos frontend

En `src/lib/store/types.ts`:

- Extender `Link`:

```ts
export interface Link {
  title: string;
  url: string;
  images: ItemImage[];
  comments: string;
}
```

- Extender `LinkFormInput`:

```ts
export interface LinkFormInput {
  title: string;
  url: string;
  images?: ItemImage[];
  comments?: string;
}
```

`comments` debe ser requerido en `Link` para que el estado normalizado sea consistente, pero opcional en `LinkFormInput` para no romper llamadas existentes.

### 2. Actualizar normalización frontend

En `src/lib/utils/categoryUtils.ts`, actualizar `normalizeLink` para devolver siempre `comments`:

```ts
comments: typeof candidate.comments === "string" ? candidate.comments : "",
```

Mantener sin cambios la normalización de `title`, `url` e `images`.

### 3. Actualizar estado frontend al agregar/editar

En `src/lib/store/appState.svelte.ts`:

- `addLink` debería seguir usando `normalizeLink(link, 1)`.
- `updateLink` debe calcular `normalizedComments` preservando comentarios existentes cuando `input.comments` no venga definido:

```ts
const normalizedComments = typeof input.comments === "string"
  ? input.comments
  : existingLink?.comments ?? "";
```

- En el objeto actualizado de `category.links.map`, incluir:

```ts
comments: normalizedComments,
```

- En logs, no guardar el texto completo del comentario. Si se agrega contexto, usar algo como:

```ts
commentsLength: normalizedComments.length,
hasComments: normalizedComments.trim().length > 0,
```

No es obligatorio agregar estos campos de logging. Lo importante es no exponer el contenido completo.

### 4. Actualizar modelo Rust

En `src-tauri/src/models/category.rs`, extender `Link`:

```rust
#[serde(default)]
pub comments: String,
```

Debe tener `#[serde(default)]` para que enlaces antiguos sin comentarios carguen sin fallar.

### 5. Actualizar normalización backend

En `src-tauri/src/commands/data.rs`:

- En `link_from_value`, agregar lectura de `comments` con fallback vacío:

```rust
comments: string_value(map.remove("comments"), "", changed),
```

- En el caso de fallback donde el valor no es objeto, construir `Link` con `comments: String::new()`.

- En `links_from_map`, que se usa para migración legacy, agregar `comments: String::new()` o leer `comments` si existe en el legacy map. La opción más segura y conservadora es `String::new()` porque esa ruta parece venir de formatos antiguos.

### 6. Decidir si se incrementa `SCHEMA_VERSION`

Precondición: antes de tocar versión, revisar cómo el repositorio usa `SCHEMA_VERSION`.

Recomendación inicial:

- Si la app ya normaliza enlaces antiguos con `comments: ""` sin necesidad de migración destructiva, no es estrictamente necesario incrementar versión.
- Si el patrón del proyecto exige incrementar versión para cualquier cambio de shape persistido, actualizar ambos lugares de forma consistente:
  - `src/lib/utils/constants.ts`
  - `src-tauri/src/models/app_data.rs`

Detenerse si hay señales de que incrementar versión dispara migraciones no relacionadas.

## Criterios de éxito

- El proyecto compila a nivel de tipos: `pnpm check` no reporta errores por `Link.comments` inexistente.
- Un objeto `Link` normalizado en frontend siempre tiene `comments` como string.
- Un enlace existente sin `comments` no rompe la app y se normaliza con `comments: ""`.
- El backend Rust puede deserializar enlaces antiguos sin `comments` gracias a `#[serde(default)]`.
- Guardar datos no elimina `title`, `url` ni `images`.
- Ningún log nuevo imprime el texto completo del comentario.

## Cómo verificar

1. Ejecutar:

```bash
pnpm check
```

2. Crear mentalmente o con test local un objeto antiguo:

```json
{
  "title": "Ejemplo",
  "url": "https://example.com",
  "images": []
}
```

Debe normalizarse como:

```json
{
  "title": "Ejemplo",
  "url": "https://example.com",
  "images": [],
  "comments": ""
}
```

3. Revisar que `LinkFormInput` siga permitiendo llamadas existentes como:

```ts
addLink(categoryId, { title, url, images })
```

4. Revisar manualmente que no se haya agregado el contenido completo de `comments` a logs.

## Señales observables de fallo

- `pnpm check` falla porque `comments` no existe en `Link` o porque algún objeto `Link` no lo provee.
- La app abre pero enlaces antiguos desaparecen, pierden imágenes o se normalizan como objetos incompletos.
- `save_data` falla al serializar/deserializar por falta de campo en Rust.
- Los comentarios aparecen en logs con el texto completo.
- Se incrementó `SCHEMA_VERSION` solo en TypeScript o solo en Rust, dejando versiones inconsistentes.

## Precondiciones antes de implementar

- Confirmar que el repositorio sigue usando `src/lib/store/types.ts` como fuente principal de tipos frontend.
- Confirmar que el backend sigue serializando `AppData` con structs Rust y no con `serde_json::Value` completo.
- Confirmar que `Link` en Rust está en `src-tauri/src/models/category.rs`.
- Confirmar que `normalizeLink` sigue en `src/lib/utils/categoryUtils.ts`.

## Condiciones de parada

Detenerse y reportar antes de codificar si:

- El modelo `Link` ya tiene un campo para comentarios con otro nombre.
- La app usa otra capa de persistencia no revisada que sobrescribe enlaces.
- Existe una migración de schema obligatoria con reglas no documentadas.
- `SCHEMA_VERSION` controla transformaciones destructivas que podrían afectar datos existentes.
- `LinkDialog.svelte` ya maneja comentarios en una rama distinta del código.

