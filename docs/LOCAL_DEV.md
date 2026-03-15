> Last updated: 2026-03-15
> AI Context: Complete guide to running Tasky.io locally using docker-compose with self-hosted Kafka (KRaft) and Nginx. No LocalStack or AWS services needed for local dev.

# Tasky.io — Local Development Guide

## Prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker Desktop | 4.x+ | [docker.com](https://docker.com) |
| Node.js | 20 LTS | [nodejs.org](https://nodejs.org) |
| npm | 10+ | bundled with Node.js |
| minikube (optional) | latest | [minikube.sigs.k8s.io](https://minikube.sigs.k8s.io) |

---

## 1. Clone & Setup

```bash
git clone <repo-url>
cd ctse-assignment
```

---

## 2. Environment Files

Each service needs a `.env` file. Copy from `.env.example`:

```bash
cp auth-service/.env.example     auth-service/.env
cp user-service/.env.example     user-service/.env
cp project-service/.env.example  project-service/.env
cp task-service/.env.example     task-service/.env
cp tracker-service/.env.example  tracker-service/.env
cp inbox-service/.env.example    inbox-service/.env
cp frontend/.env.example         frontend/.env
```

### `.env` values for local development

**auth-service/.env:**
```
PORT=3000
MONGODB_URI=mongodb://mongodb:27017/tasktracker-auth
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
NODE_ENV=development
```

**user-service/.env:**
```
PORT=3001
MONGODB_URI=mongodb://mongodb:27017/tasktracker-users
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
AUTH_SERVICE_URL=http://auth-service:3000
NODE_ENV=development
KAFKA_BROKER=kafka:9092
KAFKA_CLIENT_ID=user-service
```

**project-service/.env:**
```
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/tasktracker-projects
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
AUTH_SERVICE_URL=http://auth-service:3000
NODE_ENV=development
KAFKA_BROKER=kafka:9092
KAFKA_CLIENT_ID=project-service
KAFKA_GROUP_ID=tasky-project-group
```

**task-service/.env:**
```
PORT=3003
MONGODB_URI=mongodb://mongodb:27017/tasktracker-tasks
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
AUTH_SERVICE_URL=http://auth-service:3000
NODE_ENV=development
KAFKA_BROKER=kafka:9092
KAFKA_CLIENT_ID=task-service
KAFKA_GROUP_ID=tasky-task-group
```

**tracker-service/.env:**
```
PORT=3004
MONGODB_URI=mongodb://mongodb:27017/tasktracker-tracker
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
AUTH_SERVICE_URL=http://auth-service:3000
NODE_ENV=development
KAFKA_BROKER=kafka:9092
KAFKA_CLIENT_ID=tracker-service
KAFKA_GROUP_ID=tasky-tracker-group
```

**inbox-service/.env:**
```
PORT=3005
MONGODB_URI=mongodb://mongodb:27017/tasktracker-inbox
JWT_SECRET=local-dev-secret-min-32-chars-here-ok
AUTH_SERVICE_URL=http://auth-service:3000
NODE_ENV=development
KAFKA_BROKER=kafka:9092
KAFKA_CLIENT_ID=inbox-service
KAFKA_GROUP_ID=tasky-inbox-group
FIREBASE_DATABASE_URL=https://<your-project>-default-rtdb.firebaseio.com
FIREBASE_SERVICE_ACCOUNT=<base64-encoded-service-account-json>
```

**frontend/.env:**
```
VITE_API_BASE_URL=http://localhost:3080
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"...","databaseURL":"...","projectId":"..."}
```

---

## 3. Start All Services

```bash
docker-compose up --build
```

First run takes ~3-4 minutes (downloads `bitnami/kafka:3`, `mongo:7`, builds 7 Node images + frontend).

Services will be available at:

| Service | Direct URL | Via Nginx |
|---------|-----------|-----------|
| **Nginx (entry point)** | http://localhost:3080 | — |
| Frontend | — | http://localhost:3080/ |
| Auth | http://localhost:3000 | http://localhost:3080/api/auth/ |
| User | http://localhost:3001 | http://localhost:3080/api/users/ |
| Project | http://localhost:3002 | http://localhost:3080/api/projects/ |
| Task | http://localhost:3003 | http://localhost:3080/api/tasks/ |
| Tracker | http://localhost:3004 | http://localhost:3080/api/tracker/ |
| Inbox | http://localhost:3005 | http://localhost:3080/api/inbox/ |
| Kafka | kafka:9092 | (internal only) |

Swagger docs: `http://localhost:300{0-5}/api-docs`

---

## 4. End-to-End Demo Flow

```bash
# 1. Register a user
curl -X POST http://localhost:3080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"jay@test.com","password":"Test1234!","name":"Jayasuriya"}'
# → { token: "<JWT>", user: { ... } }

# Save token
TOKEN="<paste JWT here>"

# 2. Create a project
curl -X POST http://localhost:3080/api/projects \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"Hope Redesign","description":"UI overhaul"}'
# → Kafka: tasky.project-events → project.created
# → inbox-service: welcome notification → Firebase → FE badge updates

# Save projectId
PROJECT_ID="<paste id here>"

# 3. Register assignee user
curl -X POST http://localhost:3080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"sachila@test.com","password":"Test1234!","name":"Sachila"}'
# Save assignee token + userId

# 4. Create and assign a task
curl -X POST http://localhost:3080/api/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"title\":\"Design login page\",\"projectId\":\"$PROJECT_ID\",\"assigneeId\":\"<sachila-id>\",\"priority\":\"high\"}"
# → Kafka: tasky.task-events → task.created  (project-svc: totalTasks++)
# → Kafka: tasky.task-events → task.assigned (inbox-svc: notify sachila → Firebase)

TASK_ID="<paste id here>"

# 5. Move task to in-progress (sachila)
curl -X PATCH http://localhost:3080/api/tasks/$TASK_ID \
  -H "Authorization: Bearer $SACHILA_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"in-progress"}'
# → Kafka: tasky.task-events → task.status.changed → tracker-svc: auto-creates TimeEntry

# 6. Complete the task
curl -X PATCH http://localhost:3080/api/tasks/$TASK_ID/complete \
  -H "Authorization: Bearer $SACHILA_TOKEN"
# → Kafka: tasky.task-events → task.completed
#   → project-svc: completedTasks++
#   → tracker-svc: closes TimeEntry, logs duration
#   → inbox-svc: notifies project owner (Jay) → Firebase → FE

# 7. Check notifications (as Jay)
curl http://localhost:3080/api/inbox/notifications \
  -H "Authorization: Bearer $TOKEN"
# → Should contain: "Task completed: Design login page"

# 8. Get tracker dashboard
curl http://localhost:3080/api/tracker/dashboard \
  -H "Authorization: Bearer $TOKEN"
# → dailyTasks, dailyTime for last 7 days

# 9. Generate project report
curl http://localhost:3080/api/tracker/reports/project/$PROJECT_ID \
  -H "Authorization: Bearer $TOKEN"
# → Kafka: tasky.tracker-events → report.generated → inbox-svc: notifies Jay → Firebase
```

---

## 5. Running a Single Service (without docker-compose)

Useful for development on one service. Requires Kafka and MongoDB to be running separately.

```bash
# Start only Kafka + MongoDB via docker-compose
docker-compose up kafka mongodb -d

# Run a single service
cd task-service
npm install
npm run dev   # uses nodemon
```

---

## 6. Running Tests

```bash
# All tests in one service
cd task-service
npm test

# With coverage
npm test -- --coverage

# Watch mode
npm run test:watch
```

---

## 7. Viewing Kafka Topics

```bash
# List topics (from inside kafka container)
docker exec -it ctse-assignment-kafka-1 \
  kafka-topics.sh --list --bootstrap-server localhost:9092

# Describe a topic
docker exec -it ctse-assignment-kafka-1 \
  kafka-topics.sh --describe --topic tasky.task-events --bootstrap-server localhost:9092

# Consume messages from a topic (live tail)
docker exec -it ctse-assignment-kafka-1 \
  kafka-console-consumer.sh \
    --bootstrap-server localhost:9092 \
    --topic tasky.task-events \
    --from-beginning
```

---

## 8. Kubernetes Local (minikube)

```bash
# Start minikube
minikube start --memory=4096 --cpus=2

# Point Docker to minikube's daemon (builds go directly into minikube)
eval $(minikube docker-env)

# Build all images
docker-compose build

# Deploy to K8s
kubectl apply -k infrastructure/k8s/

# Get nginx URL
minikube service nginx-svc -n tasky --url

# Check pods
kubectl get pods -n tasky

# View logs
kubectl logs -n tasky deployment/task-service -f
```

---

## 9. Stopping & Cleanup

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (wipes MongoDB data)
docker-compose down -v

# Stop minikube
minikube stop

# Delete minikube cluster
minikube delete
```
