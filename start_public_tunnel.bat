@echo off
title Ivan Kopdes POS - Public HTTPS Tunnel
color 0b

echo ====================================================================
echo             IVAN KOPDES POS - PUBLIC HTTPS TUNNEL
echo ====================================================================
echo.
echo Menghubungkan port 8080 ke Public HTTPS Tunnel...
echo Link HTTPS publik akan muncul di bawah ini dalam beberapa detik.
echo Bagikan link tersebut ke teman Anda agar bisa dibuka dari HP / luar.
echo.
echo Catatan: 
echo - Pastikan server kasir (run_kasir.bat) tetap menyala.
echo - Jangan tutup jendela ini selama teman Anda mengakses website.
echo ====================================================================
echo.

ssh -p 443 -R0:localhost:8080 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 a.pinggy.io

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [Gagal menghubungkan ke server 1, mencoba server alternatif...]
    echo.
    ssh -R 80:localhost:8080 -o StrictHostKeyChecking=no -o ServerAliveInterval=30 nokey@localhost.run
)

echo.
echo Tunnel telah terputus.
pause
