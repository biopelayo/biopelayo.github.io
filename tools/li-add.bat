@echo off
rem Anade una entrada de LinkedIn al carrusel de biopelayo.github.io
rem Uso: li-add.bat [url]  (si no se pasa URL, la pide)
setlocal
set PYTHONIOENCODING=utf-8
set PYTHONUTF8=1
if "%~1"=="" (
  set /p LIURL=URL de LinkedIn:
) else (
  set LIURL=%~1
)
python "%~dp0linkedin_add.py" "%LIURL%" %2 %3 %4 %5 %6 %7 %8 %9
pause
