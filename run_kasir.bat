@echo off
title Ivan Kopdes POS - Web Kasir Minimarket
echo ========================================================
echo  Menjalankan Ivan Kopdes POS Local Server di Port 8080...
echo ========================================================
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
