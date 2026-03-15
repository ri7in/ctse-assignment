> Last updated: 2026-03-15
> AI Context: Full system architecture for Tasky.io — service topology, Kafka event streaming (self-hosted), Nginx routing, Firebase real-time push, React+Vite frontend, Kubernetes manifests, and ECS cloud deployment.

# Tasky.io — Architecture

## 1. System Diagram

```
                    ┌──────────────────────────────────────────────┐
                    │           Internet (HTTP :80)                 │
                    └─────────────────────┬────────────────────────┘
                                          │
                    ┌─────────────────────▼────────────────────────┐
                    │              Nginx Container                   │
                    │         (path-based reverse proxy)            │
                    └──┬────────┬────────┬────────┬────────┬───────┘
                       │        │        │        │        │
              /api/auth │ /users │ /proj  │ /tasks │/tracker│ /inbox + /
                       │        │        │        │        │
              ┌────────▼──┐ ┌───▼───┐ ┌──▼────┐ ┌▼──────┐ ┌▼──────────┐
              │   Auth    │ │ User  │ │Project│ │ Task  │ │  Tracker  │
              │ :3000 [S] │ │ :3001 │ │ :3002 │ │ :3003 │ │  :3004    │
              │           │ │  [S]  │ │ [M1]  │ │ [M2]  │ │  [M3]     │
              └───────────┘ └───┬───┘ └──┬────┘ └───┬───┘ └─────┬─────┘
                       ▲        │        │           │           │
                       │ HTTP   └────────┴───────────┴───────────┘
                       │ verify          │ Kafka Produce / Consume
                       │ (all svcs)      ▼
              ┌─────────────────┐  ┌─────────────────────────────────────┐
              │  Inbox Service  │  │  Apache Kafka (KRaft, :9092)         │
              │  :3005  [M4]    │  │  self-hosted container — NOT AWS MSK │
              │                 │  │                                       │
              │ notifications   │  │  Topics:                             │
              │ messages        │  │    tasky.user-events                 │
              └────────┬────────┘  │    tasky.project-events              │
                       │           │    tasky.task-events                 │
                       │ Firebase  │    tasky.tracker-events              │
                       │ Admin SDK │    tasky.inbox-events                │
                       ▼           └─────────────────────────────────────┘
              ┌──────────────────┐
              │  Firebase        │
              │  Realtime DB     │  ◄── Frontend subscribes via onValue()
              │  (Google Cloud)  │
              └──────────────────┘

  ┌─────────────────────────────────────────────────────────────────────────┐
  │  Frontend: React + Vite SPA (served by Nginx at /)                      │
  │  - AuthContext: JWT state + login/logout                                 │
  │  - EventContext: Firebase subscription → real-time notification badge   │
  │  - Pages: Dashboard | Projects | Tasks | Tracker | Inbox                │
  └─────────────────────────────────────────────────────────────────────────┘

  [MongoDB Atlas M0 — external, NOT AWS]
      ├── tasktracker-auth        (auth-service)
      ├── tasktracker-users       (user-service)
      ├── tasktracker-projects    (project-service)
      ├── tasktracker-tasks       (task-service)
      ├── tasktracker-tracker     (tracker-service)
      └── tasktracker-inbox       (inbox-service)
```

---

## 2. Service Inventory

| Service | Port | Type | Owner | Publishes (topic) | Subscribes (topics) |
|---------|------|------|-------|-------------------|---------------------|
| auth-service | 3000 | Shared infra | — | — | — |
| user-service | 3001 | Shared infra | — | `tasky.user-events` | — |
| project-service | 3002 | Member service | Jayasuriya | `tasky.project-events` | task, tracker, user |
| task-service | 3003 | Member service | Piyarisi | `tasky.task-events` | project, tracker, user |
| tracker-service | 3004 | Member service | Manamperi | `tasky.tracker-events` | task, project, user |
| inbox-service | 3005 | Member service | Wickramasooriya | `tasky.inbox-events` | task, project, tracker, user |

---

## 3. Communication Patterns

### 3.1 Synchronous HTTP (JWT validation only)

Every member service calls **Auth Service** on each protected request:

```
Client → [Bearer JWT] → Member Service
                              │
                              └─ GET http://auth-service:3000/api/auth/verify
                                     Authorization: Bearer <token>
                                 ← { valid: true, user: { id, email, role } }
```

This is the **only** synchronous inter-service call. All business logic flows via Kafka.

### 3.2 Asynchronous Events (Kafka — self-hosted)

**Kafka configuration:**
- Mode: KRaft (no ZooKeeper required)
- Image: `bitnami/kafka:3` (docker-compose + K8s StatefulSet)
- Broker: `kafka:9092` (docker-compose) / `kafka.tasky.svc.cluster.local:9092` (K8s)
- Client library: `kafkajs` (npm)

**Publish flow:**
```
Service action (e.g. task created)
  → producer.send({ topic: 'tasky.task-events', messages: [{ value: JSON.stringify(envelope) }] })
  → Kafka delivers to all consumer groups subscribed to that topic
  → Each consumer service processes message → commits offset
```

**Event envelope format:**
```json
{
  "event": "task.created",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:00:00.000Z",
  "data": { ... }
}
```

**Consumer groups:**
| Service | Consumer Group |
|---------|---------------|
| project-service | `tasky-project-group` |
| task-service | `tasky-task-group` |
| tracker-service | `tasky-tracker-group` |
| inbox-service | `tasky-inbox-group` |

**Error handling:** On consumer error — do not commit offset → message retried automatically on restart. After `maxRetries`, produce to `tasky.<topic>.dead-letter`.

### 3.3 Real-Time Frontend Push (Firebase)

```
inbox-service (on notification saved to MongoDB)
  → firebase-admin.database().ref('/notifications/{userId}/{id}').set(notification)

Frontend React app
  → firebase.database().ref('/notifications/{currentUserId}')
        .on('value', snapshot => EventContext.dispatch({ type: 'SET_NOTIFICATIONS', payload }))
  → Notification badge and bell icon update instantly with zero polling
```

---

## 4. Nginx Routing

```nginx
# nginx/nginx.conf (docker-compose) — same config in infrastructure/k8s/nginx/configmap.yaml
upstream auth_service    { server auth-service:3000; }
upstream user_service    { server user-service:3001; }
upstream project_service { server project-service:3002; }
upstream task_service    { server task-service:3003; }
upstream tracker_service { server tracker-service:3004; }
upstream inbox_service   { server inbox-service:3005; }
upstream frontend        { server frontend:80; }

server {
  listen 80;

  location /api/auth/     { proxy_pass http://auth_service;    }
  location /api/users/    { proxy_pass http://user_service;    }
  location /api/projects/ { proxy_pass http://project_service; }
  location /api/tasks/    { proxy_pass http://task_service;    }
  location /api/tracker/  { proxy_pass http://tracker_service; }
  location /api/inbox/    { proxy_pass http://inbox_service;   }
  location /              { proxy_pass http://frontend;        }
}
```

Single entry point: `http://localhost:3080` (docker-compose) / `http://<minikube-ip>` (K8s).
Swagger docs still directly accessible at `http://localhost:300{0-5}/api-docs`.

---

## 5. Event Flow Diagram

```
User creates a task and assigns it:
──────────────────────────────────────────────────────────────────
POST /api/tasks  { title, projectId, assigneeId }
  │
  ▼ task-service
  ├─ Save Task to MongoDB
  ├─ Kafka produce → tasky.task-events: task.created
  │     └── project-service (tasky-project-group): totalTasks++
  │     └── tracker-service (tasky-tracker-group): init baseline
  └─ Kafka produce → tasky.task-events: task.assigned
        └── inbox-service (tasky-inbox-group): notify assignee
              → save Notification to MongoDB
              → firebase-admin write → FE badge updates instantly

User moves task to in-progress:
──────────────────────────────────────────────────────────────────
PATCH /api/tasks/:id  { status: 'in-progress' }
  │
  ▼ task-service
  ├─ Update Task.status
  └─ Kafka produce → tasky.task-events: task.status.changed
        └── tracker-service: auto-start TimeEntry for assignee
        └── inbox-service: notify watchers

User completes a task:
──────────────────────────────────────────────────────────────────
PATCH /api/tasks/:id/complete
  │
  ▼ task-service
  ├─ Update Task.status = 'done'
  └─ Kafka produce → tasky.task-events: task.completed
        └── project-service: completedTasks++
        └── tracker-service: close open TimeEntry, log duration
        └── inbox-service: notify project owner → Firebase → FE

Tracker generates a report:
──────────────────────────────────────────────────────────────────
GET /api/tracker/reports/project/:id
  │
  ▼ tracker-service
  ├─ Aggregate TimeEntries + task data
  ├─ Save Report document
  └─ Kafka produce → tasky.tracker-events: report.generated
        └── project-service: update lastReportAt
        └── inbox-service: notify manager → Firebase → FE
```

---

## 6. Deployment Topology

### Local Development (docker-compose)

```
docker-compose up --build
──────────────────────────────────────────────────────────
Container        Port    Notes
─────────────────────────────────────────────────────────
nginx            3080    ← single entry point for all traffic
auth-service     3000
user-service     3001
project-service  3002
task-service     3003
tracker-service  3004
inbox-service    3005
frontend         80      ← nginx static (built) or 5173 (vite dev)
kafka            9092    ← bitnami/kafka:3, KRaft mode
mongodb          27017   ← mongo:7
```

### Kubernetes (minikube — local demo)

```
minikube start
kubectl apply -k infrastructure/k8s/
──────────────────────────────────────────────────────────
Namespace: tasky
  Deployments : nginx, auth, user, project, task, tracker, inbox, frontend
  StatefulSet : kafka (1 replica, KRaft mode, bitnami/kafka:3)
  Services    : ClusterIP per service; nginx as LoadBalancer
  ConfigMap   : nginx.conf
  Secret      : tasky-secrets (all env vars)
```

### AWS ECS (cloud — ONLY AWS service used)

```
AWS Region: us-east-1
  ECS Cluster: tasky-cluster (EC2 launch type, t2.micro)
    Tasks: nginx, auth, user, project, task, tracker, inbox, frontend, kafka

  Container images: ghcr.io/tasky-io/<service>:<git-sha>
    ↑ GitHub Container Registry (NOT AWS ECR)

  External dependencies (not AWS):
    MongoDB Atlas M0  — IP whitelist: ECS instance public IP
    Firebase          — inbox-service uses Admin SDK service account
```

---

## 7. Bounded Context Rationale

| Service | Why it's a separate service |
|---------|----------------------------|
| **Project Service** | Project lifecycle has its own governance rules (membership, status, archival). Scales independently from task volume. |
| **Task Service** | Core work-item domain. Highest write throughput. Owns the canonical task state machine. |
| **Tracker Service** | Time tracking and analytics are read-heavy and aggregation-heavy — different scaling profile from task mutations. |
| **Inbox Service** | Notification delivery is append-heavy with user-specific read state. Completely decoupled from business logic. |

Auth and User services are **platform concerns** shared across all — they don't belong to any single product team.

---

## 8. Technology Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Runtime | Node.js 20 LTS | Async I/O, large ecosystem, team familiarity |
| Framework | Express 4 | Minimal, well-documented, fast setup |
| Database | MongoDB Atlas M0 (Mongoose 8) | Flexible schema, free tier, document model |
| Event streaming | Apache Kafka 3.x (KRaft, self-hosted) | University requirement; runs as Docker container — NOT AWS MSK |
| Kafka client | kafkajs (npm) | Native Node.js, well-maintained, zero AWS dependency |
| Real-time push | Firebase Realtime Database | Google Cloud free Spark tier; instant FE notification updates |
| Load balancer | Nginx (container) | Path-based routing, free, cloud-provider independent |
| Container | Docker (node:20-alpine) | Small image (~180MB), reproducible builds |
| Container registry | GitHub Container Registry (ghcr.io) | Free for public repos, uses GITHUB_TOKEN — NOT AWS ECR |
| Orchestration (local) | Kubernetes / minikube | K8s manifests for local demo and cloud portability |
| Orchestration (cloud) | AWS ECS EC2 t2.micro | Only AWS service; free tier eligible |
| CI/CD | GitHub Actions | Free for public repos, native GHCR + ECS support |
| SAST | SonarCloud | Free for public repos, GitHub Actions integration |
| Auth | JWT HS256, 7d expiry | Stateless, works across microservices |
| Frontend | React 18 + Vite | SPA, Firebase client SDK, global EventContext provider |
| API docs | Swagger / OpenAPI 3 | `/api-docs` per service |
