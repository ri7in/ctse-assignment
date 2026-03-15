# Tasky.io

> **SE4010 Cloud Computing Assignment — SLIIT 2026**
> Team task & project management platform built with a microservices architecture.

## Team

| Member | ID | Service |
|--------|----|---------|
| Jayasuriya L K R S | IT22891518 | Project Service |
| Piyarisi T D | IT22326690 | Task Service |
| Manamperi S A | IT22004772 | Tracker Service |
| Wickramasooriya J D A S | IT22347244 | Inbox Service |

## Architecture

```
Internet → Nginx (:3080) → Auth / User / Project / Task / Tracker / Inbox
                               ↕ Apache Kafka (self-hosted KRaft)
                         Inbox → Firebase Realtime DB → React Frontend
```

**Key technology choices:**
- **Apache Kafka** (KRaft, self-hosted) — event streaming between services
- **Nginx** — reverse proxy / single entry point (replaces AWS ALB)
- **GitHub Container Registry** — container images (replaces AWS ECR)
- **MongoDB Atlas** — one database per service
- **Firebase Realtime DB** — real-time push to frontend
- **React 18 + Vite** — SPA frontend with global EventContext
- **AWS ECS EC2** — cloud deployment (only AWS service used)

## Services

| Service | Port | Kafka Topic Published |
|---------|------|-----------------------|
| auth-service | 3000 | — |
| user-service | 3001 | `tasky.user-events` |
| project-service | 3002 | `tasky.project-events` |
| task-service | 3003 | `tasky.task-events` |
| tracker-service | 3004 | `tasky.tracker-events` |
| inbox-service | 3005 | `tasky.inbox-events` |
| frontend | — | — |

All APIs accessible via Nginx at `http://localhost:3080/api/<service>/`

## Quick Start

### Prerequisites
- Docker Desktop 4.x+
- Node.js 20 LTS

### 1. Clone & configure environment

```bash
git clone <repo-url>
cd ctse-assignment

cp auth-service/.env.example     auth-service/.env
cp user-service/.env.example     user-service/.env
cp project-service/.env.example  project-service/.env
cp task-service/.env.example     task-service/.env
cp tracker-service/.env.example  tracker-service/.env
cp inbox-service/.env.example    inbox-service/.env
cp frontend/.env.example         frontend/.env
```

Fill in `inbox-service/.env` with your Firebase credentials.

### 2. Run everything

```bash
docker-compose up --build
```

First run takes ~3-4 minutes (downloads Kafka, Mongo, builds all images).

### 3. Access

| URL | Description |
|-----|-------------|
| http://localhost:3080 | Frontend |
| http://localhost:3080/api/auth/ | Auth API |
| http://localhost:3080/api/projects/ | Project API |
| http://localhost:3080/api/tasks/ | Task API |
| http://localhost:3080/api/tracker/ | Tracker API |
| http://localhost:3080/api/inbox/ | Inbox API |
| http://localhost:300{0-5}/api-docs | Swagger docs (per service) |

## Kubernetes (minikube)

```bash
minikube start --memory=4096 --cpus=2
eval $(minikube docker-env)
docker-compose build
kubectl apply -k infrastructure/k8s/

# Create secrets
kubectl create secret generic tasky-secrets -n tasky \
  --from-literal=JWT_SECRET=<secret> \
  --from-literal=MONGODB_URI_AUTH=<uri> \
  --from-literal=MONGODB_URI_USERS=<uri> \
  --from-literal=MONGODB_URI_PROJECTS=<uri> \
  --from-literal=MONGODB_URI_TASKS=<uri> \
  --from-literal=MONGODB_URI_TRACKER=<uri> \
  --from-literal=MONGODB_URI_INBOX=<uri> \
  --from-literal=FIREBASE_DATABASE_URL=<url> \
  --from-literal=FIREBASE_SERVICE_ACCOUNT=<base64-json>

minikube service nginx-svc -n tasky --url
```

## Running Tests

```bash
cd <service-dir>
npm test              # run tests
npm test -- --coverage  # with coverage
```

## CI/CD

Every service has a GitHub Actions workflow (`.github/workflows/<service>.yml`) that:
1. Runs Jest tests + coverage
2. SonarCloud SAST scan
3. Builds Docker image → pushes to `ghcr.io/tasky-io/<service>:latest`
4. Deploys to AWS ECS (force new deployment)

## Documentation

| File | Contents |
|------|----------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | System diagram, service topology, communication patterns |
| [docs/API_CONTRACTS.md](docs/API_CONTRACTS.md) | All endpoints across all services |
| [docs/EVENT_CATALOG.md](docs/EVENT_CATALOG.md) | Kafka events, payloads, producer/consumer map |
| [docs/DATA_MODELS.md](docs/DATA_MODELS.md) | MongoDB schemas |
| [docs/DEVOPS.md](docs/DEVOPS.md) | CI/CD pipelines, GitHub Secrets |
| [docs/SECURITY.md](docs/SECURITY.md) | JWT flow, IAM, rate limiting, SAST |
| [docs/LOCAL_DEV.md](docs/LOCAL_DEV.md) | Local setup guide |
| [docs/DECISIONS.md](docs/DECISIONS.md) | Architecture Decision Records |
