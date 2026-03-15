> Last updated: 2026-03-15
> AI Context: Security implementation details for Tasky.io. JWT flow, bcrypt, helmet, rate limiting, minimal IAM (ECS only), SonarCloud SAST, Nginx network security.

# Tasky.io — Security

## Security Layers Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 1: Network                                           │
│  Nginx reverse proxy | ECS security group (port 80 only)   │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Application                                       │
│  JWT auth | helmet headers | CORS | rate limiting           │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: Data                                              │
│  bcrypt passwords | joi validation | no raw queries         │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Cloud                                             │
│  Minimal IAM (ECS task execution only) | secrets in env    │
├─────────────────────────────────────────────────────────────┤
│  Layer 5: DevSecOps                                         │
│  SonarCloud SAST in every CI pipeline                       │
└─────────────────────────────────────────────────────────────┘
```

---

## 1. Authentication — JWT Flow

```
Client                    Member Service              Auth Service
  │                            │                           │
  │── POST /api/auth/login ────►                           │
  │                            │                           │
  │◄── { token: JWT } ─────────│                           │
  │                            │                           │
  │── GET /api/tasks ─────────►│                           │
  │   Authorization: Bearer JWT│                           │
  │                            │── GET /api/auth/verify ──►│
  │                            │   Authorization: Bearer JWT
  │                            │◄── { valid:true, user:{} }│
  │                            │                           │
  │◄── 200 { tasks: [...] } ───│                           │
```

**JWT Details:**
- Algorithm: `HS256`
- Expiry: `7d`
- Secret: min 32 random chars, stored as GitHub Secret → ECS env var
- Payload: `{ id, email, role, iat, exp }`
- Never stored in DB; stateless validation

**auth.middleware.js pattern (all member services):**
```js
const axios = require('axios');

const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const { data } = await axios.get(`${process.env.AUTH_SERVICE_URL}/api/auth/verify`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    req.user = data.user;   // { id, email, role }
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
```

---

## 2. Password Security

- Library: `bcryptjs` (pure JS, no native deps)
- Salt rounds: **12** (OWASP recommended minimum for 2026)
- Hash computed in Mongoose pre-save hook:

```js
AuthUserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});
```

- Passwords **never** returned in API responses (`.select('-password')`)
- Comparison: `await bcrypt.compare(plainText, hash)`

---

## 3. HTTP Security Headers (helmet.js)

Applied to every service via `app.use(helmet())`. Sets:

| Header | Value | Protection |
|--------|-------|-----------|
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-XSS-Protection` | `0` (modern) | XSS (defer to CSP) |
| `Strict-Transport-Security` | `max-age=15552000` | HTTPS enforcement |
| `Content-Security-Policy` | `default-src 'self'` | XSS injection |
| `Referrer-Policy` | `no-referrer` | Info leakage |

---

## 4. Rate Limiting

```js
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                    // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

app.use('/api', limiter);
```

Auth-specific stricter limit:
```js
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });
app.use('/api/auth', authLimiter);
```

---

## 5. Input Validation (joi)

All POST and PATCH request bodies validated before controller logic:

```js
const Joi = require('joi');

const createTaskSchema = Joi.object({
  title: Joi.string().min(2).max(200).required(),
  description: Joi.string().max(2000).optional(),
  projectId: Joi.string().required(),
  assigneeId: Joi.string().optional(),
  priority: Joi.string().valid('low', 'medium', 'high', 'urgent').default('medium'),
  labels: Joi.array().items(Joi.string()).default([]),
  dueDate: Joi.date().iso().optional()
});

// validate.js middleware
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details.map(d => d.message)
    });
  }
  req.body = value;  // use sanitised value
  next();
};
```

---

## 6. CORS Configuration

Each service configures allowed origins explicitly:

```js
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3080'],
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
```

In production: `ALLOWED_ORIGINS=http://<ecs-public-ip>`

---

## 7. IAM — Minimal Permissions (ECS Only)

> No SNS, SQS, or ECR permissions. Kafka is self-hosted (no AWS messaging). Images come from GHCR (no ECR).

### `tasky-ecs-task-execution-role`
Only permission needed is CloudWatch Logs:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
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

### `tasky-ecs-instance-role`
Use AWS managed policy: `AmazonEC2ContainerServiceforEC2Role`

**What is NOT granted (intentionally):**
- ❌ `sns:*` — not used (replaced by self-hosted Kafka)
- ❌ `sqs:*` — not used
- ❌ `ecr:*` — not used (images from GHCR)
- ❌ Cross-service DB access — each service has its own Atlas URI

---

## 8. Secrets Management

| Secret type | Storage | Access |
|-------------|---------|--------|
| JWT secret | GitHub Secrets | Injected as `JWT_SECRET` ECS env var at deploy |
| MongoDB URIs | GitHub Secrets | Injected as env vars at deploy |
| Firebase service account | GitHub Secrets | Base64 JSON → `FIREBASE_SERVICE_ACCOUNT` ECS env var |
| Kafka broker URL | GitHub Secrets | Injected as `KAFKA_BROKER` ECS env var |
| AWS credentials (CI only) | GitHub Secrets | Used only in GitHub Actions runner for ECS deploy |

**Never:**
- Hardcoded credentials in source code
- `.env` files committed to Git (`.env` is in `.gitignore`)
- Secrets inside Docker images

---

## 9. SAST — SonarCloud

Every service has:
1. `sonar-project.properties` in its root
2. SonarCloud step in GitHub Actions workflow
3. `sonar.qualitygate.wait=true` — pipeline fails if quality gate fails

**Quality Gate rules (SonarCloud default):**
- 0 Blocker issues
- 0 Critical security vulnerabilities
- Code coverage > 0% (new code)
- Duplicated lines < 3%

---

## 10. Network Security

### Nginx (reverse proxy)
- Single entry point on port 80 / 3080
- Backend service ports (3000-3005) are NOT exposed externally
- Services only reachable via nginx by container-network name

### ECS Security Group
- **`sg-tasky`**: Allows inbound TCP 80 from internet (nginx only)
- All other ports (3000-3005, 9092) open only within the ECS VPC / docker network

### MongoDB Atlas
- IP Whitelist: Only ECS NAT Gateway Elastic IP allowed
- Database user: service-specific credentials per database
- No public cluster access

---

## 11. Principle of Least Privilege (Summary)

| Concern | How enforced |
|---------|-------------|
| Each service reads only its own DB | Separate MongoDB Atlas connection string per service |
| No service publishes to another's Kafka topic | By convention + code review (no IAM needed — Kafka is self-hosted) |
| No service has internet-accessible ports directly | Nginx is sole ingress; service ports only accessible within Docker/K8s network |
| Passwords never in logs/responses | Mongoose `.select('-password')` + never log req.body on auth routes |
| No secrets in Docker images | All secrets injected as env vars at runtime |
| No AWS credentials in containers | AWS credentials only in CI runner; containers use ECS task role |
