# README_AGENT — Plan incremental para creación de flujos globales

## Orden de lectura y ejecución

1. Lee este `README_AGENT.md` antes de tocar código.
2. Ejecuta los archivos de fase en orden:
   - `phase-1.md`
   - `phase-2.md`
   - `phase-3.md`
   - `phase-4.md`
3. Implementa solo una fase a la vez.
4. No avances a la siguiente fase hasta que la fase actual esté implementada, verificada y sin señales de fallo abiertas.

## Reglas obligatorias antes de programar cada fase

Antes de escribir código en una fase:

1. Lee el documento completo de la fase correspondiente.
2. Analiza el repositorio real y entiende completamente la arquitectura, flujos de datos y componentes afectados.
3. Valida que la implementación propuesta coincide con la causa raíz real y con el comportamiento actual del código.
4. Si el código real no coincide con este plan, detente y reporta la inconsistencia antes de modificar archivos.

## Reglas obligatorias durante la implementación

Durante cada fase:

1. Sigue estrictamente el alcance definido en el archivo de fase.
2. Evita refactors no relacionados.
3. Evita cambios cosméticos innecesarios.
4. Preserva la funcionalidad existente.
5. Minimiza el riesgo de regresión.
6. Mantén los cambios pequeños, localizados y fáciles de revisar.
7. No mezcles objetivos de fases futuras dentro de la fase actual.

## Reglas obligatorias después de cada fase

Después de implementar una fase:

1. Verifica todos los criterios de éxito definidos en esa fase.
2. Confirma el comportamiento esperado observable.
3. Revisa señales de fallo observables.
4. Ejecuta las verificaciones indicadas en la fase.
5. Reporta cualquier inconsistencia, conflicto arquitectónico, información faltante o señal de que el plan puede ser incorrecto.
6. No continúes con la siguiente fase si queda una duda relevante o una señal de fallo sin resolver.

## Contexto del problema

En la vista global de `Flujos` no existe actualmente una opción directa para crear un flujo nuevo. La experiencia deseada es similar a `Textos Rápidos`: un botón circular flotante en la esquina inferior derecha con símbolo `+`.

Al crear un flujo nuevo desde la vista global, el usuario debe poder:

1. Crear un flujo sin vincularlo a ninguna categoría ni subcategoría.
2. Crear un flujo vinculado a una categoría.
3. Crear un flujo vinculado a una subcategoría.

Esto implica que deben existir flujos con `category_id` nulo o equivalente explícito a “sin categoría”. No se debe simular un flujo sin categoría usando la categoría `General`, porque eso cambia el significado del dato.

## Principios de diseño del cambio

- La vista global de Flujos debe listar todos los flujos, vinculados y no vinculados.
- La vista de una categoría debe listar solo los flujos vinculados a esa categoría específica.
- Un flujo sin categoría debe mostrarse claramente como `Sin categoría` o `Sin vincular`.
- Crear un flujo desde una categoría puede seguir creando el flujo vinculado automáticamente a esa categoría.
- Crear un flujo desde la vista global debe permitir elegir si se vincula o no.
- La persistencia frontend/backend debe preservar explícitamente los flujos no vinculados.

## Fuera de alcance global

No implementes en este paquete de fases:

- Editor completo para cambiar la categoría de un flujo ya existente, salvo que una fase lo pida explícitamente.
- Reestructuración general de modelos de datos no relacionada con flujos.
- Cambios visuales masivos en la app.
- Refactors de navegación no necesarios para soportar flujos sin categoría.
- Cambios en notas, tareas, links o textos rápidos no relacionados con este flujo de creación.
