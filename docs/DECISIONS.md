> Last updated: 2026-03-15
> AI Context: Architecture Decision Records (ADRs) for Tasky.io. Documents why key technical choices were made so future contributors (and AI) understand the constraints.

# Tasky.io — Architecture Decision Records

---

## ADR-001: Monorepo vs Polyrepo

**Status:** Decided — Monorepo

**Context:**
The assignment requires 4 individually deployable microservices across 4 team members, each with their own CI/CD pipeline.

**Decision:** Monorepo with path-filtered CI/CD.

**Rationale:**
- Easier to share documentation, `docker-compose.yml`, and `infrastructure/` config
- GitHub Actions path filtering (`paths: ['task-service/**']`) gives the same isolation as polyrepo
- Simplifies cross-service integration testing locally via `docker-compose`
- Single source of truth for `docs/`, `infrastructure/`, and `README.md`
- Assignment submission is one GitHub URL — simpler for examiners

**Trade-offs:**
- All members' code is visible to all (acceptable for academic context)
- `git clone` downloads all services (acceptable for ~80 files total)

---

## ADR-002: Apache Kafka vs AWS SNS/SQS for Event Streaming

**Status:** Decided — Apache Kafka (self-hosted KRaft, not AWS MSK)

**Context:**
Services need to communicate when business events occur. Options: AWS SNS/SQS (managed), Apache Kafka (self-hosted), or direct HTTP.

**Decision:** Apache Kafka 3.x in KRaft mode, running as a self-hosted container.

**Rationale:**
- **University requirement:** Kafka is explicitly required by the SE4010 assignment spec
- **Cloud-provider independence:** Self-hosted Kafka is not an AWS service — not AWS MSK. Runs identically in docker-compose, minikube, and ECS
- **No ZooKeeper:** KRaft mode (Kafka 3.x) eliminates the ZooKeeper dependency — simpler ops
- **kafkajs:** Native Node.js library, zero AWS SDK dependency
- **Decoupling:** Producer doesn't know or care about consumers. Adding a new service that reacts to `task.completed` requires zero changes to task-service
- **Resilience:** Consumer group offsets are committed after processing; unprocessed messages stay in the topic and are retried on restart

**vs AWS SNS/SQS:**
- SNS/SQS creates AWS vendor lock-in; Kafka is portable
- SQS requires a separate queue per topic per consumer (13 queues + 13 DLQs); Kafka uses consumer groups — simpler topology
- SNS/SQS requires IAM permissions; self-hosted Kafka requires none

**Trade-offs:**
- Kafka container adds ~256MB RAM overhead on ECS t2.micro (tight but workable)
- Kafka persistence requires a volume mount (included in docker-compose and K8s StatefulSet)

---

## ADR-003: MongoDB Atlas vs AWS RDS (PostgreSQL)

**Status:** Decided — MongoDB Atlas M0 (free)

**Context:**
Each service needs a database. Options: AWS RDS PostgreSQL, or MongoDB Atlas.

**Decision:** MongoDB Atlas M0 free cluster with separate database per service.

**Rationale:**
- **Free tier:** Atlas M0 is permanently free; RDS free tier expires after 12 months
- **Cloud-provider independence:** MongoDB Atlas is not an AWS service
- **Schema flexibility:** Task labels, notification metadata, report data (`data: {}` field) benefit from document model
- **Separate databases:** Each service has its own `tasktracker-<service>` database on the shared cluster — logical separation without infrastructure cost
- **Mongoose:** Clean, well-documented ODM for Node.js with built-in validation and middleware

**Trade-offs:**
- No ACID transactions across services (mitigated: each service owns its own data, no cross-service joins)
- M0 has 512MB storage limit (more than enough for demo scale)

---

## ADR-004: AWS ECS EC2 vs Kubernetes (EKS) vs Local minikube

**Status:** Decided — AWS ECS EC2 for cloud; minikube K8s for local

**Context:**
Need to deploy Docker containers to a cloud environment while keeping costs low and demonstrating modern orchestration.

**Decision:** AWS ECS EC2 (t2.micro) for cloud deployment; Kubernetes manifests with minikube for local demo.

**Rationale:**
- **ECS vs EKS:** EKS control plane costs ~$72/month. ECS EC2 with t2.micro is free for 750h/month (first 12 months). Assignment doesn't require managed K8s specifically.
- **K8s manifests for local:** Writing K8s manifests demonstrates modern container orchestration knowledge without EKS cost. Minikube runs identically on any machine.
- **ECS vs bare docker-compose on EC2:** ECS provides managed scheduling, health check restarts, and rolling deployments — required for a "managed container orchestration" demo.
- **Assignment compliance:** Assignment mentions ECS as expected option.

**Trade-offs:**
- t2.micro (1 vCPU, 1GB RAM) is tight for all containers + Kafka; containers are kept lean (128 CPU / 256MB each)
- minikube and ECS are different orchestrators — K8s manifests don't deploy to ECS directly (separate tooling)

---

## ADR-005: Node.js + Express vs Python (FastAPI) vs Go

**Status:** Decided — Node.js 20 + Express 4

**Context:**
Choice of runtime and framework for all 6 services.

**Decision:** Node.js 20 LTS with Express 4.

**Rationale:**
- Team familiarity — all members have Node.js experience
- Large ecosystem: `kafkajs`, `firebase-admin`, `mongoose`, `joi`, `helmet` all have excellent Node.js support
- Express is minimal and doesn't impose structure, allowing each service to be self-contained
- `node:20-alpine` Docker image is small (~180MB compressed)
- Jest for testing, nodemon for dev, well-understood toolchain

**Trade-offs:**
- Not as fast as Go for high-throughput (irrelevant for demo scale)
- Single-threaded (mitigated by Node.js async I/O and I/O-bound workloads)

---

## ADR-006: Centralized auth-service vs JWT validation in each service

**Status:** Decided — Centralized auth-service

**Context:**
Should each service validate JWTs independently (embed the JWT_SECRET) or call a central auth-service?

**Decision:** Central auth-service that all others call for validation.

**Rationale:**
- **Single secret management point:** If JWT_SECRET rotates, only auth-service needs updating
- **Extensibility:** Auth service can add blacklisting, refresh tokens, or OAuth in future without touching other services
- **Assignment inter-service communication:** Demonstrates synchronous HTTP inter-service communication alongside the async Kafka pattern
- **Simplicity:** Member services don't need `jsonwebtoken` as a dependency

**Trade-offs:**
- auth-service becomes a synchronous dependency — if it's down, all protected routes fail (~5-10ms latency per request)

---

## ADR-007: Nginx vs AWS ALB for Load Balancing

**Status:** Decided — Nginx (self-hosted container)

**Context:**
Need a single entry point that routes traffic to the correct backend service by URL path.

**Decision:** Nginx running as a Docker container / K8s Deployment with a `nginx.conf` defining upstream routes.

**Rationale:**
- **Cloud-provider independence:** Nginx is open-source and runs identically in docker-compose, minikube, and ECS. AWS ALB is AWS-specific.
- **Cost:** No cost. ALB incurs hourly charges (~$18/month for a single ALB) after the free tier.
- **Simplicity:** `nginx.conf` is a plain text file in the repo — fully version controlled, no cloud console required.
- **Portability:** The same nginx config works locally and in production — zero differences.

**Trade-offs:**
- Nginx container is a single point of failure (mitigated: ECS restart policy; for production add multiple nginx replicas)
- No built-in health check routing or sticky sessions (not needed for this stateless API)

---

## ADR-008: Firebase Realtime Database for Real-Time Frontend Notifications

**Status:** Decided — Firebase Realtime Database (Google Cloud free Spark tier)

**Context:**
The Inbox/Notification screen needs real-time updates when new notifications arrive, without the user having to refresh.

**Decision:** inbox-service writes notifications to Firebase Realtime DB via `firebase-admin` SDK (server-side). Frontend subscribes via Firebase client SDK `onValue()` listener.

**Rationale:**
- **Not AWS:** Firebase is Google Cloud — maintains cloud-provider independence from AWS
- **Free Spark tier:** 1GB storage, 10GB/month bandwidth — more than sufficient for demo
- **Zero polling:** Firebase pushes changes to connected clients instantly — no WebSocket server needed, no polling loop
- **Simple pattern:** `firebase-admin` write + client `onValue()` — two API calls, real-time result
- **EventContext integration:** Firebase listener updates React's `EventContext` state, which all components read from — single source of truth for FE event state

**Trade-offs:**
- Google Cloud dependency (acceptable — only for real-time push; all business data stays in MongoDB Atlas)
- Firebase service account JSON must be kept secret (stored as GitHub Secret, injected as env var)

---

## ADR-009: React + Vite Frontend with Global EventContext

**Status:** Decided — React 18 + Vite SPA

**Context:**
The Tasky.io UI mockup shows a rich dashboard. A frontend is needed to demonstrate the full system including real-time notifications.

**Decision:** React 18 + Vite SPA with a global `EventContext` React context provider as the single source of truth for real-time event state.

**Rationale:**
- **React 18:** Most widely used frontend framework in 2026; team familiarity
- **Vite:** Fast HMR dev server, optimized production build
- **EventContext pattern:** A single React context wraps the entire app and holds the Firebase subscription. All components (notification badge, inbox page, dashboard) read from this context — no duplicate subscriptions, no prop drilling
- **Served by Nginx:** The `vite build` output (static HTML/JS/CSS) is served by the same nginx container that proxies the APIs — no extra hosting needed

**EventContext shape:**
```js
{
  notifications: [],      // real-time from Firebase
  unreadCount: 0,         // derived from notifications
  dispatch: Function      // update local state optimistically
}
```

**Trade-offs:**
- Adding a frontend increases total build time and test surface
- Frontend tests are not required by the assignment (Swagger covers API testing)
