@echo off
REM Cloud File Storage - One Click Launcher
REM This script starts both backend and frontend servers

title Cloud File Storage
echo.
echo ========================================
echo Starting Cloud File Storage...
echo ========================================
echo.

cd /d "c:\Users\Saksh\Downloads\summer project\sak"

REM Start Backend Server
echo Starting Backend Server...
start "Cloud File Storage - Backend" cmd /k "cd backend && node server.js"

REM Wait for backend to start
timeout /t 2 /nobreak

REM Start Frontend Server
echo Starting Frontend Server...
start "Cloud File Storage - Frontend" cmd /k "cd frontend && node .\node_modules\vite\bin\vite.js"

REM Wait for frontend to start
timeout /t 3 /nobreak

REM Open website in default browser
echo Opening website...
start http://localhost:5173

echo.
echo ========================================
echo All servers started!
echo Website: http://localhost:5173
echo ========================================
echo.
pause
