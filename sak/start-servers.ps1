# Cloud File Storage - One Click Launcher
# This script starts both backend and frontend servers

Write-Host "Starting Cloud File Storage..." -ForegroundColor Cyan

$backendPath = "c:\Users\Saksh\Downloads\summer project\sak\backend"
$frontendPath = "c:\Users\Saksh\Downloads\summer project\sak\frontend"

# Start Backend Server in new window
Write-Host "Starting Backend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$backendPath' ; node server.js`""

# Wait a bit for backend to start
Start-Sleep -Seconds 2

# Start Frontend Server in new window
Write-Host "Starting Frontend Server..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$frontendPath' ; node .\node_modules\vite\bin\vite.js`""

# Wait for servers to be ready
Start-Sleep -Seconds 3

# Open browser
Write-Host "Opening website in browser..." -ForegroundColor Cyan
Start-Process "http://localhost:5173"

Write-Host "✓ All servers started successfully!" -ForegroundColor Green
Write-Host "Website: http://localhost:5173" -ForegroundColor Yellow
