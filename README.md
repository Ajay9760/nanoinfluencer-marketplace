# NanoInfluencer MarketPlace

A two-sided marketplace connecting brands (especially SMEs/startups with limited budgets) to nano-influencers (1k–50k followers) who have higher engagement rates and authenticity than celebrity influencers. The platform ensures transparent campaign execution, ROI tracking, and AI-powered influencer-brand matching.

## 🎯 Target Users

### Brands / Marketers
- SMEs/startups that cannot afford big influencers
- E-commerce sellers (D2C brands)
- Local businesses (cafes, gyms, boutiques)
- Agencies handling multiple clients

### Influencers
- Nano influencers (1k–50k followers) across Instagram, TikTok, YouTube Shorts, X, regional platforms
- Aspiring creators looking to monetize
- Students and niche hobbyists

## 🛠️ Core Features

### 1. Influencer Onboarding
- OAuth-based social media integration (Instagram, YouTube, TikTok APIs)
- Profile completion with niche tags, audience demographics, sample posts
- AI-calculated "Influence Score" 
- Verified engagement badge system

### 2. Brand Onboarding
- Business verification (GST, website, LinkedIn)
- Campaign wizard with goal selection and budget setting
- Auto-suggested influencer matches
- Content brief upload system

### 3. Campaign Lifecycle
- Influencer discovery and invitation system
- Pre-content approval workflow
- Automated UTM link & hashtag assignment
- Post-campaign analytics dashboard

### 4. Payment & Escrow
- Secure escrow wallet system
- Automated fund release after proof-of-post
- Split payout with platform commission

### 5. AI Features
- ML-based influencer matching engine
- Fraud detection for fake followers
- Creative suggestions and optimization

## 🏗️ Technical Architecture

### Frontend
- **Web**: React.js with responsive design
- **Mobile**: React Native for cross-platform mobile app

### Backend
- **API**: Node.js/Express RESTful API
- **Database**: PostgreSQL with TimescaleDB for time-series data
- **Caching**: Redis for performance optimization
- **Search**: Elasticsearch for influencer discovery

### AI Services
- **ML Models**: Python microservices with scikit-learn, PyTorch
- **Analytics**: Kafka → Spark/Flink pipeline

### Infrastructure
- **Storage**: AWS S3 for media files
- **Deployment**: Docker containers
- **Monitoring**: Application performance monitoring

## 📊 Database Schema

Key entities include:
- Users (brands, influencers, admins)
- Campaigns with deliverables
- Payment and wallet system
- Reviews and ratings
- Analytics and engagement metrics

See `database/schema.sql` for complete schema definition.

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn
- PostgreSQL 13+
- Redis 6+
- Docker (optional but recommended)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nanoinfluencer-marketplace
   ```

2. **Install dependencies**
   ```bash
   # Backend
   cd backend && npm install
   
   # Frontend Web
   cd ../frontend-web && npm install
   
   # Frontend Mobile
   cd ../frontend-mobile && npm install
   ```

3. **Setup environment variables**
   ```bash
   cp config/env.example .env
   # Edit .env with your configuration
   ```

4. **Setup database**
   ```bash
   npm run db:setup
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development servers**
   ```bash
   # Terminal 1: Backend API
   cd backend && npm run dev
   
   # Terminal 2: Frontend Web
   cd frontend-web && npm start
   
   # Terminal 3: AI Services
   cd ai-services && python -m uvicorn main:app --reload
   ```

### Docker Setup (Alternative)
```bash
docker-compose up -d
```

## 📱 Development

### Project Structure
```
nanoinfluencer-marketplace/
├── backend/                 # Node.js API server
├── frontend-web/           # React.js web application
├── frontend-mobile/        # React Native mobile app
├── ai-services/           # Python ML microservices
├── database/              # Database schemas and migrations
├── docs/                  # Project documentation
├── tests/                 # Integration and E2E tests
├── scripts/               # Build and deployment scripts
└── config/                # Configuration files
```

### Available Scripts

#### Backend
- `npm run dev` - Start development server
- `npm run test` - Run unit tests
- `npm run lint` - Lint code
- `npm run build` - Build for production

#### Frontend Web
- `npm start` - Start development server
- `npm test` - Run tests
- `npm run build` - Build for production
- `npm run deploy` - Deploy to staging/production

#### AI Services
- `python main.py` - Start ML services
- `python -m pytest` - Run tests
- `python train_model.py` - Train ML models

## 💰 Monetization Strategy

- **Commission**: 10–15% platform fee per transaction
- **Subscription**: Advanced analytics for brands
- **Boosted Visibility**: Paid profile boosting for influencers
- **Add-ons**: Fraud reports, AI-optimized briefs

## 🔐 Security & Privacy

- OAuth 2.0 authentication
- JWT token-based authorization
- Data encryption at rest and in transit
- GDPR compliance for user data
- Rate limiting and DDoS protection

## 📈 Analytics & KPIs

- Campaign ROI (CPE, CPM, CTR)
- Influencer reliability metrics
- Brand retention rates
- Fraud detection metrics
- Engagement effectiveness analysis

## 🌍 Deployment

### Staging
```bash
npm run deploy:staging
```

### Production
```bash
npm run deploy:production
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

- Documentation: [docs/](./docs/)
- Issues: GitHub Issues
- Email: support@nanoinfluencer.com

## 🗺️ Roadmap

### Phase 1: MVP (Q1 2024)
- Basic influencer and brand onboarding
- Simple campaign creation and management
- Payment system integration

### Phase 2: Growth (Q2 2024)
- AI matching engine
- Mobile app launch
- Advanced analytics dashboard

### Phase 3: Scale (Q3-Q4 2024)
- Multi-platform support
- International expansion
- Enterprise features

---

**Built with ❤️ for the creator economy**