> Last updated: 2026-03-15
> AI Context: Complete event catalog for Tasky.io. Every Kafka event name, its producer topic, all consumers (consumer groups), full payload schema, and the business action each consumer takes.

# Tasky.io — Event Catalog

## Overview

Tasky.io uses **Apache Kafka** (self-hosted, KRaft mode) for event streaming. Each service owns **one Kafka topic** and publishes all its events there. Other services subscribe via their own **consumer group** — each consumer group receives every message on that topic exactly once.

### Standard Envelope (all events)
```json
{
  "event": "<domain>.<action>",
  "source": "<service-name>",
  "version": "1.0",
  "timestamp": "<ISO 8601 UTC>",
  "data": { ... }
}
```

### Kafka Topic → Consumer Group Matrix

| Topic | project-svc (`tasky-project-group`) | task-svc (`tasky-task-group`) | tracker-svc (`tasky-tracker-group`) | inbox-svc (`tasky-inbox-group`) |
|-------|--------------------------------------|-------------------------------|--------------------------------------|----------------------------------|
| `tasky.user-events` | ✓ | ✓ | ✓ | ✓ |
| `tasky.project-events` | — | ✓ | ✓ | ✓ |
| `tasky.task-events` | ✓ | — | ✓ | ✓ |
| `tasky.tracker-events` | ✓ | ✓ | — | ✓ |
| `tasky.inbox-events` | — | — | — | — |

> `tasky.inbox-events` are published for audit/extensibility but no service subscribes in v1.

---

## User Service Events (`tasky-user-events`)

### `user.registered`
**Trigger:** New user completes registration
**Producer:** user-service
**Consumers:** *(none in v1 — informational)*

```json
{
  "event": "user.registered",
  "source": "user-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:00:00Z",
  "data": {
    "userId": "6601abc123",
    "email": "jay@example.com",
    "name": "Jayasuriya",
    "role": "member"
  }
}
```

---

### `user.updated`
**Trigger:** User profile updated
**Producer:** user-service
**Consumers:** *(none in v1)*

```json
{
  "event": "user.updated",
  "source": "user-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:05:00Z",
  "data": {
    "userId": "6601abc123",
    "changes": { "name": "Jay S", "timezone": "UTC" }
  }
}
```

---

### `user.deleted`
**Trigger:** Admin deletes a user account
**Producer:** user-service
**Consumers:**
- **project-service** → Remove user from all project `members` arrays
- **task-service** → Set `assigneeId = null` on all tasks assigned to this user; anonymize `reporterId`
- **tracker-service** → Anonymize all TimeEntry records (set `userId = "deleted-user"`)
- **inbox-service** → Delete all notifications and messages for this user

```json
{
  "event": "user.deleted",
  "source": "user-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:10:00Z",
  "data": {
    "userId": "6601abc123"
  }
}
```

---

### `user.invited`
**Trigger:** Admin invites a new user to the workspace
**Producer:** user-service
**Consumers:**
- **inbox-service** → Create notification for invited user: "You've been invited to Tasky.io"

```json
{
  "event": "user.invited",
  "source": "user-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:15:00Z",
  "data": {
    "userId": "6601def456",
    "email": "sachila@example.com",
    "invitedBy": "6601abc123"
  }
}
```

---

## Project Service Events (`tasky-project-events`)

### `project.created`
**Trigger:** Admin creates a new project
**Producer:** project-service
**Consumers:**
- **tracker-service** → Initialize tracker baseline record for this project (totalTime=0, tasksCompleted=0)
- **inbox-service** → Create welcome notification for project owner

```json
{
  "event": "project.created",
  "source": "project-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:20:00Z",
  "data": {
    "projectId": "6602aaa111",
    "name": "Hope Redesign",
    "ownerId": "6601abc123",
    "members": ["6601abc123"]
  }
}
```

---

### `project.updated`
**Trigger:** Project name/description/status updated
**Producer:** project-service
**Consumers:** *(none in v1)*

```json
{
  "event": "project.updated",
  "source": "project-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:25:00Z",
  "data": {
    "projectId": "6602aaa111",
    "changes": { "status": "completed" },
    "actorId": "6601abc123"
  }
}
```

---

### `project.deleted`
**Trigger:** Admin deletes a project
**Producer:** project-service
**Consumers:**
- **task-service** → Set `status = 'archived'` on all tasks where `projectId` matches

```json
{
  "event": "project.deleted",
  "source": "project-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:30:00Z",
  "data": {
    "projectId": "6602aaa111",
    "actorId": "6601abc123"
  }
}
```

---

### `member.added`
**Trigger:** User added to a project
**Producer:** project-service
**Consumers:**
- **inbox-service** → Create notification for the added user: "You were added to project: {name}"

```json
{
  "event": "member.added",
  "source": "project-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:35:00Z",
  "data": {
    "projectId": "6602aaa111",
    "projectName": "Hope Redesign",
    "userId": "6601def456",
    "addedBy": "6601abc123"
  }
}
```

---

### `member.removed`
**Trigger:** User removed from a project
**Producer:** project-service
**Consumers:**
- **task-service** → Unassign all tasks in this project that are assigned to this user (`assigneeId = null`)

```json
{
  "event": "member.removed",
  "source": "project-service",
  "version": "1.0",
  "timestamp": "2026-03-15T10:40:00Z",
  "data": {
    "projectId": "6602aaa111",
    "userId": "6601def456",
    "removedBy": "6601abc123"
  }
}
```

---

## Task Service Events (`tasky-task-events`)

### `task.created`
**Trigger:** New task created
**Producer:** task-service
**Consumers:**
- **project-service** → Increment `project.totalTasks` by 1
- **tracker-service** → No direct action (wait for status change)
- **inbox-service** → No notification for creation without assignee

```json
{
  "event": "task.created",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T11:00:00Z",
  "data": {
    "taskId": "6603bbb222",
    "title": "Design login page",
    "projectId": "6602aaa111",
    "reporterId": "6601abc123",
    "assigneeId": null,
    "priority": "high",
    "status": "todo"
  }
}
```

---

### `task.assigned`
**Trigger:** Task assigned to a user (on create or via PATCH /assign)
**Producer:** task-service
**Consumers:**
- **inbox-service** → Create notification for assignee: "New task assigned to you: {title}"

```json
{
  "event": "task.assigned",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T11:05:00Z",
  "data": {
    "taskId": "6603bbb222",
    "title": "Design login page",
    "projectId": "6602aaa111",
    "assigneeId": "6601def456",
    "actorId": "6601abc123"
  }
}
```

---

### `task.status.changed`
**Trigger:** Task status updated (todo → in-progress, in-progress → in-review, etc.)
**Producer:** task-service
**Consumers:**
- **tracker-service** → If `newStatus === 'in-progress'`: create open TimeEntry for assignee. If `newStatus !== 'in-progress'` and entry open: close it.
- **inbox-service** → Notify task watchers (in v1: just assignee and reporter) of status change

```json
{
  "event": "task.status.changed",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T11:10:00Z",
  "data": {
    "taskId": "6603bbb222",
    "title": "Design login page",
    "projectId": "6602aaa111",
    "assigneeId": "6601def456",
    "oldStatus": "todo",
    "newStatus": "in-progress",
    "actorId": "6601def456"
  }
}
```

---

### `task.completed`
**Trigger:** Task marked as done via `PATCH /tasks/:id/complete`
**Producer:** task-service
**Consumers:**
- **project-service** → Increment `project.completedTasks` by 1
- **tracker-service** → Close open TimeEntry for this task, calculate and save `duration`
- **inbox-service** → Notify project owner: "Task completed: {title}"

```json
{
  "event": "task.completed",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T15:00:00Z",
  "data": {
    "taskId": "6603bbb222",
    "title": "Design login page",
    "projectId": "6602aaa111",
    "assigneeId": "6601def456",
    "completedBy": "6601def456"
  }
}
```

---

### `task.updated`
**Trigger:** Task fields updated (title, description, priority, labels, dueDate)
**Producer:** task-service
**Consumers:**
- **inbox-service** → If priority changed to 'urgent': notify assignee

```json
{
  "event": "task.updated",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T12:00:00Z",
  "data": {
    "taskId": "6603bbb222",
    "projectId": "6602aaa111",
    "changes": { "priority": "urgent", "dueDate": "2026-03-20T00:00:00Z" },
    "actorId": "6601abc123"
  }
}
```

---

### `task.deleted`
**Trigger:** Task deleted
**Producer:** task-service
**Consumers:**
- **project-service** → Decrement `project.totalTasks` (and `completedTasks` if task was done)
- **tracker-service** → Delete all TimeEntry records for this task

```json
{
  "event": "task.deleted",
  "source": "task-service",
  "version": "1.0",
  "timestamp": "2026-03-15T16:00:00Z",
  "data": {
    "taskId": "6603bbb222",
    "projectId": "6602aaa111",
    "wasCompleted": false,
    "actorId": "6601abc123"
  }
}
```

---

## Tracker Service Events (`tasky-tracker-events`)

### `timeEntry.logged`
**Trigger:** Time entry created (manually or auto)
**Producer:** tracker-service
**Consumers:**
- **task-service** → Add `duration` to `task.trackedTime` field
- **project-service** → Update `project.lastReportAt` (no, this is for reports — no action here)

```json
{
  "event": "timeEntry.logged",
  "source": "tracker-service",
  "version": "1.0",
  "timestamp": "2026-03-15T17:00:00Z",
  "data": {
    "entryId": "6604ccc333",
    "taskId": "6603bbb222",
    "projectId": "6602aaa111",
    "userId": "6601def456",
    "duration": 120
  }
}
```

---

### `timeEntry.updated`
**Trigger:** Time entry manually updated
**Producer:** tracker-service
**Consumers:** *(none in v1)*

---

### `timeEntry.deleted`
**Trigger:** Time entry deleted
**Producer:** tracker-service
**Consumers:**
- **task-service** → Subtract `duration` from `task.trackedTime`

```json
{
  "event": "timeEntry.deleted",
  "source": "tracker-service",
  "version": "1.0",
  "timestamp": "2026-03-15T17:30:00Z",
  "data": {
    "entryId": "6604ccc333",
    "taskId": "6603bbb222",
    "duration": 120
  }
}
```

---

### `report.generated`
**Trigger:** Project report generated via `GET /tracker/reports/project/:id`
**Producer:** tracker-service
**Consumers:**
- **project-service** → Update `project.lastReportAt`
- **inbox-service** → Notify project admin: "Your project report for {name} is ready"

```json
{
  "event": "report.generated",
  "source": "tracker-service",
  "version": "1.0",
  "timestamp": "2026-03-15T18:00:00Z",
  "data": {
    "reportId": "6604ddd444",
    "projectId": "6602aaa111",
    "projectName": "Hope Redesign",
    "generatedBy": "6601abc123",
    "totalMinutes": 3600,
    "tasksCompleted": 8
  }
}
```

---

### `milestone.reached`
**Trigger:** Project completion crosses a threshold (50% or 100%)
**Producer:** tracker-service
**Consumers:**
- **inbox-service** → Notify all project members: "Project {name} reached {pct}% completion!"

```json
{
  "event": "milestone.reached",
  "source": "tracker-service",
  "version": "1.0",
  "timestamp": "2026-03-15T18:30:00Z",
  "data": {
    "projectId": "6602aaa111",
    "projectName": "Hope Redesign",
    "milestone": 50,
    "members": ["6601abc123", "6601def456"]
  }
}
```

---

## Inbox Service Events (`tasky-inbox-events`)

### `notification.sent`
**Trigger:** Notification created in inbox-service
**Producer:** inbox-service
**Consumers:** *(none in v1 — published for extensibility/audit)*

```json
{
  "event": "notification.sent",
  "source": "inbox-service",
  "version": "1.0",
  "timestamp": "2026-03-15T19:00:00Z",
  "data": {
    "notificationId": "6605eee555",
    "userId": "6601def456",
    "event": "task.assigned",
    "title": "New task assigned"
  }
}
```

---

### `notification.read`
**Trigger:** User marks notification as read
**Producer:** inbox-service
**Consumers:** *(none in v1)*

---

### `notification.dismissed`
**Trigger:** User deletes a notification
**Producer:** inbox-service
**Consumers:** *(none in v1)*
