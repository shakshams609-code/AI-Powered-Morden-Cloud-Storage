@echo off
cd /d "%~dp0backend"
start "Backend" cmd /k "npm run dev"
cd /d "%~dp0frontend"
start "Frontend" cmd /k "npm run dev"
