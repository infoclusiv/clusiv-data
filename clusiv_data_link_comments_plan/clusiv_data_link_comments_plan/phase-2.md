# phase-2 — Agregar el campo visual de comentarios debajo de imágenes en LinkDialog

## Objetivo único

Agregar en el modal de crear/editar enlace un campo multilinea de comentarios ubicado debajo de la sección actual de imágenes, y conectarlo con `addLink` / `updateLink`.

## Comportamiento esperado

Cuando el usuario abra “Nuevo Enlace” o “Editar Enlace”:

- Debe ver los campos actuales de título y URL.
- Debe ver la sección actual de imágenes sin pérdida de funcionalidad.
- Debajo de la sección de imágenes debe aparecer un campo “Comentarios”.
- En edición, el campo debe cargar los comentarios existentes del enlace.
- Al guardar, el comentario debe persistir en el enlace.
- Al volver a editar el mismo enlace, el comentario debe aparecer nuevamente.
- Si el usuario deja comentarios vacío, se debe guardar como string vacío.

## Archivos/componentes involucrados

Modificar principalmente:

- `src/lib/components/dialogs/LinkDialog.svelte`

Usar componentes existentes:

- `src/lib/components/ui/Input.svelte`

No modificar salvo necesidad real:

- `src/lib/views/LinksView.svelte`
- `src/lib/components/cards/LinkCard.svelte`
- `src/app.css`

## Implementación propuesta

### 1. Agregar estado local para comentarios

En `LinkDialog.svelte`, junto a `linkTitle`, `linkUrl` e `images`, agregar:

```ts
let linkComments = $state("");
```

### 2. Inicializar estado al abrir el modal

En el `$effect` que corre cuando `open` cambia, agregar:

```ts
linkComments = editingLink?.comments ?? "";
```

Debe quedar junto a:

```ts
linkTitle = editingLink?.title ?? "";
linkUrl = editingLink?.url ?? "";
images = editingLink ? [...normalizeItemImages(editingLink.images)] : [];
```

### 3. Guardar comentarios

En `handleSave`, antes de llamar `addLink` o `updateLink`, calcular:

```ts
const normalizedComments = linkComments;
```

No usar `trim()` para el valor guardado salvo que el producto prefiera eliminar espacios al inicio/final. El patrón actual conserva texto en campos multilinea como notas/comentarios, así que lo más seguro es preservar lo escrito.

En `updateLink`, enviar:

```ts
comments: normalizedComments,
```

En `addLink`, enviar:

```ts
comments: normalizedComments,
```

Mantener intacto:

- normalización de URL
- fallback de título a URL
- imágenes serializables
- snackbar de éxito/error
- cierre del modal

### 4. Insertar campo debajo de imágenes

Justo después del cierre de la sección de imágenes y antes del cierre del contenedor principal del modal, insertar:

```svelte
<Input
  label="Comentarios"
  bind:value={linkComments}
  multiline={true}
  rows={4}
  placeholder="Agrega notas o contexto sobre este enlace..."
  disabled={saving}
/>
```

Ubicación esperada:

```svelte
<section>...Imágenes...</section>

<Input ...Comentarios... />
```

El usuario pidió que quede “debajo de la sección de imágenes”, por lo tanto no insertarlo dentro del bloque de imágenes a menos que el diseño real del modal lo exija claramente.

### 5. Mantener accesibilidad básica

`Input.svelte` ya genera `label`, `id` y soporta `textarea`. No crear un textarea manual salvo que el componente existente no funcione.

## Criterios de éxito

- El modal muestra “Comentarios” debajo de “Imágenes”.
- Crear un enlace con comentarios guarda el texto.
- Editar un enlace con comentarios carga el texto existente.
- Actualizar título, URL, imágenes y comentarios no borra ninguno de los otros campos.
- Pegar imágenes con el modal abierto sigue funcionando.
- Seleccionar imágenes desde PC sigue funcionando.
- La vista previa de imagen sigue funcionando.
- El botón “Actualizar” / “Guardar” mantiene su comportamiento actual.
- `pnpm check` no reporta errores de Svelte/TypeScript.

## Cómo verificar

1. Ejecutar:

```bash
pnpm check
pnpm dev
```

2. En la app:

- Abrir una categoría con enlaces.
- Crear un enlace nuevo.
- Agregar título, URL, al menos un comentario y opcionalmente una imagen.
- Guardar.
- Volver a editar el mismo enlace.
- Confirmar que el comentario aparece debajo de imágenes.
- Cambiar solo el comentario y guardar.
- Volver a editar y confirmar que el cambio persiste.

3. Verificación de regresión rápida:

- Crear enlace sin comentario.
- Confirmar que guarda correctamente.
- Editar un enlace con imágenes.
- Confirmar que las imágenes siguen apareciendo y no se borran al guardar comentarios.

## Señales observables de fallo

- El campo aparece encima de imágenes o dentro de una zona visual que rompe la sección de imágenes.
- El comentario se pierde al cerrar y reabrir el modal.
- Guardar comentarios borra imágenes.
- Guardar imágenes borra comentarios.
- `Ctrl+V` de imágenes deja de funcionar en el modal.
- El botón Guardar/Actualizar queda bloqueado sin razón.
- `pnpm check` reporta errores de bind o props en `Input`.

## Precondiciones antes de implementar

- `phase-1` debe estar implementada y verificada.
- `Link.comments` debe existir en los tipos frontend.
- `LinkFormInput.comments` debe estar disponible como opcional.
- `addLink` y `updateLink` deben aceptar y persistir `comments`.
- `Input.svelte` debe seguir soportando `multiline`.

## Condiciones de parada

Detenerse y reportar antes de codificar si:

- `LinkDialog.svelte` fue reemplazado por otro componente o el flujo de edición ya no pasa por este modal.
- El producto necesita comentarios visibles fuera del modal, por ejemplo en `LinkCard`; eso sería nuevo alcance.
- El diseño actual del modal impide agregar el campo debajo de imágenes sin refactor mayor.
- `Input.svelte` ya no soporta multilinea o tiene una API incompatible.

