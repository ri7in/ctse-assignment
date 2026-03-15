> Last updated: 2026-03-15
> AI Context: CI/CD pipeline for all Tasky.io services. GitHub Actions workflows push images to GHCR (not ECR) and deploy to AWS ECS. No SNS/SQS/ECR secrets needed.

# Tasky.io — DevOps

## CI/CD Overview

Each service has its own GitHub Actions workflow. Pipelines trigger on push to `main` only when files in that service's directory change (path filtering).

```
Push to main (e.g. changes in task-service/)
    │
    ▼
1. Checkout code
2. Setup Node.js 20
3. npm ci (clean install)
4. Run Jest tests + generate coverage (lcov)
5. SonarCloud SAST scan
6. Login to GHCR (docker login ghcr.io — uses GITHUB_TOKEN, no AWS needed)
7. Build Docker image
8. Push to ghcr.io/tasky-io/<service>:latest + git SHA
9. Configure AWS credentials (for ECS deploy only)
10. Download current ECS task definition
11. Render new ECS task definition JSON with updated image URI
12. Deploy to ECS (force new deployment, wait for stability)
```

---

## Workflow Template

```yaml
# .github/workflows/<service-name>.yml
name: <Service Name> CI/CD

on:
  push:
    branches: [main]
    paths:
      - '<service-dir>/**'
      - '.github/workflows/<service-name>.yml'

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: tasky-io/<service-name>
  ECS_SERVICE: tasky-<service-name>-svc
  ECS_CLUSTER: tasky-cluster
  CONTAINER_NAME: <service-name>

jobs:
  test:
    name: Test
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ./<service-dir>
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
          cache-dependency-path: ./<service-dir>/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Run tests with coverage
        run: npm test -- --coverage --coverageReporters=lcov

      - name: SonarCloud Scan
        uses: SonarSource/sonarcloud-github-action@master
        with:
          projectBaseDir: ./<service-dir>
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          SONAR_TOKEN: ${{ secrets.SONAR_TOKEN }}

  build-and-deploy:
    name: Build & Deploy
    needs: test
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write    # needed for GHCR push
    steps:
      - uses: actions/checkout@v4

      - name: Login to GitHub Container Registry
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}   # built-in, no extra secret needed

      - name: Build, tag & push Docker image to GHCR
        id: build-image
        env:
          IMAGE_TAG: ${{ github.sha }}
        run: |
          docker build -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$IMAGE_TAG \
                       -t ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest \
                       ./<service-dir>
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$IMAGE_TAG
          docker push ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:latest
          echo "image=${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}:$IMAGE_TAG" >> $GITHUB_OUTPUT

      - name: Configure AWS credentials (ECS deploy only)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Download current ECS task definition
        run: |
          aws ecs describe-task-definition \
            --task-definition ${{ env.CONTAINER_NAME }} \
            --query taskDefinition > task-definition.json

      - name: Update ECS task definition with new image
        id: task-def
        uses: aws-actions/amazon-ecs-render-task-definition@v1
        with:
          task-definition: task-definition.json
          container-name: ${{ env.CONTAINER_NAME }}
          image: ${{ steps.build-image.outputs.image }}

      - name: Deploy to ECS
        uses: aws-actions/amazon-ecs-deploy-task-definition@v1
        with:
          task-definition: ${{ steps.task-def.outputs.task-definition }}
          service: ${{ env.ECS_SERVICE }}
          cluster: ${{ env.ECS_CLUSTER }}
          wait-for-service-stability: true
```

---

## Per-Service Workflow Files

| Service | Workflow file | Service dir | ECS Service |
|---------|--------------|-------------|-------------|
| auth-service | `.github/workflows/auth-service.yml` | `auth-service/` | `tasky-auth-svc` |
| user-service | `.github/workflows/user-service.yml` | `user-service/` | `tasky-user-svc` |
| project-service | `.github/workflows/project-service.yml` | `project-service/` | `tasky-project-svc` |
| task-service | `.github/workflows/task-service.yml` | `task-service/` | `tasky-task-svc` |
| tracker-service | `.github/workflows/tracker-service.yml` | `tracker-service/` | `tasky-tracker-svc` |
| inbox-service | `.github/workflows/inbox-service.yml` | `inbox-service/` | `tasky-inbox-svc` |
| frontend | `.github/workflows/frontend.yml` | `frontend/` | `tasky-frontend-svc` |

---

## GitHub Repository Secrets

Set these in **Settings → Secrets and variables → Actions**:

### AWS (ECS deploy only — no ECR, no SNS/SQS)
| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key (ECS deploy permissions only) |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |

### GHCR
> No secret needed — uses the built-in `GITHUB_TOKEN` automatically.

### SonarCloud
| Secret | Description |
|--------|-------------|
| `SONAR_TOKEN` | SonarCloud user token (from sonarcloud.io/account/security) |

### MongoDB
| Secret | Description |
|--------|-------------|
| `MONGODB_URI_AUTH` | Atlas connection string for `tasktracker-auth` |
| `MONGODB_URI_USERS` | Atlas connection string for `tasktracker-users` |
| `MONGODB_URI_PROJECTS` | Atlas connection string for `tasktracker-projects` |
| `MONGODB_URI_TASKS` | Atlas connection string for `tasktracker-tasks` |
| `MONGODB_URI_TRACKER` | Atlas connection string for `tasktracker-tracker` |
| `MONGODB_URI_INBOX` | Atlas connection string for `tasktracker-inbox` |

### Application
| Secret | Description |
|--------|-------------|
| `JWT_SECRET` | Shared JWT signing secret (min 32 chars, random) |
| `AUTH_SERVICE_URL` | Internal URL of auth-service e.g. `http://auth-service:3000` |
| `KAFKA_BROKER` | Kafka broker address e.g. `kafka:9092` (ECS service discovery name) |

### Firebase (inbox-service + frontend)
| Secret | Description |
|--------|-------------|
| `FIREBASE_SERVICE_ACCOUNT` | Base64-encoded Firebase Admin SDK service account JSON (inbox-service) |
| `FIREBASE_DATABASE_URL` | Firebase Realtime DB URL e.g. `https://tasky-io-prod-default-rtdb.firebaseio.com` |
| `VITE_FIREBASE_CONFIG` | Firebase client config JSON string (frontend build) |

---

## SonarCloud Setup (per service)

1. Go to [sonarcloud.io](https://sonarcloud.io) → Log in with GitHub
2. Create organization `tasky-io-sliit`
3. Add project for each service
4. Each service has `sonar-project.properties`:

```properties
# sonar-project.properties (example for task-service)
sonar.projectKey=tasky-task-service
sonar.organization=tasky-io-sliit
sonar.sources=src
sonar.tests=tests
sonar.javascript.lcov.reportPaths=coverage/lcov.info
sonar.exclusions=node_modules/**,coverage/**
sonar.qualitygate.wait=true
```

---

## Deployment Checklist

**First-time setup:**
- [ ] Make GitHub repo public (for free GHCR + SonarCloud)
- [ ] Create ECS cluster `tasky-cluster` (EC2 launch type, t2.micro)
- [ ] Create ECS task definitions for all services (use `ghcr.io/tasky-io/<service>:latest`)
- [ ] Create ECS services for all tasks
- [ ] Create IAM user with ECS deploy permissions only → add as GitHub Secrets
- [ ] Create Firebase project → get service account JSON + client config
- [ ] Set all GitHub Secrets (see list above)
- [ ] Create SonarCloud projects for all services

**Per deployment (automated):**
- [ ] Push to `main` triggers workflow
- [ ] Tests pass (jest --coverage)
- [ ] SonarCloud quality gate passes
- [ ] Docker image pushed to GHCR with `latest` + SHA tags
- [ ] ECS task definition updated with new GHCR image URI
- [ ] ECS service redeployed (force new deployment)
- [ ] ECS service stability confirmed (`wait-for-service-stability: true`)
