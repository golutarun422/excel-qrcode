@echo off
title Excel QR Generator - Local Storage Backend Server
echo ========================================================
echo   Excel QR Generator - Local Storage Server
echo ========================================================
echo.
echo Starting backend server on http://localhost:3001 ...
echo Storage directory: C:\ExcelQRStorage\files
echo SQLite database:   C:\ExcelQRStorage\excel_qr.db
echo.

node server/src/index.js
pause
