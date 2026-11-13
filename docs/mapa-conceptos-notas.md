# Tarjetas de notas dentro del mapa de conceptos

Esta actualización muestra las **notas ya vinculadas a conceptos** directamente
como tarjetas conectadas por curvas en el mapa, sin necesidad de entrar
al concepto. Mantiene la vista de detalle anterior para tareas avanzadas.

## Interacciones

- **Arrastrar un concepto:** cambia su posición, sin alterar sus relaciones.
- **Arrastrar una nota por la tarjeta:** mueve la tarjeta; su posición se guarda
  independientemente para cada relación concepto–nota.
- **Arrastrar el conector lateral de una nota hasta un concepto:** cambia la
  relación actual sin duplicar la nota ni modificar sus otros enlaces.
- **Arrastrar el conector lateral de un concepto:** cambia su padre; no se
  admiten ciclos ni relaciones entre categorías distintas.
- **Botón + de un concepto:** menú para nuevo subconcepto, nueva nota, o
  relacionar una nota existente.
- **Clic en título o “Ver nota completa”:** abre un editor amplio encima
  del mapa para texto, enlaces, documentos e imágenes.
- **Espacio + arrastrar / Ctrl + rueda / Centrar:** navegación del lienzo,
  ahora incluyendo el tamaño y la posición de las tarjetas de notas.

## Datos existentes

No se reemplazan los registros `__SYSTEM_TASKS__` ni se crean notas
duplicadas. Las tarjetas se generan a partir de los `linked_note_ids`
ya almacenados en cada `ConceptNode`, incluso cuando sus notas pertenecen
originalmente a otra categoría.

Si un concepto antiguo no tiene `note_positions`, las notas se colocan
automáticamente, conservando los IDs originales; solo se guarda la posición
cuando el usuario arrastra una tarjeta. Las notas relacionadas con más de un
concepto pueden tener una tarjeta independiente por relación.

El esquema pasa de 18 a 19. Se agregan campos opcionales con valores
predeterminados para los datos antiguos:

- En notas: `links` y `documents`, además de `images` ya existente.
- En conceptos: `note_positions`, indexado por el ID de nota.

Al actualizar notas desde la interfaz tradicional, los enlaces y documentos
se conservan aunque ese editor todavía no tenga controles para gestionarlos.
La eliminación de una relación **no elimina** la nota compartida.

## Adjuntos

Los enlaces admiten HTTP y HTTPS. Los documentos e imágenes se guardan
**localmente** en el archivo de datos como Data URL. Se limita la importación
a 8 MB por archivo y aproximadamente 24 MB acumulados por nota, para
proteger la capacidad de respaldo. La exportación utiliza el diálogo local
para guardar archivos.

Estos límites no equivalen a un gestor de archivos grandes; para archivos
de mayor tamaño conviene incorporar referencias externas o almacenamiento
de adjuntos independiente.

## Validación

```powershell
pnpm install --no-frozen-lockfile
pnpm check
pnpm run test:concepts
pnpm run test:concept-notes
pnpm run test:concept-note-links
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
pnpm run tauri dev
```

La ejecución automatizada verifica estructura, migraciones y compilación.
El comportamiento con mouse, diálogos nativos y documentos reales requiere
una prueba interactiva en Windows.
