@echo off
setlocal enabledelayedexpansion

title Remaining Thermal Life Route Prioritiser Launcher

:: 1. Detect Project Root Directory
set "PROJECT_ROOT=%~dp0"
cd /d "%PROJECT_ROOT%"

echo ========================================
echo Remaining Thermal Life Route Prioritiser
echo ========================================
echo.

:: 2. Robust Python Interpreter Detection
set "PYTHON_EXE="

if exist "%PROJECT_ROOT%pyembed\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%pyembed\python.exe"
) else if exist "%PROJECT_ROOT%backend\.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%backend\.venv\Scripts\python.exe"
) else if exist "%PROJECT_ROOT%.venv\Scripts\python.exe" (
    set "PYTHON_EXE=%PROJECT_ROOT%.venv\Scripts\python.exe"
) else (
    where python >nul 2>&1
    if !errorlevel! equ 0 (
        set "PYTHON_EXE=python"
    ) else (
        where py >nul 2>&1
        if !errorlevel! equ 0 (
            set "PYTHON_EXE=py"
        )
    )
)

if "%PYTHON_EXE%"=="" (
    echo [ERROR] Python interpreter not found!
    echo Please install Python 3.10+ or configure a local Python environment.
    echo Backend failed to start. Check the backend terminal for details.
    echo.
    pause
    exit /b 1
)

echo [OK] Using Python: %PYTHON_EXE%

:: 3. Start Backend Server in a separate window
echo Starting backend...
start "Dairy Prioritiser - Backend (Port 8000)" cmd /k "cd /d "%PROJECT_ROOT%" && "%PYTHON_EXE%" backend\main.py"

:: 4. Start Frontend Server in a separate window
echo Starting frontend...
start "Dairy Prioritiser - Frontend (Port 3000)" cmd /k "cd /d "%PROJECT_ROOT%frontend" && npm run dev"

echo Waiting for services...
ping 127.0.0.1 -n 4 >nul

:: 5. Open Browser
echo Opening dashboard...
start "" "http://localhost:3000"

echo.
echo ========================================
echo Remaining Thermal Life Route Prioritiser
echo ========================================
echo.
echo Backend:
echo http://127.0.0.1:8000
echo.
echo Frontend:
echo http://localhost:3000
echo.
echo The command windows should remain open while the application is running.
echo ========================================
echo.

endlocal
