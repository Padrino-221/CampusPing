@echo off
title CampusAlerts-Stop
echo ============================================
echo    Stopping CampusAlerts Services
echo ============================================
echo.

:: Kill backend process (uvicorn)
taskkill /fi "WindowTitle eq CampusAlerts-Backend*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend stopped
) else (
    echo [--] Backend not running
)

:: Kill frontend process (Vite)
taskkill /fi "WindowTitle eq CampusAlerts-Frontend*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Frontend stopped
) else (
    echo [--] Frontend not running
)

:: Kill Celery worker
taskkill /fi "WindowTitle eq CampusAlerts-Celery-Worker*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Celery Worker stopped
) else (
    echo [--] Celery Worker not running
)

:: Kill Celery beat
taskkill /fi "WindowTitle eq CampusAlerts-Celery-Beat*" /f >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Celery Beat stopped
) else (
    echo [--] Celery Beat not running
)

:: Kill any lingering Python/uvicorn on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| find ":8000"') do (
    taskkill /f /pid %%a >nul 2>&1 && echo [OK] Killed process on port 8000
)
:: Kill any lingering Node/Vite on ports 5173-5179
for %%p in (5173 5174 5175 5176 5177 5178 5179) do (
    for /f "tokens=5" %%a in ('netstat -ano ^| find "LISTENING" ^| find ":%%p"') do (
        taskkill /f /pid %%a >nul 2>&1 && echo [OK] Killed process on %%p
    )
)

echo.
echo All services stopped.
echo ============================================
pause
