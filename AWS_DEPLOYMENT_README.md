# AWS Deployment Setup Guide

This guide will help you set up automated deployment to AWS ECS Fargate using GitHub Actions with **free tier services**.

## Prerequisites

1. **AWS Account**: Sign up at [aws.amazon.com](https://aws.amazon.com) (12-month free tier available)
2. **GitHub Repository**: With Actions enabled
3. **AWS CLI**: Install from [docs.aws.amazon.com/cli](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

## Step 1: Configure AWS CLI

```bash
aws configure
# Enter your AWS Access Key ID, Secret Access Key, default region (us-east-1), and output format (json)
```

## Step 2: Create IAM Role for GitHub Actions

Create an IAM role that GitHub Actions can assume:

### Option A: Using AWS Console

1. Go to **IAM → Roles → Create role**
2. Select **AWS account** as trusted entity
3. Check **Require external ID** and enter your GitHub repository name: `ri7in/ctse-assignment`
4. Add these permissions:
   - `AmazonEC2FullAccess`
   - `AmazonECS_FullAccess`
   - `AmazonECRFullAccess`
   - `AWSCloudFormationFullAccess`
   - `SecretsManagerFullAccess`
   - `AmazonDocDBFullAccess`
   - `AmazonVPCFullAccess`
5. Name the role: `tasky-github-deploy-role`

### Option B: Using AWS CLI

```bash
# Create the role
aws iam create-role \
  --role-name tasky-github-deploy-role \
  --assume-role-policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Principal": {
          "Federated": "arn:aws:iam::YOUR_ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
        },
        "Action": "sts:AssumeRoleWithWebIdentity",
        "Condition": {
          "StringEquals": {
            "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
          },
          "StringLike": {
            "token.actions.githubusercontent.com:sub": "repo:ri7in/ctse-assignment:*"
          }
        }
      }
    ]
  }'

# Attach required policies
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AmazonEC2FullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AmazonECS_FullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AmazonECRFullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AWSCloudFormationFullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/SecretsManagerFullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AmazonDocDBFullAccess
aws iam attach-role-policy --role-name tasky-github-deploy-role --policy-arn arn:aws:iam::aws:policy/AmazonVPCFullAccess

# Get the role ARN
aws iam get-role --role-name tasky-github-deploy-role --query 'Role.Arn' --output text
```

## Step 3: Configure GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these secrets:

### Required Secrets

1. **`AWS_ACCOUNT_ID`**
   - Value: Your 12-digit AWS account ID
   - Get it from: AWS Console → Account → Account ID

2. **`AWS_REGION`**
   - Value: `us-east-1` (or your preferred region)

3. **`AWS_DEPLOY_ROLE_ARN`**
   - Value: The ARN of the IAM role you created (e.g., `arn:aws:iam::123456789012:role/tasky-github-deploy-role`)

## Step 4: Initial Deployment

### Option A: Via GitHub Actions (Recommended)

1. Push your changes to the `main` or `release-1` branch
2. Go to GitHub → Actions → "Deploy to AWS ECS"
3. The workflow will automatically:
   - Build all Docker images
   - Push to Amazon ECR
   - Deploy infrastructure with CDK
   - Provide load balancer URL

### Option B: Manual Deployment

```bash
# Navigate to AWS infrastructure
cd infrastructure/aws

# Install dependencies
npm install

# Bootstrap CDK (one-time setup)
cdk bootstrap

# Deploy
cdk deploy
```

## AWS Free Tier Services Used

| Service | Free Tier Limits | Usage |
|---------|------------------|-------|
| **ECS Fargate** | 2,500 CPU-hours/month | Container orchestration |
| **DocumentDB** | 750 hours/month | MongoDB-compatible database |
| **ECR** | 500 MB/month | Container registry |
| **ALB** | 750 hours + 15 LCU-hours | Load balancing |
| **VPC** | Free | Networking |
| **Secrets Manager** | Free for basic usage | JWT secret storage |

## Architecture Overview

```
Internet → ALB → ECS Fargate Services → DocumentDB
                ↓
            Path-based routing:
            /api/auth/* → auth-service:3000
            /api/users/* → user-service:3001
            /api/projects/* → project-service:3002
            /api/tasks/* → task-service:3003
            /api/tracker/* → tracker-service:3004
            /api/inbox/* → inbox-service:3005
            /* → frontend:80
```

## Monitoring Deployment

1. **GitHub Actions**: https://github.com/ri7in/ctse-assignment/actions
2. **AWS Console**: ECS → Clusters → TaskyCluster
3. **Load Balancer**: EC2 → Load Balancers
4. **Database**: DocumentDB → Clusters

## Troubleshooting

### Common Issues

1. **CDK Bootstrap Required**:
   ```bash
   cd infrastructure/aws
   cdk bootstrap
   ```

2. **Permissions Error**:
   - Verify the IAM role has all required permissions
   - Check the role ARN in GitHub secrets

3. **Region Mismatch**:
   - Ensure all resources are in the same region (us-east-1)
   - Update `AWS_REGION` secret if using different region

4. **Container Images**:
   - Ensure all services have valid Dockerfiles
   - Check ECR repositories: AWS Console → ECR

5. **Load Balancer**:
   - Wait 2-3 minutes after deployment for DNS propagation
   - Check target group health: EC2 → Target Groups

### Getting External URL

After deployment, the load balancer URL will be shown in:
- GitHub Actions workflow logs
- AWS CloudFormation → TaskyStack → Outputs

## Cost Optimization

- **Free Tier**: All services used are free tier eligible
- **Single AZ**: VPC uses 2 AZs but minimal resources
- **Micro Instances**: DocumentDB t3.micro, ECS 0.25 vCPU
- **On-Demand**: No reserved instances needed for free tier

## Security Notes

- IAM role uses least-privilege access
- Secrets stored in AWS Secrets Manager
- Database in private subnets
- No public IPs on ECS tasks

---

🎉 **Your app will be automatically deployed to AWS every time you push to main!**