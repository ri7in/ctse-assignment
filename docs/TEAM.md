> Last updated: 2026-03-15
> AI Context: Team member details, service ownership, and contact info for Tasky.io SLIIT SE4010 assignment.

# Tasky.io — Team

## Module
**SE4010 — Current Trends in Software Engineering**
**SLIIT | Department of Computer Science & Software Engineering**
**Semester 1, 2026**

---

## Team Members

| # | Full Name | Student ID | Email | Assigned Service | Port |
|---|-----------|------------|-------|-----------------|------|
| 1 | Jayasuriya L K R S | IT22891518 | rivinsand@gmail.com | **Project Service** | 3002 |
| 2 | Piyarisi T D | IT22326690 | thusalapi@gmail.com | **Task Service** | 3003 |
| 3 | Manamperi S A | IT22004772 | sachilaawandya@gmail.com | **Tracker Service** | 3004 |
| 4 | Wickramasooriya J D A S | IT22347244 | shehanwickramasooriya05@gmail.com | **Inbox Service** | 3005 |

---

## Service Ownership Map

```
Shared Infrastructure (group-owned):
├── auth-service     → JWT authentication, no member owns individually
└── user-service     → User profiles, no member owns individually

Member Deliverables:
├── project-service  → Jayasuriya L K R S  (IT22891518)
├── task-service     → Piyarisi T D        (IT22326690)
├── tracker-service  → Manamperi S A       (IT22004772)
└── inbox-service    → Wickramasooriya J D A S (IT22347244)
```

---

## Per-Member Scope

### Member 1 — Jayasuriya L K R S (IT22891518)
**Service:** `project-service` (port 3002)

**Responsibilities:**
- Project CRUD endpoints
- Project membership management (add/remove members)
- Denormalized task counters (`totalTasks`, `completedTasks`) updated via events
- Publishes: `project.created`, `project.updated`, `project.deleted`, `member.added`, `member.removed`
- Subscribes to: `task.created`, `task.completed`, `task.deleted`, `report.generated`, `user.deleted`
- CI/CD pipeline: `.github/workflows/project-service.yml`
- ECR repo: `tasky-project-service`
- SonarCloud project key: `tasky-project-service`

---

### Member 2 — Piyarisi T D (IT22326690)
**Service:** `task-service` (port 3003)

**Responsibilities:**
- Task CRUD endpoints
- Task status state machine (backlog → todo → in-progress → in-review → done)
- Assignment and completion flows
- Publishes: `task.created`, `task.assigned`, `task.status.changed`, `task.completed`, `task.updated`, `task.deleted`
- Subscribes to: `project.deleted`, `member.removed`, `timeEntry.logged`, `timeEntry.deleted`, `user.deleted`
- CI/CD pipeline: `.github/workflows/task-service.yml`
- ECR repo: `tasky-task-service`
- SonarCloud project key: `tasky-task-service`

---

### Member 3 — Manamperi S A (IT22004772)
**Service:** `tracker-service` (port 3004)

**Responsibilities:**
- Time entry CRUD (manual + auto-triggered)
- Auto time tracking via `task.status.changed` events
- Project reports and dashboard analytics
- Milestone detection and events
- Publishes: `timeEntry.logged`, `timeEntry.updated`, `timeEntry.deleted`, `report.generated`, `milestone.reached`
- Subscribes to: `task.status.changed`, `task.completed`, `task.deleted`, `project.created`, `user.deleted`
- CI/CD pipeline: `.github/workflows/tracker-service.yml`
- ECR repo: `tasky-tracker-service`
- SonarCloud project key: `tasky-tracker-service`

---

### Member 4 — Wickramasooriya J D A S (IT22347244)
**Service:** `inbox-service` (port 3005)

**Responsibilities:**
- Notification records (created from SNS events)
- Mark read / dismiss notifications
- Direct messages between team members
- Unread count badge data
- Publishes: `notification.sent`, `notification.read`, `notification.dismissed`
- Subscribes to: `task.assigned`, `task.completed`, `task.status.changed`, `task.updated`, `member.added`, `report.generated`, `milestone.reached`, `user.invited`, `user.deleted`, `project.created`
- CI/CD pipeline: `.github/workflows/inbox-service.yml`
- ECR repo: `tasky-inbox-service`
- SonarCloud project key: `tasky-inbox-service`

---

## GitHub Repository
- **Repo:** `ctse-assignment` (public)
- **Branch strategy:** `main` is production; feature branches per service (optional)
- **PR convention:** `feat/<service>/<description>` e.g. `feat/task-service/add-complete-endpoint`
