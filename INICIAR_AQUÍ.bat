@echo off
title Iniciando Vimeo Downloader Pro...
echo ==========================================
echo    VIMEO DOWNLOADER PRO - PORTABLE
echo ==========================================
echo.
echo Iniciando el servidor...
echo NO CIERRES ESTA VENTANA mientras uses la extension.
echo.
if exist "VimeoDownloader.exe" (
    VimeoDownloader.exe
) else (
    echo [ERROR] No se encuentra VimeoDownloader.exe
    echo Asegurate de haber descomprimido todo el contenido del ZIP.
    pause
)
pause
