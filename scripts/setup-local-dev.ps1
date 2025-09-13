# Local Development Environment Setup Script for Windows
# This script sets up your local development environment for testing

Write-Host "🚀 Setting up NanoInfluencer Marketplace - Local Development" -ForegroundColor Green

# Check if Docker Desktop is running
function Test-DockerRunning {
    try {
        $dockerInfo = docker info 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Docker is running" -ForegroundColor Green
            return $true
        } else {
            Write-Host "❌ Docker is not running" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "❌ Docker is not installed or not accessible" -ForegroundColor Red
        return $false
    }
}

# Check Docker status
Write-Host "`n🐳 Checking Docker status..." -ForegroundColor Yellow
if (-not (Test-DockerRunning)) {
    Write-Host "Please start Docker Desktop and try again." -ForegroundColor Red
    Write-Host "If Docker Desktop is not installed, download it from: https://www.docker.com/products/docker-desktop" -ForegroundColor Yellow
    exit 1
}

# Check if Node.js is installed
Write-Host "`n📦 Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed" -ForegroundColor Red
    Write-Host "Please install Node.js 18+ from: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Create local environment file
Write-Host "`n⚙️ Creating local environment configuration..." -ForegroundColor Yellow
$envContent = @"
# Local Development Environment Configuration
NODE_ENV=development
PORT=3001

# Database Configuration (using Docker containers)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nanoinfluencer_dev
DB_USER=nanoinfluencer_user
DB_PASSWORD=dev_password_123

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Secrets (development only - use secure values in production)
JWT_SECRET=dev_jwt_secret_for_local_development_only_32_chars
JWT_REFRESH_SECRET=dev_refresh_secret_for_local_development_32_chars
SESSION_SECRET=dev_session_secret_for_local_development

# Email Configuration (using MailHog for testing)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM_EMAIL=noreply@localhost
SMTP_FROM_NAME=NanoInfluencer Dev

# Development Payment Configuration (Stripe test keys)
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_test_webhook_secret_here

# Social Media API Configuration (development/test values)
INSTAGRAM_CLIENT_ID=your_instagram_test_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_test_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_test_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_test_client_secret
YOUTUBE_CLIENT_ID=your_youtube_test_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_test_client_secret

# Security Configuration
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
HELMET_CSP_DIRECTIVES=default-src 'self' 'unsafe-inline' 'unsafe-eval'

# Development Monitoring (optional)
SENTRY_DSN=
LOG_LEVEL=debug

# File Upload Configuration
UPLOAD_MAX_SIZE=10485760
UPLOAD_DIR=uploads

# Rate Limiting (relaxed for development)
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX_REQUESTS=1000
"@

Set-Content -Path ".env.development" -Value $envContent -Encoding UTF8
Write-Host "✅ Created .env.development file" -ForegroundColor Green

# Create Docker Compose override for development
Write-Host "`n🐳 Creating Docker Compose development configuration..." -ForegroundColor Yellow
$dockerComposeDevContent = @"
version: '3.8'

services:
  # Development PostgreSQL
  postgres-dev:
    image: postgres:15-alpine
    container_name: nanoinfluencer-postgres-dev
    environment:
      POSTGRES_DB: nanoinfluencer_dev
      POSTGRES_USER: nanoinfluencer_user
      POSTGRES_PASSWORD: dev_password_123
      POSTGRES_INITDB_ARGS: '--auth-host=scram-sha-256'
    ports:
      - "5432:5432"
    volumes:
      - postgres_dev_data:/var/lib/postgresql/data
      - ./backend/database/init:/docker-entrypoint-initdb.d/
    networks:
      - nanoinfluencer-dev
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U nanoinfluencer_user -d nanoinfluencer_dev"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Development Redis
  redis-dev:
    image: redis:7-alpine
    container_name: nanoinfluencer-redis-dev
    command: redis-server --requirepass dev_redis_password --appendonly yes
    ports:
      - "6379:6379"
    volumes:
      - redis_dev_data:/data
    networks:
      - nanoinfluencer-dev
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5

  # MailHog for email testing
  mailhog-dev:
    image: mailhog/mailhog:latest
    container_name: nanoinfluencer-mailhog-dev
    ports:
      - "1025:1025"  # SMTP server
      - "8025:8025"  # Web UI
    networks:
      - nanoinfluencer-dev
    restart: unless-stopped

  # pgAdmin for database management (optional)
  pgadmin-dev:
    image: dpage/pgadmin4:latest
    container_name: nanoinfluencer-pgadmin-dev
    environment:
      PGADMIN_DEFAULT_EMAIL: admin@nanoinfluencer.local
      PGADMIN_DEFAULT_PASSWORD: admin123
      PGADMIN_CONFIG_SERVER_MODE: 'False'
    ports:
      - "8080:80"
    volumes:
      - pgadmin_dev_data:/var/lib/pgadmin
    networks:
      - nanoinfluencer-dev
    restart: unless-stopped
    depends_on:
      - postgres-dev

volumes:
  postgres_dev_data:
  redis_dev_data:
  pgadmin_dev_data:

networks:
  nanoinfluencer-dev:
    driver: bridge
"@

Set-Content -Path "docker-compose.dev.yml" -Value $dockerComposeDevContent -Encoding UTF8
Write-Host "✅ Created docker-compose.dev.yml file" -ForegroundColor Green

# Start development services
Write-Host "`n🚀 Starting development services..." -ForegroundColor Yellow
try {
    docker-compose -f docker-compose.dev.yml up -d
    Write-Host "✅ Development services started successfully" -ForegroundColor Green
    
    Write-Host "`n📋 Development Services Status:" -ForegroundColor Cyan
    Write-Host "  • PostgreSQL: localhost:5432 (user: nanoinfluencer_user, password: dev_password_123)" -ForegroundColor White
    Write-Host "  • Redis: localhost:6379" -ForegroundColor White
    Write-Host "  • MailHog SMTP: localhost:1025" -ForegroundColor White
    Write-Host "  • MailHog Web UI: http://localhost:8025" -ForegroundColor White
    Write-Host "  • pgAdmin: http://localhost:8080 (admin@nanoinfluencer.local / admin123)" -ForegroundColor White
    
} catch {
    Write-Host "❌ Failed to start development services" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

# Install backend dependencies
Write-Host "`n📦 Installing backend dependencies..." -ForegroundColor Yellow
try {
    Push-Location "backend"
    npm install
    Write-Host "✅ Backend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install backend dependencies" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    Pop-Location
}

# Install frontend dependencies
Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
try {
    Push-Location "frontend-web"
    npm install
    Write-Host "✅ Frontend dependencies installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Failed to install frontend dependencies" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
} finally {
    Pop-Location
}

# Wait for database to be ready
Write-Host "`n⏳ Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    try {
        $result = docker exec nanoinfluencer-postgres-dev pg_isready -U nanoinfluencer_user -d nanoinfluencer_dev 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Database is ready" -ForegroundColor Green
            break
        }
    } catch {}
    
    if ($attempt -ge $maxAttempts) {
        Write-Host "❌ Database failed to start within timeout" -ForegroundColor Red
        break
    }
    
    Write-Host "  Attempt $attempt/$maxAttempts..." -ForegroundColor Gray
    Start-Sleep -Seconds 2
} while ($attempt -lt $maxAttempts)

# Run database migrations
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🔄 Running database migrations..." -ForegroundColor Yellow
    try {
        Push-Location "backend"
        $env:NODE_ENV = "development"
        npm run migrate
        Write-Host "✅ Database migrations completed" -ForegroundColor Green
    } catch {
        Write-Host "❌ Database migration failed" -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
    } finally {
        Pop-Location
    }
}

# Install global development tools
Write-Host "`n🛠️ Installing global development tools..." -ForegroundColor Yellow
try {
    npm install -g nodemon concurrently playwright
    Write-Host "✅ Global development tools installed" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Some global tools may not have installed correctly" -ForegroundColor Yellow
}

# Create development startup scripts
Write-Host "`n📜 Creating development startup scripts..." -ForegroundColor Yellow

$startBackendScript = @"
@echo off
echo Starting NanoInfluencer Backend Development Server...
cd /d "%~dp0backend"
set NODE_ENV=development
npm run dev
"@

Set-Content -Path "start-backend.bat" -Value $startBackendScript -Encoding ASCII
Write-Host "✅ Created start-backend.bat" -ForegroundColor Green

$startFrontendScript = @"
@echo off
echo Starting NanoInfluencer Frontend Development Server...
cd /d "%~dp0frontend-web"
set REACT_APP_API_URL=http://localhost:3001/api
npm start
"@

Set-Content -Path "start-frontend.bat" -Value $startFrontendScript -Encoding ASCII
Write-Host "✅ Created start-frontend.bat" -ForegroundColor Green

$startAllScript = @"
@echo off
echo Starting All NanoInfluencer Development Services...
echo.
echo Starting backend server...
start "Backend Server" cmd /k "cd /d "%~dp0" && start-backend.bat"
timeout /t 3 /nobreak >nul

echo Starting frontend server...
start "Frontend Server" cmd /k "cd /d "%~dp0" && start-frontend.bat"

echo.
echo ✅ All services are starting!
echo.
echo Available Services:
echo   • Backend API: http://localhost:3001/api
echo   • Frontend Web: http://localhost:3000
echo   • MailHog UI: http://localhost:8025
echo   • pgAdmin: http://localhost:8080
echo.
pause
"@

Set-Content -Path "start-dev.bat" -Value $startAllScript -Encoding ASCII
Write-Host "✅ Created start-dev.bat" -ForegroundColor Green

# Final instructions
Write-Host "`n🎉 Local Development Environment Setup Complete!" -ForegroundColor Green

Write-Host "`n📋 What's been set up:" -ForegroundColor Cyan
Write-Host "  ✅ Development environment configuration (.env.development)" -ForegroundColor White
Write-Host "  ✅ Docker services (PostgreSQL, Redis, MailHog, pgAdmin)" -ForegroundColor White
Write-Host "  ✅ Backend and frontend dependencies" -ForegroundColor White
Write-Host "  ✅ Database migrations" -ForegroundColor White
Write-Host "  ✅ Development startup scripts" -ForegroundColor White

Write-Host "`n🚀 To start development:" -ForegroundColor Magenta
Write-Host "  • Double-click 'start-dev.bat' to start both frontend and backend" -ForegroundColor Yellow
Write-Host "  • Or manually:" -ForegroundColor Yellow
Write-Host "    - Backend: start-backend.bat" -ForegroundColor White
Write-Host "    - Frontend: start-frontend.bat" -ForegroundColor White

Write-Host "`n🌐 Access your application:" -ForegroundColor Magenta
Write-Host "  • Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "  • Backend API: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "  • API Health: http://localhost:3001/api/health" -ForegroundColor Cyan
Write-Host "  • MailHog (Email testing): http://localhost:8025" -ForegroundColor Cyan
Write-Host "  • pgAdmin (Database): http://localhost:8080" -ForegroundColor Cyan

Write-Host "`n🔧 Next steps for production:" -ForegroundColor Magenta
Write-Host "  1. Set up GitHub repository with secrets" -ForegroundColor White
Write-Host "  2. Configure external services (Stripe, social media APIs)" -ForegroundColor White
Write-Host "  3. Set up staging/production servers" -ForegroundColor White
Write-Host "  4. Deploy using docker-compose.prod.yml" -ForegroundColor White

Write-Host "`n✨ Happy coding!" -ForegroundColor Green