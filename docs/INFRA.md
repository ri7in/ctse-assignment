> Last updated: 2026-03-15
> AI Context: Infrastructure details for Tasky.io. Kafka topics, ECS cluster config, GHCR image names, ECS task execution IAM role. Only AWS service used is ECS EC2.

# Tasky.io — Infrastructure

## AWS Services Used

> **Policy:** Only AWS ECS is used. No SNS, SQS, ECR, ALB, or other AWS-managed services.

| Service | AWS? | Purpose |
|---------|------|---------|
| ECS EC2 t2.micro | ✅ Yes | Container orchestration (cloud deployment) |
| MongoDB Atlas M0 | ❌ No (MongoDB) | Database — one DB per service |
| Apache Kafka (KRaft) | ❌ No (self-hosted) | Event streaming — runs as a container |
| Nginx | ❌ No (open source) | Load balancer / reverse proxy |
| Firebase Realtime DB | ❌ No (Google Cloud) | Real-time frontend push |
| GHCR (ghcr.io) | ❌ No (GitHub) | Container image registry |

---

## AWS Configuration

| Setting | Value |
|---------|-------|
| **AWS Region** | `us-east-1` |
| **Account ID** | `<YOUR_AWS_ACCOUNT_ID>` |
| **ECS Cluster** | `tasky-cluster` (EC2 launch type, t2.micro) |

---

## Kafka Topics (self-hosted — NOT AWS MSK)

| Topic Name | Producer Service | Consumer Services |
|------------|-----------------|-------------------|
| `tasky.user-events` | user-service | project, task, tracker, inbox |
| `tasky.project-events` | project-service | task, tracker, inbox |
| `tasky.task-events` | task-service | project, tracker, inbox |
| `tasky.tracker-events` | tracker-service | project, task, inbox |
| `tasky.inbox-events` | inbox-service | (audit / future consumers) |

**Dead-letter topics** (auto-created on first DLQ publish):
- `tasky.task-events.dead-letter`
- `tasky.project-events.dead-letter`
- `tasky.tracker-events.dead-letter`
- `tasky.inbox-events.dead-letter`

**Kafka settings:**
- Mode: KRaft (no ZooKeeper)
- Image: `bitnami/kafka:3`
- Broker port: `9092`
- Replication factor: 1 (single-node demo)
- Partitions per topic: 3

---

## Consumer Groups

| Consumer Group | Service | Topics Subscribed |
|---------------|---------|-------------------|
| `tasky-project-group` | project-service | task, tracker, user |
| `tasky-task-group` | task-service | project, tracker, user |
| `tasky-tracker-group` | tracker-service | task, project, user |
| `tasky-inbox-group` | inbox-service | task, project, tracker, user |

---

## GitHub Container Registry (GHCR)

> Replaces AWS ECR. Uses built-in `GITHUB_TOKEN` — no separate AWS credentials for image push.

| Image | URI |
|-------|-----|
| auth-service | `ghcr.io/tasky-io/auth-service:<sha>` |
| user-service | `ghcr.io/tasky-io/user-service:<sha>` |
| project-service | `ghcr.io/tasky-io/project-service:<sha>` |
| task-service | `ghcr.io/tasky-io/task-service:<sha>` |
| tracker-service | `ghcr.io/tasky-io/tracker-service:<sha>` |
| inbox-service | `ghcr.io/tasky-io/inbox-service:<sha>` |
| frontend | `ghcr.io/tasky-io/frontend:<sha>` |
| nginx | `ghcr.io/tasky-io/nginx:<sha>` |

Image tags: `latest` + `<git-sha>` (e.g. `83f7192`)

---

## ECS Services

| ECS Service | Image | Container Port | Desired Count |
|-------------|-------|----------------|---------------|
| `tasky-nginx-svc` | `ghcr.io/tasky-io/nginx:latest` | 80 | 1 |
| `tasky-auth-svc` | `ghcr.io/tasky-io/auth-service:latest` | 3000 | 1 |
| `tasky-user-svc` | `ghcr.io/tasky-io/user-service:latest` | 3001 | 1 |
| `tasky-project-svc` | `ghcr.io/tasky-io/project-service:latest` | 3002 | 1 |
| `tasky-task-svc` | `ghcr.io/tasky-io/task-service:latest` | 3003 | 1 |
| `tasky-tracker-svc` | `ghcr.io/tasky-io/tracker-service:latest` | 3004 | 1 |
| `tasky-inbox-svc` | `ghcr.io/tasky-io/inbox-service:latest` | 3005 | 1 |
| `tasky-frontend-svc` | `ghcr.io/tasky-io/frontend:latest` | 80 | 1 |
| `tasky-kafka-svc` | `bitnami/kafka:3` | 9092 | 1 |

**ECS Cluster:** `tasky-cluster` — EC2 launch type, t2.micro (1 vCPU, 1 GB RAM)
**Container CPU/Memory:** 128 CPU units / 256 MB per task (tight on t2.micro — keep lean)

---

## IAM Roles

### `tasky-ecs-task-execution-role`
Standard ECS task execution role — allows ECS to pull images from GHCR (public registry, no IAM needed) and write logs to CloudWatch.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogs",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "arn:aws:logs:us-east-1:<ACCOUNT>:log-group:/ecs/tasky-*"
    }
  ]
}
```

> No `sns:*`, `sqs:*`, or `ecr:*` permissions — none of those services are used.

### `tasky-ecs-instance-role`
Standard EC2 instance profile for ECS — allows the EC2 instance to register with the ECS cluster.
Use the AWS managed policy: `arn:aws:iam::aws:policy/service-role/AmazonEC2ContainerServiceforEC2Role`

---

## Firebase Configuration

| Setting | Value |
|---------|-------|
| Project | `tasky-io-prod` (create at console.firebase.google.com) |
| Service | Firebase Realtime Database |
| Plan | Spark (free) |
| Database URL | `https://tasky-io-prod-default-rtdb.firebaseio.com` |
| Admin SDK | Service account JSON → base64 → `FIREBASE_SERVICE_ACCOUNT` env var |
| Client SDK | Config object → `VITE_FIREBASE_CONFIG` env var (frontend) |

**Realtime DB structure:**
```
/notifications
  /{userId}
    /{notificationId}
      event: "task.assigned"
      title: "New task assigned to you"
      body: "Design login page"
      read: false
      createdAt: "2026-03-15T10:00:00.000Z"
      metadata: { taskId, projectId, actorId }
```

---

## Free Tier Budget Check

| Resource | Monthly Usage (est.) | Free Tier Limit | Status |
|----------|---------------------|----------------|--------|
| EC2 t2.micro | 720h (1 instance) | 750h (first 12 mo) | ✅ |
| MongoDB Atlas M0 | ~50 MB | 512 MB always free | ✅ |
| Firebase Realtime DB | ~1 MB | 1 GB stored, 10 GB/mo transfer | ✅ |
| GHCR | ~300 MB images | Free for public repos | ✅ |
| Kafka (self-hosted) | Container CPU/mem | Included in EC2 cost | ✅ |
| SonarCloud | 6 project scans | Free for public repos | ✅ |
