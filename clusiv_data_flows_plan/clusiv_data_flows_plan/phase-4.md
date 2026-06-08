# Phase 4 — Etiquetas, estados vacíos y verificación de regresión para flujos sin categoría

## Objetivo único

Pulir la presentación y verificación de flujos sin categoría para que el usuario vea claramente cuándo un flujo está `Sin categoría` y para asegurar que la funcionalidad existente no se rompe.

## Contexto técnico observado

La vista global `FlowsView.svelte` calcula una etiqueta de categoría con `getFlowCategoryLabel`. Actualmente, cuando no encuentra categoría, devuelve `General`. El editor de flujo también muestra `Categoría: {categoryName}` y actualmente usa `General` como fallback. Con flujos sin categoría, ese fallback puede confundir al usuario y ocultar el nuevo comportamiento.

Esta fase se enfoca en etiquetas, textos de ayuda y verificación final. No debe introducir cambios estructurales grandes.

## Comportamiento esperado

Después de esta fase:

1. Un flujo con `category_id: null` se muestra como `Sin categoría`, `Sin vincular` o etiqueta equivalente clara.
2. Un flujo con categoría válida sigue mostrando el breadcrumb o nombre correcto de la categoría.
3. Un flujo con categoría inválida no debe parecer falsamente vinculado a una categoría inexistente.
4. La búsqueda global de flujos debe poder encontrar flujos sin categoría si el usuario busca por la etiqueta usada, por ejemplo `sin categoría`.
5. El editor de flujo debe mostrar `Categoría: Sin categoría` para flujos no vinculados.
6. La vista de categoría debe seguir mostrando solo flujos vinculados a esa categoría.
7. El estado vacío de la vista global debe indicar que se puede crear un flujo con el botón `+`.

## Criterios de éxito

- `FlowsView.svelte` distingue claramente entre `category_id: null` y categoría válida.
- `FlowEditorView.svelte` muestra una etiqueta clara para flujos no vinculados.
- `FlowCard.svelte` no rompe si recibe `categoryLabel="Sin categoría"` o si no recibe categoría.
- El empty state global de `Flujos` ya no indica que la única forma de crear flujos es desde una categoría.
- `pnpm check` pasa.
- `pnpm run test:flows` pasa.
- Crear un flujo vinculado desde una categoría sigue funcionando como antes.
- Crear un flujo desde global sin categoría funciona y persiste.
- Crear un flujo desde global vinculado a una subcategoría funciona y aparece donde corresponde.

## Cómo verificar

1. Ejecutar:

   ```bash
   pnpm check
   pnpm run test:flows
   ```

2. Manual QA básico:

   - Abrir vista global `Flujos`.
   - Crear flujo `A` sin categoría.
   - Confirmar que `A` aparece en global con etiqueta `Sin categoría`.
   - Abrir `A` y confirmar que el editor dice `Categoría: Sin categoría`.
   - Crear flujo `B` vinculado a una categoría raíz.
   - Confirmar que `B` aparece en global y en la categoría raíz.
   - Crear flujo `C` vinculado a una subcategoría.
   - Confirmar que `C` aparece en global y en esa subcategoría.
   - Confirmar que `A` no aparece dentro de ninguna categoría.
   - Buscar `sin categoría` en la vista global y confirmar que `A` aparece.
   - Reiniciar la app y confirmar que los tres flujos conservan su vínculo correcto.

3. Revisar logs/consola:

   - No debe haber errores por `category_id`, `getCategory`, `expandCategoryPath`, `openFlowEditor` o serialización.

## Señales observables de fallo

- Un flujo sin categoría se muestra como `General`.
- Un flujo sin categoría aparece dentro de la categoría `General`.
- El editor muestra `Categoría: General` para un flujo no vinculado.
- La búsqueda no encuentra flujos sin categoría por su etiqueta.
- Flujos vinculados dejan de aparecer en sus categorías.
- Flujos existentes se migran inesperadamente a `null` o se desvinculan sin intención.
- La app guarda datos pero al reiniciar pierde el vínculo de categoría.
- `pnpm check` o `pnpm run test:flows` falla.

## Archivos/componentes involucrados

Modificar solo si es necesario:

- `src/lib/views/FlowsView.svelte`
- `src/lib/views/FlowEditorView.svelte`
- `src/lib/components/flows/FlowCard.svelte`
- `src/lib/utils/categoryUtils.ts`
- Tests existentes o nuevos relacionados con normalización de flujos.

Revisar:

- `src/lib/views/CategoryView.svelte`
- `src/lib/components/flows/FlowsSection.svelte`
- `src/lib/store/appState.svelte.ts`

## Preconditions antes de implementar

- Phase 1 debe estar implementada y verificada.
- Phase 2 debe estar implementada y verificada.
- Phase 3 debe estar implementada y verificada.
- Deben existir al menos tres casos manuales o de prueba:
  - Flujo sin categoría.
  - Flujo con categoría raíz.
  - Flujo con subcategoría.

## Notas de implementación segura

- Preferir una constante local o helper pequeño para la etiqueta `Sin categoría`, pero no introducir una arquitectura nueva solo para esto.
- No cambiar el orden de listado salvo que sea necesario.
- No tocar el layout del canvas de flujo.
- No cambiar cómo se crean flujos desde una categoría, salvo ajustes mínimos por tipos.
- Si agregas tests, que sean pequeños y enfocados en normalización/listado de flujos sin categoría.

## Stop conditions

Detente y reporta antes de codificar si encuentras cualquiera de estos casos:

- Las tarjetas de flujo ya implementan una etiqueta distinta para categorías nulas.
- La app usa `General` intencionalmente como semántica de “sin categoría” en otros módulos y cambiarlo tendría impacto amplio.
- Los tests existentes no pueden ejecutarse en el entorno y no hay forma de hacer verificación manual razonable.
- Se detecta pérdida de campos de flujo al guardar/recargar que no pertenece directamente a esta tarea pero puede afectar los datos del usuario.

## Fuera de alcance de esta fase

- Agregar edición de categoría en flujos existentes.
- Cambiar el ordenamiento global de flujos.
- Rediseñar `FlowCard`.
- Refactorizar navegación global.
