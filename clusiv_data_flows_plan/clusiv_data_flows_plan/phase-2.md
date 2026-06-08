# Phase 2 — Crear un diálogo seguro para nuevo flujo con categoría opcional

## Objetivo único

Agregar un componente de creación de flujo que permita definir título y elegir entre `Sin categoría` o una categoría/subcategoría existente antes de crear el flujo.

## Contexto técnico observado

La app ya usa diálogos modales para crear entidades, por ejemplo `QuickTextDialog.svelte`. La sección de Textos Rápidos permite dejar textos sin grupo seleccionando cero grupos. Para Flujos se necesita una experiencia equivalente: el flujo puede quedar sin vínculo o vincularse a una categoría/subcategoría.

Esta fase debe crear la pieza de UI reutilizable, pero no necesariamente integrarla todavía en la vista global con FAB. La integración global se hará en la fase 3.

## Comportamiento esperado

Después de esta fase:

1. Existe un diálogo/componente para crear un flujo nuevo.
2. El diálogo permite ingresar un título.
3. El diálogo permite seleccionar:
   - `Sin categoría` / `Sin vincular`.
   - Cualquier categoría existente.
   - Cualquier subcategoría existente.
4. Si se selecciona `Sin categoría`, el flujo se crea con `categoryId: null`.
5. Si se selecciona una categoría/subcategoría, el flujo se crea con ese `categoryId`.
6. Al crear el flujo exitosamente, se retorna o emite el `flowId` para que la vista padre pueda abrir el editor.
7. Los errores se muestran con `showSnackbar` o el patrón de error usado por los diálogos existentes.

## Criterios de éxito

- Existe un componente dedicado, por ejemplo `src/lib/components/dialogs/FlowCreateDialog.svelte`.
- El componente usa patrones ya existentes de `Modal`, `Input`, `Button`, `Select` o controles nativos consistentes con la app.
- La lista de categorías usa breadcrumbs para evitar confusión entre categorías y subcategorías con nombres similares.
- El selector incluye una opción clara de `Sin categoría`.
- Crear con `Sin categoría` llama a `createFlow({ categoryId: null, ... })`.
- Crear con categoría llama a `createFlow({ categoryId: "cat_xxx", ... })`.
- El diálogo no modifica flujos existentes.
- `pnpm check` pasa.

## Cómo verificar

1. Ejecutar:

   ```bash
   pnpm check
   ```

2. Integrar temporalmente el componente en un entorno local o story/manual test mínimo si todavía no está conectado a `FlowsView`.
3. Abrir el diálogo manualmente desde una vista de prueba o integración temporal.
4. Verificar que el selector muestra:
   - Una opción `Sin categoría`.
   - La categoría `General`.
   - Categorías hijas con breadcrumb, por ejemplo `General / Proyecto / Subproceso`.
5. Crear un flujo con `Sin categoría` y verificar en el estado persistido que `category_id` es `null`.
6. Crear un flujo con una categoría y verificar que `category_id` coincide con esa categoría.
7. Confirmar que el diálogo se cierra correctamente después de guardar.
8. Confirmar que errores de guardado muestran feedback al usuario.

## Señales observables de fallo

- El selector no muestra subcategorías.
- El selector confunde `Sin categoría` con `General`.
- Crear un flujo sin categoría termina guardando `category_id: "general"`.
- El diálogo queda abierto en estado inconsistente después de guardar.
- El flujo se crea pero no se puede abrir por falta de `flowId` retornado/emitted.
- La creación duplica flujos por doble clic o guardado concurrente.
- `pnpm check` falla por tipos de props o eventos Svelte.

## Archivos/componentes involucrados

Crear o modificar:

- `src/lib/components/dialogs/FlowCreateDialog.svelte` o nombre equivalente claro.

Usar/revisar:

- `src/lib/components/dialogs/QuickTextDialog.svelte`
- `src/lib/components/ui/Modal.svelte`
- `src/lib/components/ui/Input.svelte`
- `src/lib/components/ui/Button.svelte`
- `src/lib/components/ui/Select.svelte`
- `src/lib/store/appState.svelte.ts`
- `src/lib/utils/categoryUtils.ts`
- `src/lib/store/types.ts`

## Preconditions antes de implementar

- Phase 1 debe estar implementada y verificada.
- `createFlow` debe aceptar `categoryId: string | null`.
- La normalización debe preservar `category_id: null`.
- Debe existir una función confiable para obtener categorías con breadcrumbs, por ejemplo `getCategoryOptions`.

## Notas de implementación segura

- Mantener la lógica de creación dentro del diálogo o encapsularla con una prop clara `oncreated(flowId)`.
- Proteger contra doble guardado con un estado `saving`.
- No exigir título si la arquitectura actual permite flujos sin título; si se decide exigirlo, validar que eso no rompa flujos existentes.
- Un título por defecto como `Nuevo flujo` es aceptable, pero no debe impedir que el usuario lo cambie luego en el editor.
- No implementar todavía el FAB global en esta fase.

## Stop conditions

Detente y reporta antes de codificar si encuentras cualquiera de estos casos:

- Ya existe un diálogo de creación de flujos oculto o incompleto que debería reutilizarse.
- El componente `Select` existente no permite representar una opción `null` de forma segura.
- El patrón de eventos/props de Svelte en el repo difiere del patrón observado en `QuickTextDialog`.
- `createFlow` tiene efectos de navegación obligatorios que impiden usarlo desde un diálogo reutilizable.

## Fuera de alcance de esta fase

- Agregar el botón flotante a `FlowsView`.
- Cambiar tarjetas de flujo.
- Cambiar el editor visual de flujos.
- Agregar edición posterior de categoría para flujos existentes.
