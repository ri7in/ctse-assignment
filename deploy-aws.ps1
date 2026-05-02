# AWS Deployment Script
# Run this locally for manual deployment

param(
    [switch]$Bootstrap,
    [switch]$Deploy,
    [switch]$Destroy
)

$ErrorActionPreference = "Stop"

# Check AWS CLI configuration
try {
    $account = aws sts get-caller-identity --query Account --output text
    Write-Host "AWS Account: $account"
} catch {
    Write-Host "❌ AWS CLI not configured. Run 'aws configure' first."
    exit 1
}

# Navigate to infrastructure directory
Set-Location $PSScriptRoot/infrastructure/aws

if ($Bootstrap) {
    Write-Host "🔧 Bootstrapping CDK..."
    cdk bootstrap
}

if ($Deploy) {
    Write-Host "📦 Installing dependencies..."
    npm install

    Write-Host "🚀 Deploying to AWS..."
    cdk deploy --require-approval never

    Write-Host "✅ Deployment complete!"
    Write-Host ""
    Write-Host "🌐 Getting load balancer URL..."

    try {
        $lbDns = aws cloudformation describe-stacks --stack-name TaskyStack --query 'Stacks[0].Outputs[?OutputKey==`LoadBalancerDNS`].OutputValue' --output text
        Write-Host "Your app is available at: http://$lbDns"
    } catch {
        Write-Host "⚠️  Could not retrieve load balancer URL. Check AWS Console → CloudFormation → TaskyStack → Outputs"
    }
}

if ($Destroy) {
    Write-Host "🗑️  Destroying AWS resources..."
    cdk destroy

    Write-Host "✅ Resources destroyed!"
}

if (-not ($Bootstrap -or $Deploy -or $Destroy)) {
    Write-Host "Usage:"
    Write-Host "  .\deploy-aws.ps1 -Bootstrap    # One-time CDK setup"
    Write-Host "  .\deploy-aws.ps1 -Deploy       # Deploy application"
    Write-Host "  .\deploy-aws.ps1 -Destroy      # Remove all resources"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\deploy-aws.ps1 -Bootstrap -Deploy"
    Write-Host "  .\deploy-aws.ps1 -Deploy"
}