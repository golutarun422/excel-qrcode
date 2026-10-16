@echo off
title Excel QR Generator - Launch All
echo ========================================================
echo   Starting Excel QR Local Backend and Cloudflare Tunnel
echo ========================================================
echo.

start "Excel QR Local Server" cmd /k "start-server.bat"
timeout /t 3 /nobreak >nul
start "Excel QR Cloudflare Tunnel" cmd /k "start-tunnel.bat"

echo Both services launched in separate windows!
echo Keep both windows open while sharing files.
echo.
pause
