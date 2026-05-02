# AWS Setup Helper Script
# Run this to configure AWS for Tasky deployment

param(
    [string]$Region = "us-east-1"
)

Write-Host "🚀 Tasky AWS Setup Helper"
Write-Host "=========================="
Write-Host ""

# Check if AWS CLI is installed
try {
    $version = aws --version
    Write-Host "✅ AWS CLI installed: $version"
} catch {
    Write-Host "❌ AWS CLI not installed. Download from: https://aws.amazon.com/cli/"
    Write-Host "Installation guide: https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
}

Write-Host ""
Write-Host "📋 Next steps:"
Write-Host "1. Configure AWS CLI: aws configure"
Write-Host "2. Create IAM role for GitHub Actions (see AWS_DEPLOYMENT_README.md)"
Write-Host "3. Add GitHub secrets: AWS_ACCOUNT_ID, AWS_REGION, AWS_DEPLOY_ROLE_ARN"
Write-Host "4. Push to main branch to trigger deployment"
Write-Host ""

# Check current configuration
Write-Host "🔍 Current AWS configuration:"
try {
    $identity = aws sts get-caller-identity --query 'Account' --output text 2>$null
    if ($identity) {
        Write-Host "✅ AWS Account configured: $identity"
    } else {
        Write-Host "⚠️  AWS CLI configured but no valid credentials"
    }
} catch {
    Write-Host "❌ AWS CLI not configured. Run 'aws configure'"
}

try {
    $currentRegion = aws configure get region
    if ($currentRegion) {
        Write-Host "✅ AWS Region: $currentRegion"
    } else {
        Write-Host "⚠️  No default region set"
    }
} catch {
    Write-Host "❌ Cannot get region configuration"
}

Write-Host ""
Write-Host "📚 For detailed setup instructions, see: AWS_DEPLOYMENT_README.md"
Write-Host ""
Write-Host "🎯 Quick deployment after setup:"
Write-Host "   git push origin main  # Triggers automatic deployment"