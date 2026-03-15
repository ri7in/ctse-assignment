> Last updated: 2026-03-15
> AI Context: All MongoDB/Mongoose schemas for Tasky.io. Includes field types, validation, indexes, and which service owns each collection.

# Tasky.io — Data Models

## Conventions
- All collections use MongoDB ObjectId `_id` (auto-generated)
- `createdAt` / `updatedAt` via Mongoose `timestamps: true`
- Passwords always stored as bcrypt hash — never plain text
- Cross-service references store the foreign ID as a plain string (no Mongoose populate across services)

---

## Auth Service — Database: `tasktracker-auth`

### Collection: `authusers`

```js
const AuthUserSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  password: {
    type: String,
    required: true,
    minlength: 8
    // stored as bcrypt hash (12 rounds) — never return in API responses
  }
}, { timestamps: true });

// Indexes
AuthUserSchema.index({ email: 1 }, { unique: true });
```

**Notes:**
- JWT payload: `{ id: _id, email, role }` — role comes from User Service
- Password is hashed in a pre-save hook: `this.password = await bcrypt.hash(this.password, 12)`

---

## User Service — Database: `tasktracker-users`

### Collection: `userprofiles`

```js
const UserProfileSchema = new Schema({
  authId: {
    type: String,   // references AuthUser._id (string copy, not ObjectId ref)
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  avatar: {
    type: String,
    default: null   // URL to avatar image
  },
  role: {
    type: String,
    enum: ['admin', 'member'],
    default: 'member'
  },
  timezone: {
    type: String,
    default: 'UTC'
  }
}, { timestamps: true });

// Indexes
UserProfileSchema.index({ authId: 1 }, { unique: true });
```

---

## Project Service — Database: `tasktracker-projects`

### Collection: `projects`

```js
const ProjectSchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  ownerId: {
    type: String,   // authId of creating user
    required: true
  },
  members: {
    type: [String], // array of authIds
    default: []
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'archived', 'on-hold'],
    default: 'active'
  },
  // Denormalized counters — updated via SQS event handlers
  totalTasks: {
    type: Number,
    default: 0,
    min: 0
  },
  completedTasks: {
    type: Number,
    default: 0,
    min: 0
  },
  lastReportAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes
ProjectSchema.index({ ownerId: 1 });
ProjectSchema.index({ members: 1 });
ProjectSchema.index({ status: 1 });
```

**Virtual:**
```js
ProjectSchema.virtual('completionPct').get(function () {
  if (this.totalTasks === 0) return 0;
  return Math.round((this.completedTasks / this.totalTasks) * 100 * 10) / 10;
});
```

---

## Task Service — Database: `tasktracker-tasks`

### Collection: `tasks`

```js
const TaskSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 200
  },
  description: {
    type: String,
    default: '',
    maxlength: 2000
  },
  projectId: {
    type: String,
    required: true
  },
  assigneeId: {
    type: String,
    default: null
  },
  reporterId: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['backlog', 'todo', 'in-progress', 'in-review', 'done', 'archived'],
    default: 'todo'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  labels: {
    type: [String],
    default: []
  },
  dueDate: {
    type: Date,
    default: null
  },
  // Denormalized — updated via SQS event handlers from tracker-service
  trackedTime: {
    type: Number,
    default: 0,   // total minutes logged
    min: 0
  }
}, { timestamps: true });

// Indexes
TaskSchema.index({ projectId: 1, status: 1 });
TaskSchema.index({ assigneeId: 1, status: 1 });
TaskSchema.index({ projectId: 1, createdAt: -1 });
TaskSchema.index({ status: 1 });
```

---

## Tracker Service — Database: `tasktracker-tracker`

### Collection: `timeentries`

```js
const TimeEntrySchema = new Schema({
  taskId: {
    type: String,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  userId: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  startedAt: {
    type: Date,
    required: true
  },
  endedAt: {
    type: Date,
    default: null   // null = open/running entry
  },
  duration: {
    type: Number,
    default: null   // minutes; calculated on close: Math.round((endedAt - startedAt) / 60000)
  },
  isAutoTracked: {
    type: Boolean,
    default: false  // true if created via task.status.changed event
  }
}, { timestamps: true });

// Indexes
TimeEntrySchema.index({ taskId: 1 });
TimeEntrySchema.index({ userId: 1, startedAt: -1 });
TimeEntrySchema.index({ projectId: 1, startedAt: -1 });
TimeEntrySchema.index({ endedAt: 1 });   // for finding open entries
```

### Collection: `reports`

```js
const ReportSchema = new Schema({
  projectId: {
    type: String,
    required: true
  },
  generatedBy: {
    type: String,
    required: true   // userId
  },
  periodStart: {
    type: Date,
    required: true
  },
  periodEnd: {
    type: Date,
    required: true
  },
  totalMinutes: {
    type: Number,
    default: 0
  },
  tasksCompleted: {
    type: Number,
    default: 0
  },
  // Aggregated breakdown stored as JSON for fast retrieval
  data: {
    type: Object,
    default: {}
    // Structure: { byUser: [{ userId, name, minutes, tasksCompleted }] }
  }
}, { timestamps: true });

// Indexes
ReportSchema.index({ projectId: 1, createdAt: -1 });
```

### Collection: `milestones`

```js
const MilestoneSchema = new Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  totalTasks: { type: Number, default: 0 },
  completedTasks: { type: Number, default: 0 },
  milestones: [{
    threshold: Number,   // e.g. 50 or 100 (percentage)
    reached: { type: Boolean, default: false },
    reachedAt: { type: Date, default: null }
  }]
}, { timestamps: true });

MilestoneSchema.index({ projectId: 1 }, { unique: true });
```

---

## Inbox Service — Database: `tasktracker-inbox`

### Collection: `notifications`

```js
const NotificationSchema = new Schema({
  userId: {
    type: String,
    required: true   // recipient's authId
  },
  event: {
    type: String,
    required: true   // e.g. 'task.assigned', 'milestone.reached'
  },
  title: {
    type: String,
    required: true,
    maxlength: 200
  },
  body: {
    type: String,
    required: true,
    maxlength: 500
  },
  read: {
    type: Boolean,
    default: false
  },
  metadata: {
    type: Object,
    default: {}
    // Flexible: { taskId, projectId, actorId, reportId, ... }
  }
}, { timestamps: true });

// Indexes
NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, createdAt: -1 });
```

### Collection: `messages`

```js
const MessageSchema = new Schema({
  senderId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    trim: true,
    minlength: 1,
    maxlength: 1000
  },
  readAt: {
    type: Date,
    default: null
  }
}, { timestamps: true });

// Indexes
MessageSchema.index({ recipientId: 1, createdAt: -1 });
MessageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
```
