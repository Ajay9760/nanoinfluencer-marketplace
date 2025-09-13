# 🔑 GitHub Repository Secrets Setup

## Required Secrets for CI/CD Pipeline

To enable the automated CI/CD pipeline, you need to configure the following secrets in your GitHub repository.

### 📍 How to Add Secrets
1. Go to your GitHub repository
2. Click **Settings** > **Secrets and variables** > **Actions**
3. Click **New repository secret**
4. Add each secret below

## 🔧 Staging Environment Secrets

```
STAGING_SSH_KEY
STAGING_USER  
STAGING_HOST
STAGING_DB_PASSWORD
STAGING_JWT_SECRET
STAGING_JWT_REFRESH_SECRET
STAGING_REDIS_PASSWORD
```

## 🌟 Production Environment Secrets

```
PRODUCTION_SSH_KEY
PRODUCTION_USER
PRODUCTION_HOST
PRODUCTION_DB_PASSWORD
PRODUCTION_JWT_SECRET
PRODUCTION_JWT_REFRESH_SECRET
PRODUCTION_REDIS_PASSWORD
PRODUCTION_DB_USER
```

## 🔌 External Services Secrets

```
SENTRY_DSN
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
SNYK_TOKEN
SEMGREP_APP_TOKEN
SLACK_WEBHOOK_URL
```

## 🎯 Generated Secure Values

Use these generated secure values for your secrets:

### JWT Secrets (32+ characters each):
- JWT_SECRET: `nano_jwt_secret_2024_super_secure_development_key_32chars`
- JWT_REFRESH_SECRET: `nano_refresh_secret_2024_super_secure_dev_key_32chars`

### Database Passwords:
- Production: `NanoProd2024!SecureDB`
- Staging: `NanoStage2024!SecureDB`

### Redis Passwords:
- Production: `NanoProd2024!Redis`
- Staging: `NanoStage2024!Redis`

## 🌐 External Service Setup

### 1. Stripe (Payment Processing)
- Create account at https://stripe.com
- Get test keys for development
- Get live keys for production
- Set up webhooks for your domain

### 2. Sentry (Error Tracking)
- Create account at https://sentry.io
- Create new project
- Copy the DSN URL

### 3. Snyk (Security Scanning)
- Create account at https://snyk.io
- Generate API token
- Add to repository secrets

### 4. Semgrep (Code Analysis)
- Create account at https://semgrep.dev
- Generate app token
- Add to repository secrets

### 5. Slack (Notifications)
- Create Slack webhook URL
- Configure for deployment notifications

## 🖥️ Server Setup

### SSH Key Generation
Generate SSH key pairs for server access:
```powershell
ssh-keygen -t rsa -b 4096 -f staging_key
ssh-keygen -t rsa -b 4096 -f production_key
```

Add public keys to your servers and private keys to GitHub secrets.

## ✅ Quick Setup Checklist

- [ ] Create GitHub repository
- [ ] Add all required secrets
- [ ] Set up external services (Stripe, Sentry, etc.)
- [ ] Configure staging server
- [ ] Configure production server
- [ ] Test CI/CD pipeline
- [ ] Deploy to staging
- [ ] Deploy to production

## 🚀 Deployment Process

Once secrets are configured:

1. **Push to main branch** → Triggers CI/CD pipeline
2. **Pipeline runs**: Tests, security scans, builds
3. **Auto-deploy to staging** → Test environment ready
4. **Manual approval** → Deploy to production
5. **Production deployment** → Live application

## 🔒 Security Best Practices

- Use different passwords for staging and production
- Rotate secrets regularly
- Never commit secrets to code
- Use environment-specific API keys
- Enable 2FA on all service accounts
- Monitor secret usage and access

---

## Your Repository Setup

**GitHub Repository**: `Ajay9760/nanoinfluencer-marketplace`
**Repository URL**: https://github.com/Ajay9760/nanoinfluencer-marketplace

## Next Steps

1. **Create GitHub repository** at the URL above
2. **Add all required secrets** to your repository settings
3. **Configure external services** (Stripe, Sentry, etc.)
4. **Provision servers** for staging and production
5. **Push your code** to trigger the CI/CD pipeline
6. **Go live** with your NanoInfluencer Marketplace!

Your advanced CI/CD pipeline will handle:
- ✅ Automated testing and security scanning
- ✅ Docker image building and vulnerability scanning
- ✅ Rolling deployments with zero downtime
- ✅ Health checks and monitoring
- ✅ Slack notifications for deployment status

**Ready to deploy! 🚀**