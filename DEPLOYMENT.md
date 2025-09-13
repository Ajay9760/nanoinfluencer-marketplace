# 🚀 Deployment Guide - NanoInfluencer Marketplace

This guide covers deploying the NanoInfluencer Marketplace to production using Docker, CI/CD pipelines, and best practices for scalability and security.

## 📋 Prerequisites

### Required Software
- **Docker Engine 20.10+** and **Docker Compose 2.0+**
- **Node.js 18+ and npm** (for local development)
- **Git** for version control
- **SSL Certificate** for HTTPS (Let's Encrypt recommended)

### Required Services
- **PostgreSQL 15+** database
- **Redis 7+** for caching and sessions
- **SMTP Server** for email delivery (e.g., SendGrid, AWS SES, Mailgun)
- **Stripe Account** for payment processing
- **Social Media API Access** (Instagram, TikTok, YouTube)

### Server Requirements
- **Production**: 4+ CPU cores, 8GB+ RAM, 100GB+ SSD
- **Staging**: 2+ CPU cores, 4GB+ RAM, 50GB+ SSD
- **Operating System**: Ubuntu 20.04+ LTS or CentOS 8+

## 🔧 Environment Setup

### 1. Server Preparation

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Create application directory
sudo mkdir -p /opt/nanoinfluencer-marketplace
sudo chown $USER:$USER /opt/nanoinfluencer-marketplace
cd /opt/nanoinfluencer-marketplace

# Clone repository
git clone https://github.com/your-username/nanoinfluencer-marketplace.git .
```

### 2. Environment Configuration

Create environment files for different environments:

#### Production Environment (.env.production)
```env
# Database Configuration
DB_HOST=postgres
DB_PORT=5432
DB_NAME=nanoinfluencer
DB_USER=nanoinfluencer_user
DB_PASSWORD=your_secure_database_password

# Redis Configuration
REDIS_URL=redis://redis:6379
REDIS_PASSWORD=your_secure_redis_password

# Application Configuration
NODE_ENV=production
PORT=3001
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_chars
JWT_REFRESH_SECRET=your_super_secure_refresh_secret_at_least_32_chars
SESSION_SECRET=your_secure_session_secret

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your_sendgrid_api_key
SMTP_FROM_EMAIL=noreply@nanoinfluencer.com
SMTP_FROM_NAME=NanoInfluencer Marketplace

# Payment Configuration
STRIPE_SECRET_KEY=sk_live_your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=pk_live_your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret

# Social Media API Configuration
INSTAGRAM_CLIENT_ID=your_instagram_client_id
INSTAGRAM_CLIENT_SECRET=your_instagram_client_secret
TIKTOK_CLIENT_KEY=your_tiktok_client_key
TIKTOK_CLIENT_SECRET=your_tiktok_client_secret
YOUTUBE_CLIENT_ID=your_youtube_client_id
YOUTUBE_CLIENT_SECRET=your_youtube_client_secret

# Security Configuration
CORS_ORIGINS=https://nanoinfluencer.com,https://www.nanoinfluencer.com
HELMET_CSP_DIRECTIVES=default-src 'self'; script-src 'self' 'unsafe-inline' js.stripe.com; style-src 'self' 'unsafe-inline'

# Monitoring Configuration
SENTRY_DSN=https://your_sentry_dsn@sentry.io/project_id
LOG_LEVEL=info

# SSL Configuration
SSL_CERT_PATH=/etc/ssl/certs/nanoinfluencer.com.crt
SSL_KEY_PATH=/etc/ssl/private/nanoinfluencer.com.key

# Nginx Configuration
NGINX_SERVER_NAME=nanoinfluencer.com www.nanoinfluencer.com
NGINX_CLIENT_MAX_BODY_SIZE=10M
```

#### Staging Environment (.env.staging)
```env
# Use similar configuration as production but with staging values
DB_NAME=nanoinfluencer_staging
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_PUBLISHABLE_KEY=pk_test_your_stripe_test_key
CORS_ORIGINS=https://staging.nanoinfluencer.com
NGINX_SERVER_NAME=staging.nanoinfluencer.com
```

### 3. SSL Certificate Setup

#### Using Let's Encrypt (Recommended)
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Generate SSL certificate
sudo certbot certonly --nginx -d nanoinfluencer.com -d www.nanoinfluencer.com

# Certificate files will be available at:
# - /etc/letsencrypt/live/nanoinfluencer.com/fullchain.pem
# - /etc/letsencrypt/live/nanoinfluencer.com/privkey.pem

# Auto-renewal setup
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet && docker-compose -f /opt/nanoinfluencer-marketplace/docker-compose.prod.yml restart nginx
```

## 🐳 Docker Deployment

### 1. Build and Deploy

```bash
# Navigate to project directory
cd /opt/nanoinfluencer-marketplace

# Pull latest code
git pull origin main

# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Check service status
docker-compose -f docker-compose.prod.yml ps

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### 2. Database Migration and Seeding

```bash
# Run database migrations
docker-compose -f docker-compose.prod.yml exec backend1 npm run migrate

# Seed initial data (optional)
docker-compose -f docker-compose.prod.yml exec backend1 npm run seed

# Create admin user
docker-compose -f docker-compose.prod.yml exec backend1 npm run create-admin -- \
  --email admin@nanoinfluencer.com \
  --password SecureAdminPassword123! \
  --firstName Admin \
  --lastName User
```

### 3. Health Checks and Verification

```bash
# Check API health
curl https://nanoinfluencer.com/api/health

# Check frontend
curl https://nanoinfluencer.com/

# Check database connectivity
docker-compose -f docker-compose.prod.yml exec postgres pg_isready -U nanoinfluencer_user -d nanoinfluencer

# Check Redis connectivity
docker-compose -f docker-compose.prod.yml exec redis redis-cli ping
```

## ⚙️ CI/CD Pipeline Setup

### 1. GitHub Actions Configuration

The CI/CD pipeline is already configured in `.github/workflows/deploy.yml`. Set up the following secrets in your GitHub repository:

#### Repository Secrets
```
# Staging Environment
STAGING_SSH_KEY=<your_staging_server_ssh_private_key>
STAGING_USER=<staging_server_username>
STAGING_HOST=<staging_server_ip_or_domain>
STAGING_DB_PASSWORD=<staging_database_password>
STAGING_JWT_SECRET=<staging_jwt_secret>
STAGING_JWT_REFRESH_SECRET=<staging_jwt_refresh_secret>
STAGING_REDIS_PASSWORD=<staging_redis_password>

# Production Environment
PRODUCTION_SSH_KEY=<your_production_server_ssh_private_key>
PRODUCTION_USER=<production_server_username>
PRODUCTION_HOST=<production_server_ip_or_domain>
PRODUCTION_DB_PASSWORD=<production_database_password>
PRODUCTION_JWT_SECRET=<production_jwt_secret>
PRODUCTION_JWT_REFRESH_SECRET=<production_jwt_refresh_secret>
PRODUCTION_REDIS_PASSWORD=<production_redis_password>
PRODUCTION_DB_USER=<production_database_user>

# External Services
SENTRY_DSN=<your_sentry_dsn>
STRIPE_SECRET_KEY=<your_stripe_secret_key>
STRIPE_WEBHOOK_SECRET=<your_stripe_webhook_secret>
SNYK_TOKEN=<your_snyk_token>
SEMGREP_APP_TOKEN=<your_semgrep_token>
SLACK_WEBHOOK_URL=<your_slack_webhook_url>
```

### 2. Deployment Workflow

The pipeline automatically:
- 🔍 **Security Scanning**: CodeQL, Semgrep, Snyk, and Trivy scans
- 🧪 **Testing**: Unit tests, integration tests, and E2E tests
- 🐳 **Container Building**: Multi-arch Docker images with security scanning
- 🚀 **Deployment**: Rolling deployment to staging, then production
- 📊 **Monitoring**: Health checks and performance testing

### 3. Manual Deployment

To deploy manually using the GitHub Actions workflow:

```bash
# Trigger deployment to staging
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-username/nanoinfluencer-marketplace/actions/workflows/deploy.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"staging"}}'

# Trigger deployment to production
curl -X POST \
  -H "Accept: application/vnd.github.v3+json" \
  -H "Authorization: token $GITHUB_TOKEN" \
  https://api.github.com/repos/your-username/nanoinfluencer-marketplace/actions/workflows/deploy.yml/dispatches \
  -d '{"ref":"main","inputs":{"environment":"production"}}'
```

## 📊 Monitoring and Logging

### 1. Application Monitoring

The deployment includes Prometheus and Grafana for monitoring:

- **Prometheus**: http://your-domain:9090
- **Grafana**: http://your-domain:3030 (admin/admin)

#### Key Metrics to Monitor
- API response times and error rates
- Database connection pool status
- Redis cache hit/miss ratios
- Memory and CPU usage
- Concurrent user sessions
- Payment processing success rates

### 2. Log Management

```bash
# View application logs
docker-compose -f docker-compose.prod.yml logs -f backend1 backend2 backend3

# View Nginx access logs
docker-compose -f docker-compose.prod.yml logs -f nginx

# View database logs
docker-compose -f docker-compose.prod.yml logs -f postgres

# Export logs for analysis
docker-compose -f docker-compose.prod.yml logs --since 24h > app-logs-$(date +%Y%m%d).log
```

### 3. Error Tracking with Sentry

Sentry integration is configured for real-time error tracking:
- **Dashboard**: https://sentry.io/organizations/your-org/projects/nanoinfluencer/
- **Alerts**: Configure alerts for error rates and new issues
- **Performance**: Monitor transaction performance and slow queries

## 🔒 Security Configuration

### 1. Firewall Setup

```bash
# Configure UFW firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 2. Docker Security

```bash
# Create non-root user for Docker
sudo groupadd docker
sudo usermod -aG docker $USER

# Set Docker daemon configuration
sudo tee /etc/docker/daemon.json << EOF
{
  "live-restore": true,
  "userland-proxy": false,
  "no-new-privileges": true,
  "seccomp-profile": "/etc/docker/seccomp.json"
}
EOF

sudo systemctl restart docker
```

### 3. Database Security

```bash
# Secure PostgreSQL configuration
docker-compose -f docker-compose.prod.yml exec postgres psql -U postgres -c "
  ALTER SYSTEM SET ssl = on;
  ALTER SYSTEM SET log_connections = on;
  ALTER SYSTEM SET log_disconnections = on;
  ALTER SYSTEM SET log_statement = 'all';
  SELECT pg_reload_conf();
"
```

## 🚨 Backup and Recovery

### 1. Database Backup

```bash
# Create backup script
cat << EOF > /opt/nanoinfluencer-marketplace/backup-db.sh
#!/bin/bash
BACKUP_DIR="/opt/backups/postgresql"
DATE=\$(date +%Y%m%d_%H%M%S)
mkdir -p \$BACKUP_DIR

# Database backup
docker-compose -f /opt/nanoinfluencer-marketplace/docker-compose.prod.yml exec -T postgres pg_dump -U nanoinfluencer_user -d nanoinfluencer > \$BACKUP_DIR/nanoinfluencer_\$DATE.sql

# Compress backup
gzip \$BACKUP_DIR/nanoinfluencer_\$DATE.sql

# Remove backups older than 30 days
find \$BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: \$BACKUP_DIR/nanoinfluencer_\$DATE.sql.gz"
EOF

chmod +x /opt/nanoinfluencer-marketplace/backup-db.sh

# Schedule daily backups
echo "0 2 * * * /opt/nanoinfluencer-marketplace/backup-db.sh" | crontab -
```

### 2. File System Backup

```bash
# Create application backup
tar -czf /opt/backups/app_backup_$(date +%Y%m%d).tar.gz \
  --exclude=node_modules \
  --exclude=.git \
  --exclude=logs \
  /opt/nanoinfluencer-marketplace

# Upload to cloud storage (example with AWS S3)
aws s3 cp /opt/backups/app_backup_$(date +%Y%m%d).tar.gz s3://your-backup-bucket/
```

### 3. Disaster Recovery

```bash
# Restore from database backup
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U nanoinfluencer_user -d nanoinfluencer < backup_file.sql

# Restore application files
cd /opt
tar -xzf app_backup_YYYYMMDD.tar.gz
cd nanoinfluencer-marketplace
docker-compose -f docker-compose.prod.yml up -d
```

## 🎯 Performance Optimization

### 1. Database Optimization

```sql
-- Add database indexes for better performance
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_campaigns_status ON campaigns(status);
CREATE INDEX CONCURRENTLY idx_applications_campaign_id ON campaign_applications(campaign_id);
CREATE INDEX CONCURRENTLY idx_applications_user_id ON campaign_applications(user_id);
CREATE INDEX CONCURRENTLY idx_payments_status ON payments(status);
CREATE INDEX CONCURRENTLY idx_social_accounts_user_id ON social_media_accounts(user_id);

-- Update table statistics
ANALYZE;
```

### 2. Redis Configuration

```bash
# Optimize Redis configuration
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory 1gb
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET maxmemory-policy allkeys-lru
docker-compose -f docker-compose.prod.yml exec redis redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

### 3. Nginx Optimization

The Nginx configuration in `nginx/nginx.conf` includes:
- Gzip compression
- Browser caching headers
- Rate limiting
- SSL optimization
- Load balancing with health checks

## 🔧 Troubleshooting

### Common Issues

#### 1. Service Won't Start
```bash
# Check service logs
docker-compose -f docker-compose.prod.yml logs service_name

# Check resource usage
docker stats

# Restart specific service
docker-compose -f docker-compose.prod.yml restart service_name
```

#### 2. Database Connection Issues
```bash
# Test database connectivity
docker-compose -f docker-compose.prod.yml exec backend1 node -e "
const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD
});
pool.query('SELECT NOW()', (err, res) => {
  if (err) console.error(err);
  else console.log('Database connected:', res.rows[0]);
  process.exit(0);
});
"
```

#### 3. SSL Certificate Issues
```bash
# Check certificate validity
openssl x509 -in /etc/letsencrypt/live/nanoinfluencer.com/fullchain.pem -text -noout

# Renew certificate manually
sudo certbot renew --force-renewal

# Restart Nginx
docker-compose -f docker-compose.prod.yml restart nginx
```

### Health Check Commands

```bash
# Quick health check script
cat << 'EOF' > /opt/nanoinfluencer-marketplace/health-check.sh
#!/bin/bash
echo "=== NanoInfluencer Marketplace Health Check ==="

# Check services
echo "1. Checking Docker services..."
docker-compose -f docker-compose.prod.yml ps

# Check API health
echo "2. Checking API health..."
curl -f https://nanoinfluencer.com/api/health || echo "API health check failed"

# Check database
echo "3. Checking database..."
docker-compose -f docker-compose.prod.yml exec -T postgres pg_isready -U nanoinfluencer_user -d nanoinfluencer

# Check Redis
echo "4. Checking Redis..."
docker-compose -f docker-compose.prod.yml exec -T redis redis-cli ping

# Check disk space
echo "5. Checking disk space..."
df -h

# Check memory usage
echo "6. Checking memory usage..."
free -h

echo "=== Health Check Complete ==="
EOF

chmod +x /opt/nanoinfluencer-marketplace/health-check.sh
```

## 📞 Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**:
   - Review application logs and error reports
   - Check system resource usage
   - Verify backup completeness
   - Update security patches

2. **Monthly**:
   - Update Docker images to latest versions
   - Review and rotate API keys
   - Performance optimization review
   - Capacity planning assessment

3. **Quarterly**:
   - Security audit and penetration testing
   - Disaster recovery testing
   - Dependencies update and vulnerability scanning
   - Architecture and scaling review

### Getting Help

- **Documentation**: Check this deployment guide and README.md
- **Logs**: Always check application and system logs first
- **Community**: GitHub Issues and Discussions
- **Professional Support**: Contact development team for enterprise support

---

## 🎉 Deployment Complete!

Your NanoInfluencer Marketplace is now deployed and ready for production use. The platform includes:

- ✅ **Scalable Architecture**: Load-balanced backend with 3 instances
- ✅ **Security**: SSL/TLS, rate limiting, input validation, and monitoring
- ✅ **Payment Processing**: Stripe integration with webhook handling
- ✅ **Social Media Integration**: Instagram, TikTok, and YouTube APIs
- ✅ **Authentication**: JWT with 2FA and email verification
- ✅ **Monitoring**: Prometheus, Grafana, and Sentry integration
- ✅ **CI/CD Pipeline**: Automated testing, security scanning, and deployment

**Next Steps**:
1. Set up domain DNS to point to your server
2. Configure monitoring alerts and thresholds
3. Set up regular backup verification
4. Create admin accounts and initial content
5. Begin user onboarding and marketing campaigns

**Happy Deploying! 🚀**