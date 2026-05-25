@echo off
title CampusVoice-Stop
echo ============================================
echo    Stopping CampusVoice Services
echo ============================================
echo.

:: Kill backend process (uvicorn)
taskkill /fi "WindowTitle eq CampusVoice-Backend*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend stopped
) else (
    echo [--] Backend not running
)

:: Kill frontend process (Vite)
taskkill /fi "WindowTitle eq CampusVoice-Frontend*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend stopped
) else (
    echo [--] Frontend not running
)

:: Kill any lingering Python/uvicorn on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| find ":8000"') do (
    taskkill /f /pid %%a >nul 2>&1 && echo [OK] Killed process on port 8000
)
:: Kill any lingering Node/Vite on port 5173
for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| find ":5173"') do (
    taskkill /f /pid %%a >nul 2>&1 && echo [OK] Killed process on port 5173
)

echo.
echo All services stopped.
echo ============================================
pause
