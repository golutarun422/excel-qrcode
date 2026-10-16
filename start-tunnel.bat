@echo off
title Excel QR Generator - Cloudflare Tunnel
echo ========================================================
echo   Excel QR Generator - Cloudflare Tunnel Launcher
echo ========================================================
echo.

where cloudflared >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [!] Cloudflare Tunnel (cloudflared) is not currently installed or not in PATH.
    echo.
    echo To install it automatically via Windows Package Manager, run:
    echo    winget install --id Cloudflare.cloudflared
    echo.
    echo Or download directly from:
    echo    https://github.com/cloudflare/cloudflared/releases/latest
    echo.
    pause
    exit /b 1
)

echo Starting Cloudflare Tunnel exposing http://localhost:3001 to the internet...
echo.
echo Look for the public URL in the output below:
echo   https://xxxx.trycloudflare.com
echo.
echo Copy that URL into your frontend configuration or Vercel environment variables!
echo.

cloudflared tunnel --url http://localhost:3001
pause
