# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture Overview

This is a **mono-repo marketplace application** connecting brands with nano-influencers (1k–50k followers). The architecture follows a **microservices pattern** with clear separation of concerns:

### Core Components
- **Backend**: Node.js/Express RESTful API server with JWT authentication
- **Frontend Web**: React.js SPA with React Router, TailwindCSS, and Zustand state management  
- **Frontend Mobile**: React Native cross-platform mobile app (planned)
- **AI Services**: Python microservices using FastAPI/uvicorn for ML models and analytics
- **Database**: PostgreSQL with TimescaleDB extension for time-series analytics data

### Key Business Entities
The platform operates around these core entities (see `database/schema.sql`):
- **Users** (brands, influencers, admins) with role-based access
- **Campaigns** with complex targeting, content requirements, and payment escrow
- **Campaign Applications** (many-to-many influencer-campaign relationships)
- **Campaign Deliverables** (content submissions with engagement tracking)
- **Wallets & Transactions** (escrow payment system with platform commission)
- **Reviews** (mutual rating system between brands and influencers)

### Data Architecture Patterns
- **TimescaleDB hypertables** for `analytics_events`, `campaign_deliverables`, and `transactions` tables
- **JSONB fields** extensively used for flexible schema (audience demographics, content requirements, etc.)
- **Trigger-based `updated_at`** timestamp management across all tables
- **Comprehensive indexing** on foreign keys, status fields, and search criteria

## Development Commands

### Quick Start (Full Stack)
```bash
# Start all services simultaneously
npm run dev

# Alternative: Start individual services
npm run dev:backend    # Node.js API on port 3001
npm run dev:web        # React web app on port 3000  
npm run dev:ai         # Python AI services with uvicorn
npm run dev:mobile     # React Native (when ready)
```

### Database Operations
```bash
# Complete database setup
npm run db:setup     # Create database and extensions
npm run db:migrate   # Run Sequelize migrations
npm run db:seed      # Populate with sample data
npm run db:reset     # Reset and reseed database
```

### Backend Development
```bash
cd backend
npm run dev          # Development server with nodemon
npm test             # Jest unit tests
npm run test:watch   # Jest in watch mode
npm run test:coverage # Coverage report
npm run lint         # ESLint with Airbnb config
npm run lint:fix     # Auto-fix ESLint issues
npm run build        # Babel transpilation to dist/
```

### Frontend Web Development
```bash
cd frontend-web
npm start            # Development server (port 3000)
npm test             # React Testing Library tests
npm run test:coverage # Jest coverage report
npm run build        # Production build
npm run lint         # ESLint with react-app config
npm run format       # Prettier formatting
npm run cypress:open # Cypress E2E tests (interactive)
npm run cypress:run  # Cypress E2E tests (headless)
npm run analyze      # Bundle size analysis
```

### AI Services Development
```bash
cd ai-services
python -m uvicorn main:app --reload  # FastAPI dev server
python -m pytest                    # Run ML service tests
python train_model.py               # Retrain ML models
```

### Testing Strategy
- **Backend**: Jest + Supertest for API endpoint testing
- **Frontend**: React Testing Library + Jest for component testing
- **E2E**: Cypress for full user journey testing
- **AI Services**: pytest for ML model validation

### Docker Operations
```bash
npm run docker:up      # Start all services with docker-compose
npm run docker:down    # Stop and remove containers
npm run docker:build   # Rebuild all Docker images
```

### Deployment
```bash
# Staging deployment
npm run deploy:staging

# Production deployment  
npm run deploy:production
```

## Key Technology Decisions

### Authentication & Security
- **Passport.js** strategies: JWT, Google OAuth, local authentication
- **bcryptjs** for password hashing
- **express-rate-limit** for API protection
- **helmet** for security headers

### State Management & UI
- **Frontend**: Zustand for state management (preferred over Redux for simplicity)
- **UI**: TailwindCSS + HeadlessUI for accessible components
- **Forms**: react-hook-form with validation
- **Charts**: Recharts for analytics dashboards

### Data & Analytics
- **ORM**: Sequelize for PostgreSQL with comprehensive relationships
- **Caching**: Redis for session management and performance
- **Search**: Elasticsearch for influencer discovery (mentioned in README)
- **Queue**: Kafka for real-time analytics pipeline (mentioned in README)
- **ML**: scikit-learn and PyTorch for AI matching engine

### External Integrations
- **Payment**: Stripe for payment processing and escrow management
- **Email**: Nodemailer for transactional emails
- **Storage**: AWS S3 for media uploads (planned)
- **Social APIs**: Instagram, TikTok, YouTube APIs for profile verification

## Development Guidelines

### Code Organization
- **Backend routes** follow RESTful conventions: `/api/{resource}`
- **Frontend pages** use React Router v6 with nested routes under `/app/`
- **Database migrations** managed through Sequelize CLI
- **Environment variables** centralized in `.env` files (not committed)

### Database Schema Patterns
When working with the database:
- All primary keys use UUIDs (`uuid_generate_v4()`)
- Status fields use CHECK constraints for data integrity
- JSONB is preferred for flexible, searchable JSON data
- TimescaleDB hypertables are used for high-volume time-series data
- Foreign key relationships are properly indexed

### API Design Patterns
- RESTful endpoints with consistent error response format
- JWT tokens for authentication with refresh token rotation
- Request validation using Joi schema validation
- Swagger/OpenAPI documentation (dependencies present)
- Rate limiting applied globally and per-endpoint as needed

### Frontend Architecture
- Component-based architecture with reusable UI components
- Context providers for global state (auth, theme)
- Custom hooks for API interactions and business logic
- Responsive design mobile-first with TailwindCSS
- SEO optimization with react-helmet-async

### AI/ML Integration
- Microservices architecture for ML models allows independent scaling
- Model versioning tracked in `ai_models` database table
- Batch and real-time prediction capabilities
- Fraud detection and influence scoring algorithms

## Project Phases

Based on the README roadmap:
- **Phase 1 (MVP)**: Basic onboarding, campaign management, payment integration
- **Phase 2 (Growth)**: AI matching engine, mobile app, advanced analytics  
- **Phase 3 (Scale)**: Multi-platform support, international expansion, enterprise features

When working on features, consider which phase they belong to and prioritize MVP functionality first.