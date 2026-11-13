## Mapa compuesto únicamente por notas (esquema 20)

A partir de esta versión, cada **elemento de la jerarquía visual** del mapa
es una nota editable con el mismo editor de título, texto, enlaces, documentos
e imágenes. No existe una pantalla separada de detalles de concepto.

Internamente se conserva `ConceptNode` solo como el registro de geometría,
color, padre y líneas de conexión. El nuevo campo `primary_note_id`
apunta a un registro ordinario de tipo `note` en `__SYSTEM_TASKS__`.

La migración de los mapas anteriores es **automática, estable e idempotente**:
- Para cada elemento antiguo se genera una nota primaria con su mismo título.
- Se mantienen los IDs de la estructura, jerarquías, posiciones, anchuras y colores.
- Se conservan todas las notas previamente vinculadas como tarjetas
  individuales, con sus adjuntos y posiciones personalizadas.
- La migración no copia ni duplica las notas antiguas en los siguientes guardados.
- Al eliminar una nota primaria, desaparece su nodo y los hijos pasan al nivel
  inmediatamente superior, sin borrar su contenido.
- Los elementos nuevos guardan nota y estructura conjuntamente.

El botón `+` superior crea una nota de primer nivel; el botón `+` de una
nota permite crear una nota hija o relacionar una nota existente. Al hacer
clic en un nodo se abre el editor de esa nota; el modo de arrastre y la
reorganización de conexiones siguen disponibles.

**Zoom y enfoque:** `fitContent()` ahora se ejecuta al entrar al mapa
por primera vez o al pulsar **Centrar**. Mover, editar o crear una nota no
recalcula el zoom. Si la ventana cambia de tamaño, se conserva el mismo
punto central del mundo y la misma escala, en lugar de hacer zoom al mapa
completo. Se mantiene `Ctrl + rueda` y `Espacio + arrastrar`.

### Precauciones

- Antes de ejecutar una versión que migre los datos, conservar una copia
  completa de `data.json` y de los respaldos existentes.
- Abrir y comprobar varias notas antiguas tras actualizar. Los campos nuevos
  tienen valores predeterminados seguros.
- El almacenamiento de documentos pequeños continúa usando Data URLs dentro
  del archivo de datos; no cambia en esta actualización.

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
