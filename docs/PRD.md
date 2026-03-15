> Last updated: 2026-03-15
> AI Context: Full product requirements for Tasky.io — B2B task management SaaS. Read this first for product vision, user stories, and feature scope.

# Tasky.io — Product Requirements Document

## 1. Product Overview

| Field | Value |
|-------|-------|
| **Product Name** | Tasky.io |
| **Type** | B2B SaaS |
| **Domain** | Team Task & Project Management |
| **Target Market** | Small-to-mid software teams, design studios, creative agencies |
| **Module** | SE4010 Current Trends in Software Engineering — SLIIT 2026 |

### Problem Statement
Small B2B teams lose productivity due to fragmented tooling: tasks in one app, time tracking in another, notifications in email, project status in spreadsheets. Tasky.io unifies these into a single event-driven platform where every action is automatically propagated across services in real time.

### Value Proposition
- One workspace for project management, task tracking, time logging, and team inbox
- Real-time event propagation — no manual syncing between features
- Built for 2026: cloud-native, containerised, event-driven, secure by default

---

## 2. Users & Roles

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| `admin` | Workspace owner / team lead | Create/delete projects, manage members, view all reports |
| `member` | Regular team contributor | View assigned projects, create/update own tasks, log time |

---

## 3. Core Features

### 3.1 Authentication (Auth Service — shared infra)
- User registration with email + password (bcrypt hashed)
- Login returns a signed JWT (7-day expiry)
- All member services validate JWT by calling `/api/auth/verify`
- No refresh tokens in v1 (out of scope)

**Acceptance Criteria:**
- `POST /api/auth/register` returns `201` with `{ token, user }` on valid input
- `POST /api/auth/login` returns `200` with `{ token, user }` or `401` on bad credentials
- `GET /api/auth/verify` returns `{ valid: true, user: { id, email, role } }` for valid JWT; `401` otherwise

---

### 3.2 User Profiles (User Service — shared infra)
- Store display name, avatar URL, role, timezone
- Emit `user.*` events on create/update/delete so downstream services react

**Acceptance Criteria:**
- `GET /api/users/me` returns own profile with `200`
- `PATCH /api/users/me` updates name/avatar, returns updated profile
- Deleting a user publishes `user.deleted` event consumed by all 4 member services

---

### 3.3 Project Management (Project Service — Member 1: Jayasuriya)
- Create and manage projects with name, description, status
- Add/remove team members per project
- Automatically tracks `totalTasks` and `completedTasks` via events (no direct DB calls to Task service)
- Project deletion cascades via events (Task service archives tasks)

**User Stories:**
- As an admin, I can create a project so my team has a shared workspace
- As an admin, I can add/remove members so access is controlled
- As any member, I can view project stats (% complete, task counts) on the project card
- As an admin, I can delete a project, and all associated tasks are automatically archived

**Acceptance Criteria:**
- `POST /api/projects` returns `201` with project object and fires `project.created` SNS event
- `GET /api/projects/:id/stats` returns `{ totalTasks, completedTasks, completionPct, lastReportAt }`
- `POST /api/projects/:id/members` fires `member.added` SNS event
- Project stats update automatically when Task service emits `task.created` / `task.completed`

---

### 3.4 Task Management (Task Service — Member 2: Piyarisi)
- Full CRUD for tasks within a project
- Task statuses: `backlog → todo → in-progress → in-review → done`
- Priority levels: `low / medium / high / urgent`
- Assignee, reporter, due date, labels
- Publish SNS events for every state change so Tracker and Inbox react automatically

**User Stories:**
- As a member, I can create a task so work is tracked
- As a member, I can move tasks through statuses on a board
- As an admin, I can assign a task to a team member
- As a member, I can see all tasks assigned to me across projects

**Acceptance Criteria:**
- `POST /api/tasks` fires `task.created` + `task.assigned` (if assigneeId present)
- `PATCH /api/tasks/:id/complete` fires `task.completed` and sets status to `done`
- `GET /api/tasks?assigneeId=X` returns only tasks assigned to user X
- Deleting a project fires `project.deleted` → Task service sets all tasks to `archived`

---

### 3.5 Time Tracking & Analytics (Tracker Service — Member 3: Manamperi)
- Manual time entry (start/end or duration) linked to a task
- Auto time entry triggered by `task.status.changed` → `in-progress` event
- Auto close time entry triggered by `task.completed` event
- Weekly dashboard: tasks completed per day (bar chart data), time logged per day
- Project reports: total time, tasks completed, milestone progress
- Milestone reached when `completedTasks / totalTasks >= threshold` (default 50%, 100%)

**User Stories:**
- As a member, I can log time against a task so effort is tracked
- As an admin, I can view a project report to see team productivity
- As a member, I can see my own time log for the week on the dashboard
- The system should auto-start tracking when I move a task to `in-progress`

**Acceptance Criteria:**
- `GET /api/tracker/dashboard` returns `{ dailyTasks: [{date, count}], dailyTime: [{date, minutes}] }` for last 7 days
- `GET /api/tracker/reports/project/:id` fires `report.generated` SNS event
- Time entry auto-created when `task.status.changed` event with `status: 'in-progress'` is received
- Time entry auto-closed when `task.completed` event is received

---

### 3.6 Inbox & Notifications (Inbox Service — Member 4: Wickramasooriya)
- Notification records created from SNS events (no polling from UI needed)
- Unread count badge
- Mark individual / all as read
- Team messages: direct text messages between workspace members
- Notification types: task assigned, task completed, member added, milestone reached, report ready

**User Stories:**
- As a member, I receive a notification when a task is assigned to me
- As a project owner, I receive a notification when a task in my project is completed
- As a manager, I receive a notification when a project report is generated
- As any member, I can send a quick message to a teammate

**Acceptance Criteria:**
- `GET /api/inbox/notifications` returns user's notifications newest-first, paginated (default 20)
- `GET /api/inbox/unread-count` returns `{ count: N }`
- Notification is created within 10s of the triggering SNS event (eventual consistency)
- `POST /api/inbox/messages` creates a message, returns `201`

---

## 4. Non-Functional Requirements

| Requirement | Target |
|------------|--------|
| Each service independently deployable | Yes — separate Docker image, ECS service, CI/CD pipeline |
| Inter-service communication | Event-driven via AWS SNS/SQS (async); HTTP only for JWT verify |
| Availability | Best-effort; single ECS task per service (demo environment) |
| Security | JWT auth, bcrypt passwords, helmet, rate limiting, SAST, IAM least-privilege |
| Observability | morgan HTTP logs, console error logging; CloudWatch via ECS |
| API documentation | Swagger UI at `/api-docs` per service |
| Code quality | SonarCloud SAST gate in every CI pipeline |
| Free tier | All AWS resources within free tier limits |

---

## 5. Out of Scope (v1)

- Frontend UI (API-only backend)
- WebSocket / real-time push (polling-based inbox)
- Multi-workspace / multi-tenancy
- File attachments
- OAuth / SSO
- Subtasks
- Kanban board view (data model supports it; UI deferred)
- Email/SMS delivery (notifications are in-app only)
- Billing / subscription management

---

## 6. Success Criteria (Assignment Demo)

- [ ] All 6 services running and accessible via public URLs (AWS ECS)
- [ ] Create task → Tracker auto-starts time entry → Inbox notifies assignee (live demo)
- [ ] Complete task → Project stats update → Tracker closes entry → Inbox notifies owner (live demo)
- [ ] Push to `main` → GitHub Actions CI runs → new image deployed to ECS (live demo)
- [ ] SonarCloud shows 0 critical/blocker issues for each service
- [ ] Swagger UI accessible for each service at `/api-docs`
