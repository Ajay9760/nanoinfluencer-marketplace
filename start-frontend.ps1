#!/usr/bin/env powershell

Write-Host "🌐 Starting NanoInfluencer Frontend..." -ForegroundColor Green

# Change to frontend directory
Set-Location "C:\Users\HP\Documents\nanoinfluencer-marketplace\frontend-web"

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing frontend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if .env file exists
if (!(Test-Path ".env")) {
    Write-Host "⚙️ Environment file missing. Please ensure .env exists with correct configuration." -ForegroundColor Red
    exit 1
} else {
    Write-Host "✅ Environment configuration found" -ForegroundColor Green
}

Write-Host "🔧 Starting frontend development server..." -ForegroundColor Blue
Write-Host "Frontend will be available at: http://localhost:3000/nanoinfluencer-marketplace" -ForegroundColor Cyan
Write-Host "Make sure the backend server is running on http://localhost:5000" -ForegroundColor Yellow
Write-Host "" 
Write-Host "Test Login Credentials:" -ForegroundColor Yellow
Write-Host "Email: test@nanoinfluencer.com" -ForegroundColor White
Write-Host "Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

npm start