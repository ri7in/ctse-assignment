> Last updated: 2026-03-15
> AI Context: Complete API reference for all 6 Tasky.io services. Includes request/response shapes, auth requirements, and error codes.

# Tasky.io — API Contracts

## Conventions

- Base URL (local): `http://localhost:{port}`
- Base URL (AWS): `https://<alb-dns>` (path-routed)
- All protected endpoints require: `Authorization: Bearer <JWT>`
- All request bodies: `Content-Type: application/json`
- All responses: `Content-Type: application/json`
- Timestamps: ISO 8601 UTC strings

### Standard Error Shape
```json
{ "error": "Human-readable message", "code": "MACHINE_CODE" }
```

### Common HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Validation error |
| 401 | Missing/invalid JWT |
| 403 | Forbidden (insufficient role) |
| 404 | Resource not found |
| 429 | Rate limit exceeded |
| 500 | Internal server error |

---

## Auth Service — Port 3000

### `POST /api/auth/register`
Register a new user account.

**Auth:** None

**Request:**
```json
{
  "email": "jay@example.com",
  "password": "Str0ng!Pass",
  "name": "Jayasuriya"
}
```

**Response 201:**
```json
{
  "token": "<JWT>",
  "user": { "id": "...", "email": "jay@example.com", "name": "Jayasuriya", "role": "member" }
}
```

**Errors:** `400` email already registered | `400` validation failed

---

### `POST /api/auth/login`
Login and receive a JWT.

**Auth:** None

**Request:**
```json
{ "email": "jay@example.com", "password": "Str0ng!Pass" }
```

**Response 200:**
```json
{
  "token": "<JWT>",
  "user": { "id": "...", "email": "jay@example.com", "name": "Jayasuriya", "role": "member" }
}
```

**Errors:** `401` invalid credentials | `400` validation failed

---

### `GET /api/auth/verify`
Validate a JWT. Called by all other services internally.

**Auth:** Bearer JWT

**Response 200:**
```json
{ "valid": true, "user": { "id": "...", "email": "jay@example.com", "role": "member" } }
```

**Errors:** `401` invalid or expired token

---

### `GET /health`
Health check for ALB target group.

**Auth:** None

**Response 200:** `{ "status": "ok", "service": "auth-service" }`

---

## User Service — Port 3001

### `GET /api/users/me`
Get the authenticated user's profile.

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "id": "...", "authId": "...", "name": "Jayasuriya", "avatar": null,
  "role": "admin", "timezone": "Asia/Colombo", "createdAt": "2026-03-15T..."
}
```

---

### `PATCH /api/users/me`
Update own profile.

**Auth:** Bearer JWT

**Request:**
```json
{ "name": "Jay S", "avatar": "https://...", "timezone": "UTC" }
```

**Response 200:** Updated profile object

---

### `GET /api/users/:id`
Get another user's profile by ID.

**Auth:** Bearer JWT

**Response 200:** Profile object (avatar, name, role — no sensitive fields)

**Errors:** `404` user not found

---

### `DELETE /api/users/:id`
Delete a user account. Admin only. Publishes `user.deleted`.

**Auth:** Bearer JWT (role: admin)

**Response 200:** `{ "message": "User deleted" }`

**Errors:** `403` not admin | `404` not found

---

## Project Service — Port 3002

### `POST /api/projects`
Create a new project. Publishes `project.created`.

**Auth:** Bearer JWT

**Request:**
```json
{
  "name": "Hope Redesign",
  "description": "UI/UX overhaul for Hope product",
  "status": "active"
}
```

**Response 201:**
```json
{
  "id": "...", "name": "Hope Redesign", "description": "...",
  "ownerId": "...", "members": ["<ownerId>"], "status": "active",
  "totalTasks": 0, "completedTasks": 0, "createdAt": "2026-03-15T..."
}
```

---

### `GET /api/projects`
List all projects the authenticated user is a member of.

**Auth:** Bearer JWT

**Response 200:**
```json
{ "projects": [ {...}, {...} ], "total": 2 }
```

---

### `GET /api/projects/:id`
Get single project details.

**Auth:** Bearer JWT

**Response 200:** Full project object

**Errors:** `404` | `403` not a member

---

### `PATCH /api/projects/:id`
Update project name, description, or status.

**Auth:** Bearer JWT (owner or admin)

**Request:** `{ "name": "New Name", "status": "completed" }`

**Response 200:** Updated project object. Publishes `project.updated`.

---

### `DELETE /api/projects/:id`
Delete a project. Publishes `project.deleted` (Task service archives tasks).

**Auth:** Bearer JWT (owner or admin)

**Response 200:** `{ "message": "Project deleted" }`

---

### `POST /api/projects/:id/members`
Add a member to the project. Publishes `member.added`.

**Auth:** Bearer JWT (owner or admin)

**Request:** `{ "userId": "..." }`

**Response 200:** Updated members array

**Errors:** `404` project or user not found | `409` already a member

---

### `DELETE /api/projects/:id/members/:userId`
Remove a member. Publishes `member.removed`.

**Auth:** Bearer JWT (owner or admin)

**Response 200:** `{ "message": "Member removed" }`

---

### `GET /api/projects/:id/stats`
Get project progress stats (populated via events, not DB join).

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "totalTasks": 12, "completedTasks": 5,
  "completionPct": 41.7, "lastReportAt": "2026-03-14T..."
}
```

---

## Task Service — Port 3003

### `POST /api/tasks`
Create a task. Publishes `task.created` (and `task.assigned` if assigneeId given).

**Auth:** Bearer JWT

**Request:**
```json
{
  "title": "Design login page",
  "description": "Figma mockups for auth flow",
  "projectId": "...",
  "assigneeId": "...",
  "priority": "high",
  "labels": ["design", "auth"],
  "dueDate": "2026-04-01T00:00:00Z"
}
```

**Response 201:**
```json
{
  "id": "...", "title": "Design login page", "projectId": "...",
  "assigneeId": "...", "reporterId": "...",
  "status": "todo", "priority": "high",
  "labels": ["design", "auth"], "dueDate": "...",
  "trackedTime": 0, "createdAt": "..."
}
```

---

### `GET /api/tasks`
List tasks with optional filters.

**Auth:** Bearer JWT

**Query params:** `projectId`, `assigneeId`, `status`, `priority`, `page` (default 1), `limit` (default 20)

**Response 200:**
```json
{ "tasks": [...], "total": 45, "page": 1, "pages": 3 }
```

---

### `GET /api/tasks/:id`
Get single task.

**Auth:** Bearer JWT

**Response 200:** Full task object

---

### `PATCH /api/tasks/:id`
Update task fields. Publishes `task.updated`, `task.status.changed`, or `task.assigned` depending on changed fields.

**Auth:** Bearer JWT

**Request:** Any subset of `{ title, description, status, priority, assigneeId, labels, dueDate }`

**Response 200:** Updated task object

---

### `PATCH /api/tasks/:id/assign`
Assign task to a user. Publishes `task.assigned`.

**Auth:** Bearer JWT

**Request:** `{ "assigneeId": "..." }`

**Response 200:** Updated task

---

### `PATCH /api/tasks/:id/complete`
Mark task as done. Publishes `task.completed`.

**Auth:** Bearer JWT

**Response 200:** `{ ...task, "status": "done" }`

---

### `DELETE /api/tasks/:id`
Delete a task. Publishes `task.deleted`.

**Auth:** Bearer JWT (reporter or admin)

**Response 200:** `{ "message": "Task deleted" }`

---

### `GET /api/tasks/project/:projectId`
All tasks for a project, sorted by createdAt desc.

**Auth:** Bearer JWT

**Response 200:** `{ "tasks": [...], "total": N }`

---

## Tracker Service — Port 3004

### `POST /api/tracker/entries`
Manually log a time entry.

**Auth:** Bearer JWT

**Request:**
```json
{
  "taskId": "...", "projectId": "...",
  "description": "Worked on login UI",
  "startedAt": "2026-03-15T09:00:00Z",
  "endedAt": "2026-03-15T11:00:00Z"
}
```

**Response 201:** TimeEntry object with calculated `duration` in minutes. Publishes `timeEntry.logged`.

---

### `GET /api/tracker/entries`
List time entries.

**Auth:** Bearer JWT

**Query params:** `taskId`, `userId`, `projectId`, `from` (ISO date), `to` (ISO date)

**Response 200:** `{ "entries": [...], "totalMinutes": 480 }`

---

### `PATCH /api/tracker/entries/:id`
Update a time entry description, startedAt, or endedAt. Publishes `timeEntry.updated`.

**Auth:** Bearer JWT (entry owner)

**Response 200:** Updated entry

---

### `DELETE /api/tracker/entries/:id`
Delete a time entry. Publishes `timeEntry.deleted`.

**Auth:** Bearer JWT (entry owner or admin)

**Response 200:** `{ "message": "Entry deleted" }`

---

### `GET /api/tracker/dashboard`
Weekly dashboard data for chart rendering.

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "dailyTasks": [
    { "date": "2026-03-09", "completed": 3 },
    { "date": "2026-03-10", "completed": 1 }
  ],
  "dailyTime": [
    { "date": "2026-03-09", "minutes": 240 },
    { "date": "2026-03-10", "minutes": 90 }
  ],
  "weekTotal": { "tasks": 12, "minutes": 1440 }
}
```

---

### `GET /api/tracker/reports/project/:id`
Generate (or fetch cached) project report. Publishes `report.generated`.

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "projectId": "...", "periodStart": "...", "periodEnd": "...",
  "totalMinutes": 3600, "tasksCompleted": 8,
  "byUser": [ { "userId": "...", "name": "Jay", "minutes": 1200, "tasksCompleted": 3 } ],
  "generatedAt": "..."
}
```

---

### `GET /api/tracker/reports/user/:id`
User productivity report for the current week.

**Auth:** Bearer JWT

**Response 200:** `{ "userId": "...", "totalMinutes": 480, "tasksCompleted": 4, "entries": [...] }`

---

### `GET /api/tracker/milestones/:projectId`
Check milestone progress for a project.

**Auth:** Bearer JWT

**Response 200:**
```json
{
  "projectId": "...", "totalTasks": 20, "completedTasks": 10,
  "pct": 50, "milestones": [
    { "threshold": 50, "reached": true, "reachedAt": "2026-03-14T..." },
    { "threshold": 100, "reached": false }
  ]
}
```

---

## Inbox Service — Port 3005

### `GET /api/inbox/notifications`
Get the authenticated user's notifications.

**Auth:** Bearer JWT

**Query params:** `page` (default 1), `limit` (default 20), `unreadOnly` (boolean)

**Response 200:**
```json
{
  "notifications": [
    {
      "id": "...", "event": "task.assigned", "title": "New task assigned",
      "body": "You were assigned: Design login page",
      "read": false, "metadata": { "taskId": "...", "projectId": "..." },
      "createdAt": "..."
    }
  ],
  "total": 5, "unreadCount": 3
}
```

---

### `GET /api/inbox/unread-count`
Get count of unread notifications.

**Auth:** Bearer JWT

**Response 200:** `{ "count": 3 }`

---

### `PATCH /api/inbox/notifications/:id/read`
Mark a notification as read. Publishes `notification.read`.

**Auth:** Bearer JWT

**Response 200:** `{ ...notification, "read": true }`

---

### `PATCH /api/inbox/notifications/read-all`
Mark all user's notifications as read.

**Auth:** Bearer JWT

**Response 200:** `{ "updated": 5 }`

---

### `DELETE /api/inbox/notifications/:id`
Dismiss (delete) a notification. Publishes `notification.dismissed`.

**Auth:** Bearer JWT

**Response 200:** `{ "message": "Notification dismissed" }`

---

### `GET /api/inbox/messages`
Get direct messages for the authenticated user.

**Auth:** Bearer JWT

**Query params:** `page`, `limit`

**Response 200:**
```json
{
  "messages": [
    {
      "id": "...", "senderId": "...", "senderName": "Piyarisi",
      "content": "Great work boss!", "readAt": null, "createdAt": "..."
    }
  ]
}
```

---

### `POST /api/inbox/messages`
Send a direct message to a teammate.

**Auth:** Bearer JWT

**Request:** `{ "recipientId": "...", "content": "Let's connect for a quick discussion." }`

**Response 201:** Message object

---

### `GET /health`
Health check (all services expose this).

**Auth:** None

**Response 200:** `{ "status": "ok", "service": "<service-name>" }`
