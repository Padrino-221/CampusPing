@echo off
title CampusVoice Platform
echo ============================================
echo    CampusVoice — Bulk SMS Campaign Platform
echo ============================================
echo.

:: Check if PostgreSQL is running
sc query PostgreSQL | find "RUNNING" >nul
if %errorlevel% neq 0 (
    echo [WARN] PostgreSQL service is not running. Attempting to start...
    net start PostgreSQL >nul 2>&1
    if %errorlevel% neq 0 (
        echo [FAIL] Could not start PostgreSQL. Please start it manually.
    )
)

:: Start Backend (FastAPI on port 8000)
echo [1/3] Starting FastAPI backend...
start "CampusVoice-Backend" cmd /c "cd /d "%~dp0campusvoice-backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite dev server on port 5173)
echo [2/3] Starting Frontend (Vite)...
start "CampusVoice-Frontend" cmd /c "cd /d "%~dp0campusvoice-frontend" && npm run dev"

echo [3/3] All services starting...
echo.
echo   Backend API : http://localhost:8000
echo   Frontend    : http://localhost:5173
echo   Health      : http://localhost:8000/api/health
echo.
echo Close this window to leave services running in their own windows.
echo ============================================
pause
