# Phase 3 — Agregar FAB global en la vista Flujos

## Objetivo único

Agregar en la vista global `Flujos` un botón circular flotante inferior derecho con símbolo `+`, equivalente al patrón usado en `Textos Rápidos`, para abrir el diálogo de creación de flujo.

## Contexto técnico observado

La vista global `FlowsView.svelte` lista y filtra todos los flujos, pero no tiene acción de creación. La vista `QuickTextsView.svelte` ya usa un botón `class="fab"` en la esquina inferior derecha con un ícono `Plus`. La app también define estilos globales `.fab` y `.fab-button` en `src/app.css`.

Esta fase conecta el diálogo de Phase 2 a la vista global de flujos.

## Comportamiento esperado

Después de esta fase:

1. En la vista global `Flujos` aparece un botón circular flotante inferior derecho con `+`.
2. Al hacer clic en el botón, se abre el diálogo de creación de flujo.
3. El usuario puede crear un flujo sin categoría desde esa vista.
4. El usuario puede crear un flujo vinculado a una categoría/subcategoría desde esa vista.
5. Después de crear el flujo, la app abre el editor de ese flujo.
6. El nuevo flujo aparece en la lista global de flujos.
7. Si el flujo se creó vinculado a una categoría, también aparece en la pestaña Flujos de esa categoría.
8. Si el flujo se creó sin categoría, no aparece en ninguna categoría específica.

## Criterios de éxito

- `FlowsView.svelte` importa y renderiza el diálogo de creación de flujos.
- `FlowsView.svelte` usa un estado local para abrir/cerrar el diálogo.
- El FAB usa el estilo existente `fab` o un componente equivalente ya usado en el repo.
- El FAB tiene `title` y `aria-label` claros, por ejemplo `Crear flujo`.
- El flujo creado se abre con `openFlowEditor(flowId)`.
- La vista global actualiza su lista sin recargar manualmente.
- El empty state de Flujos deja de decir que el flujo solo puede crearse desde una categoría, o se actualiza para mencionar el botón `+`.
- `pnpm check` pasa.

## Cómo verificar

1. Ejecutar:

   ```bash
   pnpm check
   ```

2. Iniciar la app:

   ```bash
   pnpm tauri dev
   ```

3. Ir a la vista global `Flujos` desde el sidebar.
4. Confirmar que el botón circular `+` aparece abajo a la derecha.
5. Clic en `+`.
6. Confirmar que se abre el diálogo de creación.
7. Crear un flujo con `Sin categoría`.
8. Confirmar que se abre el editor de ese flujo.
9. Volver a la vista global de `Flujos`.
10. Confirmar que el flujo aparece listado con etiqueta visual de no vinculado, aunque la etiqueta final puede quedar pulida en Phase 4.
11. Crear otro flujo seleccionando una categoría/subcategoría.
12. Confirmar que aparece en global y en la sección Flujos de la categoría seleccionada.

## Señales observables de fallo

- No aparece el botón `+` en la vista global de Flujos.
- El botón aparece pero no abre nada.
- El diálogo abre pero no permite crear sin categoría.
- Crear un flujo sin categoría lo envía a `General`.
- Después de crear, no se abre el editor.
- El nuevo flujo no aparece en la vista global.
- El botón queda por debajo de otro elemento, no es clicable o se pierde al hacer scroll.
- El botón aparece en vistas donde no corresponde.
- `pnpm check` falla.

## Archivos/componentes involucrados

Modificar:

- `src/lib/views/FlowsView.svelte`

Usar/revisar:

- `src/lib/views/QuickTextsView.svelte`
- `src/lib/components/dialogs/FlowCreateDialog.svelte`
- `src/app.css`
- `src/lib/store/appState.svelte.ts`
- `src/lib/components/flows/FlowCard.svelte`

## Preconditions antes de implementar

- Phase 1 debe estar implementada y verificada.
- Phase 2 debe estar implementada y verificada.
- El diálogo de creación debe poder emitir o devolver el `flowId` creado.
- `openFlowEditor` debe ser seguro para flujos sin categoría.

## Notas de implementación segura

- Replica el patrón visual de `QuickTextsView.svelte` para minimizar riesgo.
- Mantén el estado de apertura/cierre local a `FlowsView.svelte`.
- No cambies el comportamiento de creación desde `CategoryView.svelte` en esta fase, salvo que sea estrictamente necesario por tipos.
- No reemplaces la lista global ni el filtro existente.
- Ajusta solo el texto del empty state si es necesario para reflejar la nueva capacidad.

## Stop conditions

Detente y reporta antes de codificar si encuentras cualquiera de estos casos:

- `FlowsView.svelte` ya fue modificado y tiene otro patrón de creación no contemplado.
- El FAB existente cambió de clase o fue reemplazado por un componente obligatorio.
- El diálogo de Phase 2 no puede integrarse sin cambios mayores.
- La navegación a `flow-editor` depende obligatoriamente de una categoría válida.

## Fuera de alcance de esta fase

- Pulir todos los labels de flujos no vinculados.
- Agregar tests nuevos.
- Implementar edición de categoría en flujos existentes.
- Cambiar el diseño de tarjetas o canvas.
