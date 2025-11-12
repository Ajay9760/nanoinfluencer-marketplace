#!/usr/bin/env powershell

Write-Host "🚀 Starting NanoInfluencer Backend Server..." -ForegroundColor Green

# Change to backend directory
Set-Location "C:\Users\HP\Documents\nanoinfluencer-marketplace\backend"

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing backend dependencies..." -ForegroundColor Yellow
    npm install
}

# Check if database file exists, create test user if not
if (!(Test-Path "database.sqlite")) {
    Write-Host "🗄️ Setting up database and creating test user..." -ForegroundColor Yellow
    node scripts/create-test-user.js
} else {
    Write-Host "✅ Database already exists" -ForegroundColor Green
}

Write-Host "🔧 Starting backend development server..." -ForegroundColor Blue
Write-Host "Backend will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "API Health Check: http://localhost:5000/api/health" -ForegroundColor Cyan
Write-Host "API Root: http://localhost:5000/api" -ForegroundColor Cyan
Write-Host "" 
Write-Host "Test User Credentials:" -ForegroundColor Yellow
Write-Host "Email: test@nanoinfluencer.com" -ForegroundColor White
Write-Host "Password: password123" -ForegroundColor White
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Red
Write-Host ""

npm run dev