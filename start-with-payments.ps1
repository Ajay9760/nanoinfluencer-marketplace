# NanoInfluencer Marketplace with Payment System Startup Script
# This script starts both backend and frontend servers with payment support

Write-Host "🚀 Starting NanoInfluencer Marketplace with Payment System..." -ForegroundColor Green
Write-Host ""

# Check if ports are available
Write-Host "📡 Checking if ports 3001 and 3000 are available..." -ForegroundColor Yellow

$backendPort = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue
$frontendPort = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($backendPort) {
    Write-Host "⚠️  Port 3001 is already in use!" -ForegroundColor Red
    Write-Host "   Please kill the process or choose a different port" -ForegroundColor Red
    exit 1
}

if ($frontendPort) {
    Write-Host "⚠️  Port 3000 is already in use!" -ForegroundColor Red
    Write-Host "   Please kill the process or choose a different port" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Ports are available" -ForegroundColor Green

# Check if node_modules exist
Write-Host "📦 Checking dependencies..." -ForegroundColor Yellow

if (!(Test-Path "backend/node_modules")) {
    Write-Host "⚠️  Backend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location backend
    npm install
    Set-Location ..
}

if (!(Test-Path "frontend-web/node_modules")) {
    Write-Host "⚠️  Frontend dependencies not found. Installing..." -ForegroundColor Yellow
    Set-Location frontend-web
    npm install
    Set-Location ..
}

Write-Host "✅ Dependencies ready" -ForegroundColor Green

# Check environment variables
Write-Host "🔧 Checking environment configuration..." -ForegroundColor Yellow

$backendEnv = Test-Path "backend/.env"
$frontendEnv = Test-Path "frontend-web/.env"

if (!$backendEnv) {
    Write-Host "⚠️  Backend .env file not found!" -ForegroundColor Red
    Write-Host "   Please create backend/.env with your Stripe keys" -ForegroundColor Red
    exit 1
}

if (!$frontendEnv) {
    Write-Host "⚠️  Frontend .env file not found!" -ForegroundColor Red
    Write-Host "   Please create frontend-web/.env with your Stripe publishable key" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Environment files found" -ForegroundColor Green

# Start backend server in new window
Write-Host "🏗️  Starting Backend Server (http://localhost:3001)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PWD/backend'; npm run dev" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start frontend server in new window
Write-Host "🎨 Starting Frontend Server (http://localhost:3000)..." -ForegroundColor Cyan
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "cd '$PWD/frontend-web'; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "🎉 NanoInfluencer Marketplace with Payment System is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 URLs:" -ForegroundColor White
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "   Backend:  http://localhost:3001" -ForegroundColor Cyan
Write-Host "   Health:   http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "   Metrics:  http://localhost:3001/metrics" -ForegroundColor Cyan
Write-Host ""
Write-Host "💳 Payment Features Enabled:" -ForegroundColor White
Write-Host "   ✅ Stripe Integration" -ForegroundColor Green
Write-Host "   ✅ Escrow System" -ForegroundColor Green
Write-Host "   ✅ Fee Calculation" -ForegroundColor Green
Write-Host "   ✅ Payment Security" -ForegroundColor Green
Write-Host ""
Write-Host "🧪 Testing:" -ForegroundColor White
Write-Host "   📖 See PAYMENT-TESTING-GUIDE.md for complete testing instructions" -ForegroundColor Cyan
Write-Host "   🔑 Use Stripe test cards for safe testing" -ForegroundColor Cyan
Write-Host ""
Write-Host "⏰ Servers are starting in separate windows..." -ForegroundColor Yellow
Write-Host "   Please wait 30-60 seconds for full startup" -ForegroundColor Yellow
Write-Host ""
Write-Host "🛑 To stop servers:" -ForegroundColor White
Write-Host "   Close the PowerShell windows or press Ctrl+C in each" -ForegroundColor Gray

# Keep this window open to show the status
Write-Host ""
Write-Host "✨ Startup complete! Both servers are now running." -ForegroundColor Green
Write-Host "Press any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")