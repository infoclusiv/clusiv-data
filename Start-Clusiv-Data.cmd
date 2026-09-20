@echo off
setlocal
cd /d "%~dp0"
pnpm run tauri dev
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Clusiv Data. Revisa el error anterior.
  pause
)
endlocal
