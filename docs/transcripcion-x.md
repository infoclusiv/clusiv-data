# Transcribir audio desde X.com

La sección **Transcribir audio** tiene dos entradas independientes:

- **Archivo local:** selecciona o arrastra MP3, WAV, M4A, MP4, FLAC u OGG. Usa WhisperX tal como antes.
- **Enlace de X:** pega una URL de publicación de X/Twitter con vídeo y pulsa **Iniciar transcripción**. La app descarga el audio, genera el MP3 con FFmpeg y luego lo transcribe automáticamente usando el mismo WhisperX local.

Ambas opciones permiten seleccionar español, inglés o detección automática. Las transcripciones se guardan en TXT, SRT, VTT, TSV y JSON. Las sesiones con origen X incluyen también el MP3, que se puede exportar desde la sección de resultados.

## Requisitos en Windows

WhisperX debe estar instalado localmente y detectarse desde **Configuración** como antes.

Instalar la descarga y conversión (solo una vez):

```powershell
py -m pip install -U "yt-dlp[default]"
winget install -e --id Gyan.FFmpeg
```

Reinicia Clusiv Data después de instalar FFmpeg para que el PATH se actualice. La aplicación intenta primero `py -m yt_dlp`, luego `python -m yt_dlp` y finalmente `yt-dlp` desde el PATH.

## Comportamiento y limitaciones

- Solo se aceptan enlaces HTTPS a publicaciones `x.com` o `twitter.com`; los parámetros de seguimiento se eliminan antes de la descarga.
- Las herramientas se ejecutan localmente con argumentos individuales y sin PowerShell ni shell intermedio.
- Cada transcripción tiene su propia carpeta bajo los datos de Clusiv Data. En el modo X se conserva el MP3 y se puede acceder a la carpeta pulsando **Abrir resultados**.
- Si X restringe el acceso, el vídeo no contiene una pista descargable o la plataforma cambia su extractor, la descarga puede fallar. Solo se deben descargar contenidos para los que se dispone de permiso.
- Se establece un límite de descarga de 250 MB para el medio de origen; esto no es un límite estricto de consumo total de almacenamiento ni de memoria.
- No se descarga software ni se instala WhisperX automáticamente desde la aplicación.
- No se recopilan cookies ni credenciales del navegador.
- Los registros de yt-dlp y WhisperX se conservan en la carpeta de cada ejecución para diagnóstico.

## Verificación

```powershell
pnpm install
pnpm run check
pnpm run build
cargo test --manifest-path src-tauri/Cargo.toml
```

En la interfaz prueba: (1) un archivo local, (2) un enlace de X con vídeo público, (3) un enlace inválido y (4) una publicación eliminada o privada. Confirma que el resultado de X incluya MP3 y los formatos de texto, y que la exportación y apertura de la carpeta funcionen.

**Nota:** los tests y la descarga real deben verificarse en una máquina Windows con Python, yt-dlp, FFmpeg y WhisperX instalados.
