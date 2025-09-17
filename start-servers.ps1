#!/usr/bin/env pwsh

Write-Host "============================================" -ForegroundColor Green
Write-Host "  NanoInfluencer Marketplace Server Startup" -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green

# Kill any existing Node processes
Write-Host "Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait a moment
Start-Sleep -Seconds 2

Write-Host "Starting Backend Server (Port 3001)..." -ForegroundColor Blue
$backendPath = "C:\Users\HP\Documents\nanoinfluencer-marketplace\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$backendPath'; Write-Host '=== BACKEND RUNNING ON PORT 3001 ===' -ForegroundColor Green; npm start"

# Wait for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 8

Write-Host "Starting Frontend Server (Port 3000)..." -ForegroundColor Blue
$frontendPath = "C:\Users\HP\Documents\nanoinfluencer-marketplace\frontend-web"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; Write-Host '=== FRONTEND RUNNING ON PORT 3000 ===' -ForegroundColor Green; npm start"

Write-Host "Waiting for servers to fully start..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host "" -ForegroundColor White
Write-Host "🚀 Servers should now be running:" -ForegroundColor Green
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "" -ForegroundColor White
Write-Host "Testing connectivity..." -ForegroundColor Yellow

# Test backend
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3001/api/health' -Method GET -TimeoutSec 15
    Write-Host "✅ Backend is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

# Test frontend
try {
    $response = Invoke-WebRequest -Uri 'http://localhost:3000' -Method GET -TimeoutSec 15
    Write-Host "✅ Frontend is responding (Status: $($response.StatusCode))" -ForegroundColor Green
} catch {
    Write-Host "❌ Frontend not responding: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "" -ForegroundColor White
Write-Host "🎉 Setup complete! Open http://localhost:3000 in your browser" -ForegroundColor Green
Write-Host "Press any key to exit..."
Read-Host