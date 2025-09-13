# 🚀 Development Environment Setup - NanoInfluencer Marketplace

## ✅ What's Already Set Up

Your development environment is ready! Here's what has been configured:

### 📦 Docker Services Running
- **PostgreSQL**: `localhost:5432` (Database)
  - Database: `nanoinfluencer_dev`
  - User: `nanoinfluencer_user`
  - Password: `dev_password_123`
- **Redis**: `localhost:6379` (Caching)
- **MailHog**: Email testing service
  - SMTP: `localhost:1025`
  - Web UI: http://localhost:8025
- **pgAdmin**: Database management
  - Web UI: http://localhost:8080
  - Email: `admin@nanoinfluencer.dev`
  - Password: `admin123`

### 📁 Project Structure
```
nanoinfluencer-marketplace/
├── backend/                 # Node.js API server
├── frontend-web/           # React frontend
├── scripts/                # Setup and utility scripts
├── tests/e2e/              # End-to-end tests
├── .github/workflows/      # CI/CD pipelines
├── docker-compose.dev.yml  # Development services
├── docker-compose.prod.yml # Production deployment
└── .env.development        # Development configuration
```

## 🚀 Starting Development

### Option 1: Quick Start (Recommended)
Double-click the batch files in the root directory:
- `start-backend.bat` - Starts the API server
- `start-frontend.bat` - Starts the React app

### Option 2: Manual Start
Open two PowerShell/Command Prompt windows:

**Backend (API Server):**
```powershell
cd backend
npm run dev
```

**Frontend (React App):**
```powershell
cd frontend-web
npm start
```

## 🌐 Access Your Application

Once both servers are running:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001/api
- **API Health Check**: http://localhost:3001/api/health
- **Email Testing**: http://localhost:8025 (MailHog)
- **Database Management**: http://localhost:8080 (pgAdmin)

## 🔧 Development Tools & Features

### Available API Endpoints
- `GET /api/health` - Health check
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/campaigns` - Get campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/payments/stripe-config` - Stripe configuration
- And many more... (check `backend/src/routes/` for full API)

### Key Features Implemented
- ✅ **User Authentication**: JWT with refresh tokens
- ✅ **Two-Factor Authentication**: TOTP with QR codes
- ✅ **Email Verification**: JWT-based email verification
- ✅ **Payment Processing**: Stripe integration
- ✅ **Social Media APIs**: Instagram, TikTok, YouTube
- ✅ **Campaign Management**: Create, manage, track campaigns
- ✅ **File Upload**: Secure file handling
- ✅ **Real-time Features**: WebSocket support
- ✅ **Monitoring**: Health checks and metrics

### Database Management
The database schema includes:
- Users (brands and influencers)
- Campaigns and applications
- Payments and transactions
- Social media accounts
- Notifications and messages

**Connect to database via pgAdmin:**
1. Open http://localhost:8080
2. Login with `admin@nanoinfluencer.dev` / `admin123`
3. Add server: Host = `nano-postgres-dev`, Port = `5432`
4. Database = `nanoinfluencer_dev`, User = `nanoinfluencer_user`

## 🔑 Environment Configuration

The development environment uses `.env.development` with safe defaults:

### Database Settings
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=nanoinfluencer_dev
DB_USER=nanoinfluencer_user
DB_PASSWORD=dev_password_123
```

### API Keys (Update with your own)
```env
# Stripe Test Keys
STRIPE_SECRET_KEY=sk_test_your_stripe_test_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_publishable_key_here

# Social Media API Keys
INSTAGRAM_CLIENT_ID=your_instagram_test_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_test_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_test_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_test_client_secret
YOUTUBE_CLIENT_ID=your_youtube_test_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_test_client_secret
```

## 📧 Email Testing with MailHog

MailHog captures all emails sent from your application:
1. Open http://localhost:8025
2. Register a user or trigger any email action
3. View the email in the MailHog interface
4. Test email verification, password reset, etc.

## 🧪 Testing

### Run Unit Tests
```powershell
cd backend
npm test
```

### Run E2E Tests
```powershell
# Install Playwright (first time only)
npm install -g playwright
npx playwright install

# Run E2E tests
npx playwright test
```

### Available Test Suites
- **Authentication Tests**: Registration, login, 2FA
- **Campaign Tests**: Creation, applications, payments
- **Payment Tests**: Stripe integration
- **Social Media Tests**: API integrations

## 📊 Monitoring & Debugging

### View Application Logs
```powershell
# Backend logs
cd backend
npm run dev

# Docker service logs
docker-compose -f docker-compose.dev.yml logs -f
```

### Database Queries
Use pgAdmin at http://localhost:8080 or connect directly:
```powershell
docker exec -it nano-postgres-dev psql -U nanoinfluencer_user -d nanoinfluencer_dev
```

### Redis Cache
```powershell
docker exec -it nano-redis-dev redis-cli
```

## 🔄 Managing Docker Services

### Stop all services:
```powershell
docker-compose -f docker-compose.dev.yml down
```

### Start services:
```powershell
docker-compose -f docker-compose.dev.yml up -d
```

### View service status:
```powershell
docker-compose -f docker-compose.dev.yml ps
```

### Reset database (if needed):
```powershell
docker-compose -f docker-compose.dev.yml down -v
docker-compose -f docker-compose.dev.yml up -d
```

## 🚀 Next Steps for Production

1. **Set up GitHub Repository**
   - Push code to GitHub
   - Configure repository secrets for CI/CD

2. **External Service Setup**
   - Create Stripe account and get live keys
   - Set up social media app registrations
   - Configure email service (SendGrid, etc.)
   - Set up Sentry for error tracking

3. **Server Setup**
   - Provision staging and production servers
   - Install Docker and configure environment
   - Set up SSL certificates
   - Configure domain DNS

4. **Deploy to Production**
   - Use `docker-compose.prod.yml`
   - Configure production environment variables
   - Set up backup and monitoring

## 📚 Useful Commands

### Backend Development
```powershell
cd backend
npm run dev          # Start development server
npm test            # Run tests
npm run lint        # Run ESLint
npm run migrate     # Run database migrations
npm run seed        # Seed test data
```

### Frontend Development
```powershell
cd frontend-web
npm start           # Start development server
npm test            # Run tests
npm run build       # Build for production
npm run lint        # Run ESLint
```

### Docker Management
```powershell
# View all containers
docker ps -a

# View logs for specific service
docker-compose -f docker-compose.dev.yml logs postgres-dev

# Execute commands in containers
docker exec -it nano-postgres-dev bash
docker exec -it nano-redis-dev redis-cli
```

## 🐛 Common Issues & Solutions

### Backend won't start
- Check if Docker services are running: `docker-compose -f docker-compose.dev.yml ps`
- Verify database connection: `docker exec nano-postgres-dev pg_isready -U nanoinfluencer_user -d nanoinfluencer_dev`
- Check environment file: Ensure `.env` exists in backend folder

### Frontend issues
- Clear node_modules: `Remove-Item -Recurse -Force node_modules` and `npm install`
- Check API URL: Verify `REACT_APP_API_URL=http://localhost:3001/api`

### Database connection issues
- Reset Docker volumes: `docker-compose -f docker-compose.dev.yml down -v`
- Check PostgreSQL logs: `docker-compose -f docker-compose.dev.yml logs postgres-dev`

### Port conflicts
- Change ports in `docker-compose.dev.yml` if needed
- Kill processes using ports: `Get-Process -Id (Get-NetTCPConnection -LocalPort 5432).OwningProcess`

## 🎯 Development Workflow

1. **Start Docker services** (if not running)
2. **Start backend server** (`npm run dev`)
3. **Start frontend server** (`npm start`)
4. **Make changes** to code
5. **Test features** using the web interface
6. **View emails** in MailHog
7. **Check database** in pgAdmin
8. **Run tests** before committing
9. **Commit and push** changes

## 🔒 Security Notes

- Development uses weak passwords and test keys
- Never use development configuration in production
- Rotate all secrets before production deployment
- Enable 2FA for all production accounts
- Use environment-specific API keys

---

## ✨ Happy Coding!

Your NanoInfluencer Marketplace development environment is ready. Start building amazing features! 🚀

For questions or issues, check:
- Application logs in terminal
- Docker service logs
- Database queries in pgAdmin
- Email testing in MailHog

**Remember**: This is a development setup. Follow the production deployment guide when ready to deploy! 🌟