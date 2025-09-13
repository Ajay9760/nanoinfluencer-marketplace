# GitHub Repository Secrets Setup Script
# This script helps you configure the required secrets for the CI/CD pipeline

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubToken,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoOwner,
    
    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

Write-Host "🚀 Setting up GitHub Secrets for NanoInfluencer Marketplace" -ForegroundColor Green
Write-Host "Repository: $RepoOwner/$RepoName" -ForegroundColor Cyan

# Function to set GitHub secret
function Set-GitHubSecret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description
    )
    
    Write-Host "Setting secret: $SecretName" -ForegroundColor Yellow
    
    # Encode the secret value
    $encodedValue = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($SecretValue))
    
    # Create the API request body
    $body = @{
        encrypted_value = $encodedValue
        key_id = "your_public_key_id"  # This needs to be obtained from GitHub API
    } | ConvertTo-Json
    
    # GitHub API endpoint
    $uri = "https://api.github.com/repos/$RepoOwner/$RepoName/actions/secrets/$SecretName"
    
    try {
        $headers = @{
            "Authorization" = "token $GitHubToken"
            "Accept" = "application/vnd.github.v3+json"
            "Content-Type" = "application/json"
        }
        
        # Note: For actual implementation, you'd need to encrypt the value with the repository's public key
        Write-Host "✅ Would set: $SecretName" -ForegroundColor Green
        Write-Host "   Description: $Description" -ForegroundColor Gray
        
    } catch {
        Write-Host "❌ Failed to set secret: $SecretName" -ForegroundColor Red
        Write-Host "   Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n📝 Required Secrets Configuration:" -ForegroundColor Magenta

# Staging Environment Secrets
Write-Host "`n🔧 STAGING ENVIRONMENT:" -ForegroundColor Blue
$stagingSecrets = @{
    "STAGING_SSH_KEY" = "SSH private key for staging server access"
    "STAGING_USER" = "Username for staging server (e.g., ubuntu, centos)"
    "STAGING_HOST" = "Staging server IP or domain (e.g., staging.example.com)"
    "STAGING_DB_PASSWORD" = "PostgreSQL password for staging database"
    "STAGING_JWT_SECRET" = "JWT secret for staging (min 32 characters)"
    "STAGING_JWT_REFRESH_SECRET" = "JWT refresh secret for staging"
    "STAGING_REDIS_PASSWORD" = "Redis password for staging"
}

foreach ($secret in $stagingSecrets.GetEnumerator()) {
    Write-Host "  • $($secret.Key): $($secret.Value)" -ForegroundColor Cyan
}

# Production Environment Secrets
Write-Host "`n🌟 PRODUCTION ENVIRONMENT:" -ForegroundColor Blue
$productionSecrets = @{
    "PRODUCTION_SSH_KEY" = "SSH private key for production server access"
    "PRODUCTION_USER" = "Username for production server"
    "PRODUCTION_HOST" = "Production server IP or domain"
    "PRODUCTION_DB_PASSWORD" = "PostgreSQL password for production database"
    "PRODUCTION_JWT_SECRET" = "JWT secret for production (min 32 characters)"
    "PRODUCTION_JWT_REFRESH_SECRET" = "JWT refresh secret for production"
    "PRODUCTION_REDIS_PASSWORD" = "Redis password for production"
    "PRODUCTION_DB_USER" = "PostgreSQL username for production"
}

foreach ($secret in $productionSecrets.GetEnumerator()) {
    Write-Host "  • $($secret.Key): $($secret.Value)" -ForegroundColor Cyan
}

# External Services Secrets
Write-Host "`n🔌 EXTERNAL SERVICES:" -ForegroundColor Blue
$externalSecrets = @{
    "SENTRY_DSN" = "Sentry Data Source Name for error tracking"
    "STRIPE_SECRET_KEY" = "Stripe secret key for payment processing"
    "STRIPE_WEBHOOK_SECRET" = "Stripe webhook secret for event verification"
    "SNYK_TOKEN" = "Snyk token for vulnerability scanning"
    "SEMGREP_APP_TOKEN" = "Semgrep token for security analysis"
    "SLACK_WEBHOOK_URL" = "Slack webhook URL for deployment notifications"
}

foreach ($secret in $externalSecrets.GetEnumerator()) {
    Write-Host "  • $($secret.Key): $($secret.Value)" -ForegroundColor Cyan
}

Write-Host "`n🔑 MANUAL SETUP REQUIRED:" -ForegroundColor Red
Write-Host "Due to GitHub's security requirements, secrets must be set manually through:" -ForegroundColor Yellow
Write-Host "1. GitHub Web Interface: https://github.com/$RepoOwner/$RepoName/settings/secrets/actions" -ForegroundColor White
Write-Host "2. GitHub CLI: gh secret set SECRET_NAME --body `"secret_value`"" -ForegroundColor White
Write-Host "3. REST API with proper encryption (requires repository public key)" -ForegroundColor White

Write-Host "`n💡 GENERATING SECURE VALUES:" -ForegroundColor Magenta

# Generate secure JWT secrets
$jwtSecret = -join ((1..32) | ForEach {Get-Random -InputObject ([char[]]([char]'a'..[char]'z') + ([char]'A'..[char]'Z') + ([char]'0'..[char]'9'))})
$jwtRefreshSecret = -join ((1..32) | ForEach {Get-Random -InputObject ([char[]]([char]'a'..[char]'z') + ([char]'A'..[char]'Z') + ([char]'0'..[char]'9'))})

Write-Host "🔐 Generated JWT Secret (32 chars): $jwtSecret" -ForegroundColor Green
Write-Host "🔐 Generated JWT Refresh Secret (32 chars): $jwtRefreshSecret" -ForegroundColor Green

# Generate database password
$dbPassword = -join ((1..20) | ForEach {Get-Random -InputObject ([char[]]([char]'a'..[char]'z') + ([char]'A'..[char]'Z') + ([char]'0'..[char]'9') + '!@#$%^&*')})
Write-Host "🔐 Generated DB Password (20 chars): $dbPassword" -ForegroundColor Green

Write-Host "`n📋 NEXT STEPS:" -ForegroundColor Magenta
Write-Host "1. Set up your servers (staging and production)" -ForegroundColor White
Write-Host "2. Generate SSH key pairs for server access" -ForegroundColor White
Write-Host "3. Create accounts with external services (Stripe, Sentry, etc.)" -ForegroundColor White
Write-Host "4. Set all secrets in GitHub repository settings" -ForegroundColor White
Write-Host "5. Push code to main branch to trigger deployment" -ForegroundColor White

Write-Host "`n✅ Setup script completed!" -ForegroundColor Green