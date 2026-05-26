@echo off
title CampusAlerts Platform
echo ============================================
echo    CampusAlerts — Bulk SMS Campaign Platform
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
start "CampusAlerts-Backend" cmd /c "cd /d "%~dp0campusvoice-backend" && call venv\Scripts\activate.bat && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000"

:: Wait a moment for backend to initialize
timeout /t 3 /nobreak >nul

:: Start Frontend (Vite dev server — port auto-increments if 5173 is taken)
echo [2/3] Starting Frontend (Vite)...
start "CampusAlerts-Frontend" cmd /c "cd /d "%~dp0campusvoice-frontend" && npm run dev"

:: Start Celery Worker (processes campaign dispatch tasks)
echo [3/5] Starting Celery Worker...
start "CampusAlerts-Celery-Worker" cmd /c "cd /d "%~dp0campusvoice-backend" && call venv\Scripts\activate.bat && celery -A app.tasks.celery_app worker --loglevel=info --pool=solo"

:: Start Celery Beat (scheduled delivery polling)
echo [4/5] Starting Celery Beat...
start "CampusAlerts-Celery-Beat" cmd /c "cd /d "%~dp0campusvoice-backend" && call venv\Scripts\activate.bat && celery -A app.tasks.celery_app beat --loglevel=info"

echo [5/5] All services starting...
echo.
echo   Backend API     : http://localhost:8000
echo   Frontend        : http://localhost:5173 (or 5174/5175 if taken)
echo   Celery Worker   : Running
echo   Celery Beat     : Running
echo   Redis           : localhost:6379
echo   Health          : http://localhost:8000/api/health
echo.
echo Close this window to leave services running in their own windows.
echo ============================================
pause
