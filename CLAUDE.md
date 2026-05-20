# University Management System — Developer Reference

## What This Is

Full-stack University Management System. Three roles: **Admin**, **Teacher**, **Student**.
Built as a production-learning project — every pattern chosen to mirror industry practice.

---

## Tech Stack

| Layer | Technology | Version | Why |
|---|---|---|---|
| Backend | Node.js + Express | 4.x | Minimal, explicit, industry standard for REST APIs |
| Frontend | React + Vite | React 19, Vite 8 | Fast HMR, ESM-native, component-driven |
| Styling | Tailwind CSS + shadcn/ui | 4.x | Utility-first, zero runtime, composable primitives |
| Relational DB | MySQL via Prisma ORM | Prisma **5.x** | Type-safe queries, schema-first migrations |
| Cache / OTP | Redis via ioredis | 5.x | Sub-millisecond TTL keys; OTP & rate-limit state |
| Auth | JWT + bcrypt + OTP | JWT 9.x, bcrypt 6.x | Stateless access token + httpOnly refresh cookie |
| Email | Nodemailer (Gmail) | 8.x | OTP delivery; swappable transport |
| CAPTCHA | hCaptcha | — | Bot protection on public login endpoint |

> **PINNED:** Stay on Prisma 5.x. Prisma 7 broke `env()` resolution inside `schema.prisma`. Do not upgrade until Phase 5 (Docker) where the issue is re-evaluated with the containerised env setup.

---

## Project Layout

```
/
├── client/                        React + Vite app
│   ├── src/
│   │   ├── main.jsx               Entry — mounts <App /> into #root
│   │   ├── App.jsx                ★ SINGLE SOURCE OF TRUTH for all routes
│   │   ├── context/
│   │   │   └── AuthContext.jsx    Global auth state (user, token, login, logout)
│   │   ├── lib/
│   │   │   └── api.js             Axios instance — attaches JWT, handles silent refresh
│   │   ├── components/            12 reusable UI pieces (modals, sidebar, guards)
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── ResetPasswordPage.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── TeacherDashboard.jsx
│   │       ├── StudentDashboard.jsx
│   │       ├── AnnouncementsPage.jsx  (shared teacher + student)
│   │       ├── admin/             6 pages — Users, Courses, Departments, Timetable, Announcements, StudentProfile
│   │       ├── teacher/           5 pages — Attendance, AttendanceSession, Grades, GradeEntry, Timetable
│   │       └── student/           3 pages — Attendance, Grades, Timetable
│
├── server/
│   ├── index.js                   Express bootstrap — middleware stack + route mounting
│   ├── controllers/               7 files, one per resource; all business logic lives here
│   ├── routes/                    7 files, one per resource; thin — just wires paths to controllers
│   ├── middleware/
│   │   ├── authGuard.js           JWT verification → req.user; requireRole() factory
│   │   ├── rateLimiter.js         loginLimiter (5/15min/IP), otpLimiter (3/hour)
│   │   └── errorHandler.js        Centralized error formatter — logs stack + responds {error}
│   └── lib/
│       ├── prisma.js              Singleton PrismaClient export
│       ├── redis.js               Singleton ioredis client
│       ├── mailer.js              Nodemailer transport + sendOTP helper
│       └── gradeUtils.js          Pure functions: marks → letter grade, GPA calculation
│
├── prisma/
│   ├── schema.prisma              9 models, 4 enums
│   ├── seed.js                    1 dept + 4 test users (bcrypt hashed)
│   └── migrations/
│
├── scripts/
│   └── migrate-passwords.js       One-off bcrypt migration (historical, do not re-run)
│
├── .env                           ← NEVER commit
├── .env.example                   ← Always keep in sync with .env
├── package.json                   Root: concurrently runs server + client
└── context.md                     Living session-to-session handoff doc (update after each session)
```

---

## Architecture Decisions & Their Why

### 1. Enrollment Is the Anchor Table
`Attendance` and `Grade` both foreign-key to `Enrollment.id`, not directly to `User.id`.
Consequence: if a student unenrolls and re-enrolls, old records stay attached to the old enrollment. Academic history is never accidentally mutated by a re-enroll.

### 2. Soft Delete, Never Hard Delete
Users get `isActive: false`. Courses get `isActive: false`. Hard-deleting a user would cascade-destroy their grades and attendance — academically unacceptable. Check `isActive` in queries; never add cascade deletes to these models.

### 3. Role Is Never Trusted from the Frontend
`authGuard.js` decodes the JWT and sets `req.user.role` from the **signed token payload**. No endpoint reads role from `req.body` or `req.query`. The JWT was signed by the server with `JWT_SECRET` — if it verifies, the payload is authoritative.

### 4. Silent Token Refresh via Axios Interceptor
`client/src/lib/api.js` queues all in-flight requests on a 401, fires exactly one `/auth/refresh`, then replays the queue with the new token. A user with an expired access token never sees an error — the refresh is invisible. The refresh token lives in an `httpOnly` cookie (inaccessible to JavaScript).

### 5. OTP in Redis, Not MySQL
OTPs are ephemeral — 5-minute TTL, single-use, per-email. Redis handles TTL natively via `EX 300`. Storing OTPs in MySQL would require a cron job for cleanup and would add write churn on an unrelated table.

### 6. Upsert Pattern for Grades and Attendance
Both models use `@@unique` composite constraints + Prisma `upsert()`. Re-submitting a grade for the same component, or attendance for the same date, updates the existing row — never creates a duplicate. This makes teacher UIs idempotent.

### 7. gradeUtils.js Is Pure
All letter-grade and GPA logic is in `server/lib/gradeUtils.js` as pure functions with no DB calls or side effects. Changing the grade scale means editing one file. The functions are trivially unit-testable.

---

## Auth Flow — Step by Step

```
POST /api/auth/login
  1. Detect identifier type: STU → studentId field, TCH → teacherId field, @ → email field
  2. Query DB for matching user
  3. Verify hCaptcha token with hCaptcha API  (abort on failure)
  4. bcrypt.compare(submitted, user.password)
  5. If mustResetPassword → return { mustReset: true }, no OTP issued
  6. Generate 6-digit OTP → SET redis:otp:{email} OTP EX 300
  7. Email OTP via Nodemailer
  8. Return { maskedEmail, lookupEmail }

POST /api/auth/verify-otp
  1. GET redis:otp:{email}
  2. Compare submitted OTP (string match)
  3. DEL redis:otp:{email}   ← single-use, deleted immediately
  4. Sign access token  (15 min, payload: { id, email, role })
  5. Sign refresh token (7 days)
  6. Set refresh token as httpOnly cookie (Secure: true in prod)
  7. Return { accessToken, user }

POST /api/auth/refresh   ← called automatically by Axios interceptor on 401
  1. Read refresh token from httpOnly cookie
  2. jwt.verify() with JWT_REFRESH_SECRET
  3. Return new { accessToken }

POST /api/auth/logout
  1. res.clearCookie('refreshToken')
  2. Client removes accessToken from localStorage
```

---

## Database Models at a Glance

| Model | Key Fields | Unique Constraints |
|---|---|---|
| `Department` | name, code | code |
| `User` | email, role, studentId?, teacherId?, isActive, mustResetPassword | email, studentId, teacherId |
| `Course` | code, type, credits, isActive | code |
| `Enrollment` | userId, courseId, enrolledAt | [userId, courseId] |
| `CourseTeacher` | courseId, userId | [courseId, userId] |
| `Attendance` | enrollmentId, date, present | [enrollmentId, date] |
| `Grade` | enrollmentId, component, marks, letterGrade | [enrollmentId, component] |
| `Announcement` | title, body, targetRole (String), authorId | — |
| `TimetableEntry` | courseId, teacherId, dayOfWeek, startTime, endTime, room, semester | — |

**Enums:** `Role` (ADMIN/TEACHER/STUDENT) · `CourseType` (MANDATORY/ELECTIVE) · `GradeComponent` (INTERNAL/MID_TERM/FINAL) · `DayOfWeek` (MON–SAT)

> `targetRole` on `Announcement` is a plain `String`, not the `Role` enum, because the valid values include `ALL` which has no equivalent in the `Role` enum.

---

## Grading Rules (`server/lib/gradeUtils.js`)

| Marks | Letter | GPA Points |
|---|---|---|
| ≥ 80 | O | 10.0 |
| ≥ 70 | A+ | 9.0 |
| ≥ 65 | A | 8.0 |
| ≥ 61 | B+ | 7.0 |
| ≥ 50 | B | 6.0 |
| ≥ 40 | C | 5.0 |
| ≥ 35 | P | 4.0 |
| < 35 | F | 0.0 |

- GPA is calculated **from the FINAL component only**.
- P is a bare pass (not a fail). F is the only failing grade.
- To change the scale: edit `gradeUtils.js` only — it propagates everywhere.

---

## All API Endpoints

### Auth · `/api/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | PUBLIC | Identifier + password + CAPTCHA → OTP sent |
| POST | `/verify-otp` | PUBLIC | OTP → JWT access token + refresh cookie |
| POST | `/refresh` | PUBLIC (cookie) | New access token from refresh cookie |
| POST | `/logout` | AUTH | Clear refresh cookie |
| POST | `/reset-password` | AUTH | First-login password reset |
| GET | `/me` | AUTH | Returns decoded JWT payload |

### Users · `/api/users` — ADMIN only
| Method | Path | Purpose |
|---|---|---|
| GET | `/` | Paginated list (role/isActive filters) |
| GET | `/:id` | Single user with department |
| POST | `/` | Create user — auto-generates studentId/teacherId, mustReset: true |
| PATCH | `/:id` | Update email, department, password |
| PATCH | `/:id/deactivate` | Soft-disable (isActive: false) |
| POST | `/:id/reset-password` | Admin resets password → temp password emailed |
| GET | `/departments` | All departments (dropdown data) |
| GET | `/recent-activity` | 8 most recent enrollments (dashboard widget) |

### Courses · `/api/courses`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ALL | Paginated courses with filters |
| GET | `/:id` | ALL | Course + teachers + enrollments |
| POST | `/` | ADMIN | Create course |
| PATCH | `/:id` | ADMIN | Update course |
| PATCH | `/:id/deactivate` | ADMIN | Soft-disable |
| POST | `/:id/assign-teacher` | ADMIN | Add teacher to course |
| POST | `/:id/enroll` | ADMIN | Enroll a student |
| POST | `/:id/self-enroll` | STUDENT | Student self-enroll |

### Attendance · `/api/attendance`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/courses` | TEACHER | Teacher's assigned courses |
| GET | `/:courseId/students` | TEACHER | Students enrolled in course |
| POST | `/:courseId/mark` | TEACHER | Mark attendance for a date (upsert) |
| GET | `/my` | STUDENT | Attendance % per course |

### Grades · `/api/grades`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/courses` | TEACHER | Courses with grading progress |
| GET | `/:courseId/students` | TEACHER | Students + their grade components |
| POST | `/:courseId/students/:enrollmentId` | TEACHER | Upsert one grade component |
| GET | `/my` | STUDENT | Full grade report + GPA |

### Announcements · `/api/announcements`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ALL | Paginated, scoped to caller's role |
| GET | `/:id` | ALL | Single announcement (role-gated) |
| POST | `/` | ADMIN | Create |
| PATCH | `/:id` | ADMIN | Partial update |
| DELETE | `/:id` | ADMIN | Hard delete |

### Timetable · `/api/timetable`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ALL | Entries scoped to role (admin: all; teacher/student: own) |
| GET | `/semesters` | ADMIN | Distinct semester values for dropdown |
| POST | `/` | ADMIN | Create entry |
| PATCH | `/:id` | ADMIN | Update entry |
| DELETE | `/:id` | ADMIN | Delete entry |

---

## Frontend Routes

All routes defined in `client/src/App.jsx` — **edit only this file when adding routes**.

| Path | Role | Component |
|---|---|---|
| `/` | PUBLIC | LoginPage |
| `/reset-password` | PUBLIC | ResetPasswordPage |
| `/admin` | ADMIN | AdminDashboard |
| `/admin/users` | ADMIN | UsersPage |
| `/admin/users/:id/profile` | ADMIN | StudentProfilePage |
| `/admin/courses` | ADMIN | CoursesPage |
| `/admin/departments` | ADMIN | DepartmentsPage |
| `/admin/announcements` | ADMIN | AdminAnnouncementsPage |
| `/admin/timetable` | ADMIN | AdminTimetablePage |
| `/teacher` | TEACHER | TeacherDashboard |
| `/teacher/attendance` | TEACHER | TeacherAttendancePage |
| `/teacher/attendance/:courseId` | TEACHER | AttendanceSessionPage |
| `/teacher/grades` | TEACHER | TeacherGradesPage |
| `/teacher/grades/:courseId` | TEACHER | GradeEntryPage |
| `/teacher/announcements` | TEACHER | AnnouncementsPage |
| `/teacher/timetable` | TEACHER | TeacherTimetablePage |
| `/student` | STUDENT | StudentDashboard |
| `/student/attendance` | STUDENT | StudentAttendancePage |
| `/student/grades` | STUDENT | StudentGradesPage |
| `/student/announcements` | STUDENT | AnnouncementsPage |
| `/student/timetable` | STUDENT | StudentTimetablePage |

`ProtectedRoute` wraps each role group — if `user.role` doesn't match `allowedRole`, it redirects to `/`.

---

## Development Commands

```bash
# Start everything (server :4000 + client :5173)
npm run dev

# Server only
npm run server

# Client only
npm run client

# Prisma
npx prisma migrate dev --name <migration-name>   # create + apply migration
npx prisma studio                                 # visual DB browser at localhost:5555
npx prisma db seed                                # seed test data
npx prisma generate                               # regenerate client after schema change
```

**Required `.env` variables** (see `.env.example` for full list):
```
DATABASE_URL            MySQL connection string
JWT_SECRET              Long random string — signs access tokens
JWT_REFRESH_SECRET      Different long random string — signs refresh tokens
REDIS_URL               Redis connection string
EMAIL_USER              Gmail address
EMAIL_PASS              Gmail app password (not account password)
HCAPTCHA_SECRET         hCaptcha secret key
VITE_HCAPTCHA_SITE      hCaptcha site key (client-side)
VITE_API_URL            http://localhost:4000/api (local dev)
API_PORT                4000
```

---

## Git Workflow

```
main          ← production-ready, never commit directly
  └── dev     ← integration branch
        └── feat/<name>   ← one branch per feature/fix
```

1. Branch off `dev`: `git checkout -b feat/my-feature dev`
2. Commit to feature branch, push, open PR → `dev`
3. After review: merge `dev` → `main` via PR
4. Never force-push `main` or `dev`

---

## Seed Data

| Email | Role | ID | Password |
|---|---|---|---|
| `pavitarmodgil001@gmail.com` | ADMIN | — | admin123 |
| `aman.kumar@uni.com` | TEACHER | TCH001 | teacher123 |
| `harveen.kaur@uni.com` | TEACHER | TCH002 | teacher123 |
| `aseem.kamra@uni.com` | STUDENT | STU003 | student123 |

Seeded department: **CSE** (Computer Science & Engineering)

---

## Phase Tracker

- [x] Phase 0 — Foundation (Git Flow, .env, bcrypt, migration script)
- [x] Phase 1 — Database Architecture (Prisma schema, 9 models, seed data)
- [x] Phase 2 — Authentication (JWT + OTP + Redis + hCaptcha + rate limiting)
- [x] Phase 3 — Frontend Upgrade (Vite + React 19 + Tailwind + shadcn/ui)
- [x] Phase 4 — Features
  - [x] Course Management — CRUD, assign teachers, enroll students, self-enroll
  - [x] Attendance — teacher marks sessions, student views percentage
  - [x] Grades — teacher entry per component, auto letter grade, student GPA report
  - [x] Announcements — admin CRUD, role-targeted broadcast, widget on all dashboards
  - [x] Timetable — CRUD API, admin table, teacher/student weekly grid
- [ ] Phase 5 — Deploy (Docker + GitHub Actions + environment hardening)

---

## How to Work with This Codebase

| Task | Where to go |
|---|---|
| Add a new resource | schema change → migration → controller → route → wire in `server/index.js` → frontend page → `App.jsx` |
| Change grade logic | `server/lib/gradeUtils.js` only |
| Add a frontend route | `client/src/App.jsx` only |
| Change auth behavior | `server/controllers/authController.js` + `server/middleware/authGuard.js` |
| Change role permissions | `server/middleware/authGuard.js` → `requireRole()` |
| Change email content | `server/lib/mailer.js` |
| Change rate limits | `server/middleware/rateLimiter.js` |
