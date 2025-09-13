# 🚀 Production Deployment Guide - NanoInfluencer Marketplace

This guide covers the complete production deployment process for the NanoInfluencer Marketplace application, including database migration, secrets management, monitoring, and security configurations.

## 📋 Prerequisites

- Docker and Docker Compose installed
- PostgreSQL client tools (`pg_dump`, `pg_restore`)
- SSL certificates for HTTPS
- Production environment variables configured

## 🗃️ Database Setup

### PostgreSQL Migration from SQLite

The application has been configured to use PostgreSQL as the primary database. The configuration automatically handles connection pooling, retry logic, and health checks.

#### Environment Variables

```bash
# Database Configuration
DB_HOST=your-postgres-host
DB_PORT=5432
DB_NAME=nanoinfluencer_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password
DATABASE_URL=postgresql://user:password@host:5432/database
```

#### Database Migration Commands

```bash
# Create database
npm run db:create

# Run migrations
npm run migrate

# Seed initial data (includes admin user)
npm run seed

# Check migration status
npm run migrate:status
```

### Secrets Management

The application includes a comprehensive secrets management system with encryption:

#### Setting Up Secrets

```bash
# Set master key for encryption (production only)
export SECRETS_MASTER_KEY=your-64-char-hex-key

# Migrate existing environment variables to encrypted secrets
node scripts/migrate-secrets.js
```

#### Encrypted Secrets Storage

- Secrets are encrypted using AES-256-GCM
- Master key derivation using PBKDF2
- Automatic fallback to environment variables
- Support for future AWS Secrets Manager integration

## 🐳 Docker Deployment

### Production Deployment

```bash
# Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# Check service health
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f backend
```

### Development Setup

```bash
# Start development services only (PostgreSQL, Redis, pgAdmin)
docker-compose -f docker-compose.dev.yml up -d

# Run backend locally with hot reload
npm run dev
```

### Services Included

#### Production Stack
- **PostgreSQL 15**: Primary database with automatic backups
- **Redis 7**: Session storage and caching
- **Backend API**: Node.js application with monitoring
- **Frontend**: React application with Nginx
- **Nginx**: Reverse proxy with SSL termination
- **Prometheus**: Metrics collection
- **Grafana**: Monitoring dashboards

#### Development Stack
- **PostgreSQL 15**: Development database
- **Redis 7**: Development cache
- **pgAdmin**: Database administration UI
- **Mailhog**: Email testing
- **Prometheus**: Local metrics collection

## 🔐 Security Configuration

### Environment Variables

```bash
# Security Configuration
JWT_SECRET=your-super-secure-jwt-secret
JWT_REFRESH_SECRET=your-refresh-token-secret
BCRYPT_ROUNDS=12

# Rate Limiting
GENERAL_RATE_LIMIT_MAX=1000
AUTH_RATE_LIMIT_MAX=10
CAMPAIGN_RATE_LIMIT_MAX=20

# CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://api.yourdomain.com

# Monitoring
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
LOG_LEVEL=info
PROMETHEUS_ENABLED=true
```

### SSL/TLS Configuration

Place your SSL certificates in the `nginx/ssl/` directory:
- `cert.pem` - SSL certificate
- `key.pem` - Private key

### Security Headers

The application automatically applies:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options
- X-Content-Type-Options
- Referrer Policy

## 📊 Monitoring and Observability

### Metrics Available

- **HTTP Requests**: Count, duration, status codes
- **Database Operations**: Query performance and health
- **Authentication**: Failed login attempts
- **Business Metrics**: User counts, campaign statistics
- **System Health**: Memory usage, uptime, connection status

### Monitoring Endpoints

- **Health Check**: `GET /api/health`
- **Metrics**: `GET /metrics` (Prometheus format)
- **Grafana Dashboard**: `http://localhost:3030`
- **Prometheus UI**: `http://localhost:9090`

### Log Management

Structured logging with Winston:
- **Development**: Console output with colors
- **Production**: JSON logs with rotation (5MB files, 10 files retention)
- **Error Tracking**: Automatic Sentry integration

## 💾 Database Backup and Restoration

### Automated Backups

```bash
# Full database backup
npm run backup:full

# Schema-only backup
npm run backup:schema

# Data-only backup
npm run backup:data

# List all backups
npm run backup:list

# Cleanup old backups
npm run backup:cleanup
```

### Backup Configuration

```bash
# Backup Settings
BACKUP_RETENTION_DAYS=30
MAX_BACKUPS_TO_KEEP=50
BACKUP_COMPRESSION_LEVEL=6
ENCRYPT_BACKUPS=true
BACKUP_UPLOAD_S3=true
BACKUP_S3_BUCKET=your-backup-bucket
```

### Manual Backup Commands

```bash
# Create full backup with custom filename
node scripts/backup.js full

# Restore from specific backup
node scripts/backup.js restore /path/to/backup.sql

# Automated cleanup
node scripts/backup.js cleanup
```

### Restoration Process

1. Stop the application
2. Restore from backup: `npm run restore /path/to/backup.sql`
3. Restart the application
4. Verify data integrity

## 🚀 Deployment Process

### Initial Production Deployment

1. **Prepare Environment**
   ```bash
   # Clone repository
   git clone https://github.com/your-repo/nanoinfluencer-marketplace
   cd nanoinfluencer-marketplace
   
   # Set up environment variables
   cp .env.example .env.production
   # Edit .env.production with production values
   ```

2. **Database Setup**
   ```bash
   # Start database services
   docker-compose -f docker-compose.prod.yml up -d postgres redis
   
   # Wait for services to be healthy
   docker-compose -f docker-compose.prod.yml ps
   
   # Run database migrations
   docker-compose exec backend npm run production:setup
   ```

3. **Deploy Application**
   ```bash
   # Build and start all services
   docker-compose -f docker-compose.prod.yml up -d
   
   # Verify deployment
   curl -f http://localhost/api/health
   ```

4. **Configure Monitoring**
   ```bash
   # Access Grafana (default: admin/admin)
   open http://localhost:3030
   
   # Import dashboards from monitoring/grafana/dashboards/
   ```

### Rolling Updates

1. **Backup Database**
   ```bash
   npm run production:backup
   ```

2. **Deploy New Version**
   ```bash
   git pull origin main
   docker-compose -f docker-compose.prod.yml build --no-cache
   docker-compose -f docker-compose.prod.yml up -d
   ```

3. **Run Migrations**
   ```bash
   docker-compose exec backend npm run migrate
   ```

4. **Verify Deployment**
   ```bash
   curl -f http://localhost/api/health
   ```

## 🔍 Health Checks and Monitoring

### Service Health Checks

- **Backend**: HTTP health endpoint with database connectivity
- **Database**: PostgreSQL `pg_isready` check
- **Redis**: Redis `ping` command
- **Frontend**: HTTP availability check
- **Nginx**: Configuration syntax check

### Alerting (Configure as needed)

- Failed health checks
- High error rates (>5% for 5 minutes)
- High response times (>2s for 5 minutes)
- Database connection failures
- Disk space usage (>80%)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Fails**
   ```bash
   # Check PostgreSQL service
   docker-compose logs postgres
   
   # Verify connection
   docker-compose exec postgres pg_isready
   ```

2. **Backend Health Check Fails**
   ```bash
   # Check backend logs
   docker-compose logs backend
   
   # Test health endpoint
   curl -v http://localhost:3001/api/health
   ```

3. **High Memory Usage**
   ```bash
   # Check container resources
   docker stats
   
   # Adjust connection pool settings in database config
   ```

### Log Locations

- **Backend Logs**: `backend/logs/` (development) or Docker volume (production)
- **Nginx Logs**: Docker volume `nginx_logs`
- **PostgreSQL Logs**: Container logs via `docker-compose logs postgres`

## 🔧 Performance Tuning

### Database Optimization

- Connection pooling configured (20 max connections in production)
- Indexes on frequently queried columns
- Query timeout settings
- Connection retry logic with exponential backoff

### Application Optimization

- Request rate limiting per endpoint
- Response compression (gzip)
- Static asset caching
- Database query optimization

### Monitoring-Based Scaling

- CPU usage monitoring
- Memory usage alerts
- Database connection pool monitoring
- Request rate monitoring

## 🔒 Security Checklist

- [ ] SSL/TLS certificates configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input validation and sanitization
- [ ] SQL injection protection (Sequelize ORM)
- [ ] XSS protection headers
- [ ] CSRF protection
- [ ] Secrets encrypted and rotated
- [ ] Database access restricted
- [ ] Network segmentation (Docker networks)
- [ ] Regular security updates
- [ ] Monitoring and alerting active
- [ ] Backup and recovery tested

## 📞 Support and Maintenance

### Regular Maintenance Tasks

- Weekly database backups verification
- Monthly secrets rotation
- Quarterly security updates
- Continuous monitoring review

### Emergency Procedures

1. **Service Outage**: Check health endpoints and logs
2. **Data Loss**: Restore from most recent backup
3. **Security Incident**: Rotate secrets and review access logs
4. **Performance Issues**: Check monitoring dashboards and scale resources

---

## 🎯 Quick Start Commands

```bash
# Production deployment
docker-compose -f docker-compose.prod.yml up -d

# Development setup
docker-compose -f docker-compose.dev.yml up -d
npm run dev

# Database operations
npm run migrate
npm run seed
npm run backup:full

# Health checks
curl http://localhost/api/health
curl http://localhost/metrics
```

This production deployment is enterprise-ready with comprehensive monitoring, security, backup, and recovery capabilities! 🚀