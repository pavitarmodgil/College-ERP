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
| Relational DB | PostgreSQL via Prisma ORM | Prisma **5.x** | Type-safe queries, schema-first migrations |
| Cache / OTP | Redis via ioredis | 5.x | Sub-millisecond TTL keys; OTP & rate-limit state |
| Auth | JWT + bcryptjs + OTP | JWT 9.x, bcryptjs 2.x | Stateless access token + httpOnly refresh cookie |
| Email | Resend HTTP API | resend 6.x | OTP delivery; Railway blocks SMTP ports — HTTP API required |
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
│   │   ├── components/            15 reusable UI pieces (modals, sidebar, guards,
│   │   │                          CalendarView, AcademicCommandCenter, UpcomingAssessmentsWidget)
│   │   └── pages/
│   │       ├── LoginPage.jsx
│   │       ├── ResetPasswordPage.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── TeacherDashboard.jsx
│   │       ├── StudentDashboard.jsx
│   │       ├── AnnouncementsPage.jsx  (shared teacher + student)
│   │       ├── admin/             8 pages — Users, Courses, Departments, Timetable, TimetableGenerator, Announcements, StudentProfile, AdminProfile
│   │       ├── teacher/           6 pages — Attendance, AttendanceSession, AttendanceHistory, Grades, GradeEntry, Timetable
│   │       └── student/           3 pages — Attendance, Grades, Timetable
│
├── server/
│   ├── index.js                   Express bootstrap — middleware stack + route mounting
│   ├── controllers/               8 files, one per resource; all business logic lives here
│   ├── routes/                    8 files, one per resource; thin — just wires paths to controllers
│   ├── middleware/
│   │   ├── authGuard.js           JWT verification → req.user; requireRole() factory
│   │   ├── rateLimiter.js         loginLimiter (5/15min/IP), otpLimiter (3/hour)
│   │   └── errorHandler.js        Centralized error formatter — logs stack + responds {error}
│   └── lib/
│       ├── prisma.js              Singleton PrismaClient export
│       ├── redis.js               Singleton ioredis client
│       ├── mailer.js              Resend HTTP API client + sendOTPEmail helper
│       ├── gradeUtils.js          Pure functions: marks → letter grade, GPA calculation
│       ├── timetableInsights.js   Rule-based attendance risk + weighted grade projection
│       └── __tests__/
│           └── timetableInsights.test.js   node --test unit tests for the pure helpers
│
├── prisma/
│   ├── schema.prisma              10 models, 5 enums
│   ├── seed.js                    3 depts, 18 users, 12 courses, full academic records (bcryptjs hashed)
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

### 5. OTP in Redis, Not the Database
OTPs are ephemeral — 5-minute TTL, single-use, per-email. Redis handles TTL natively via `EX 300`. Storing OTPs in PostgreSQL would require a cron job for cleanup and would add write churn on an unrelated table.

### 6. Upsert Pattern for Grades and Attendance
Both models use `@@unique` composite constraints + Prisma `upsert()`. Re-submitting a grade for the same component, or attendance for the same date, updates the existing row — never creates a duplicate. This makes teacher UIs idempotent.

### 7. gradeUtils.js Is Pure
All letter-grade and GPA logic is in `server/lib/gradeUtils.js` as pure functions with no DB calls or side effects. Changing the grade scale means editing one file. The functions are trivially unit-testable.

### 8. timetableInsights.js Separates Pure Logic from Data Access
`server/lib/timetableInsights.js` holds the Smart Timetable analytics. Three functions — `getAttendanceRisk`, `timesOverlap`, `predictFinalGrade` — are pure and unit-tested in `server/lib/__tests__/timetableInsights.test.js`. Only `buildStudentInsights()` touches the DB. This split is deliberate: the interesting logic is testable without a database.

**These are deterministic rules, not machine learning:**

| Rule | Definition |
|---|---|
| Component weights | `INTERNAL 0.2 · MID_TERM 0.3 · FINAL 0.5` |
| Attendance bands | `≥ 75%` SAFE · `65–74%` WARNING · `< 65%` CRITICAL |
| `classesNeeded` | Solves `(attended + x) / (total + x) ≥ 0.75` for `x` |
| `gradeRisk` | `true` when projected letter is `F` or `P` (i.e. below 40 marks) |
| Missing FINAL | Projection assumes the final equals the current average, and reports `marksNeededInFinal` to hold the projected band |

> The `gradeRisk` rule is the ERP's own definition of "academically at risk" and is the reason the ML module's `at_risk` target uses a **< 40 marks** threshold rather than the `F`-only cutoff of 35. See [`ai/README.md`](ai/README.md).

### 9. The Auto Timetable Generator Is Greedy, and Never Auto-Saves
`POST /api/timetable/generate` runs an in-memory greedy scheduler over fixed 1-hour slots (`08:00–12:00`, `14:00–17:00`, Mon–Sat) and returns a **draft only** — nothing is written. The admin reviews the draft, then commits it via `POST /api/timetable/bulk`, which re-runs the full conflict check per entry and writes inside a `$transaction`. Constraints: no teacher/room/course double-booking, and never the same course twice on one day. Unplaceable lectures come back in a `warnings[]` array rather than failing the whole request.

---

## Auth Flow — Step by Step

```
POST /api/auth/login
  1. Detect identifier type: STU → studentId field, TCH → teacherId field, @ → email field
  2. Query DB for matching user
  3. Verify hCaptcha token with hCaptcha API  (abort on failure)
     Dev bypass: captchaToken = "dev-bypass" when NODE_ENV=development
  4. bcryptjs.compare(submitted, user.password)
  5. Generate 6-digit OTP → SET redis:otp:{email} OTP EX 300
  6. Email OTP via Resend HTTP API
  7. Return { maskedEmail, lookupEmail, mustResetPassword }
     NOTE: OTP is always sent. mustResetPassword is a flag in the response.
     The frontend redirects to /reset-password after OTP verify if true.

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
| `User` | email, firstName?, lastName?, role, studentId?, teacherId?, isActive, mustResetPassword | email, studentId, teacherId |
| `Course` | code, type, credits, isActive | code |
| `Enrollment` | userId, courseId, enrolledAt | [userId, courseId] |
| `CourseTeacher` | courseId, userId | [courseId, userId] |
| `Attendance` | enrollmentId, date, present | [enrollmentId, date] |
| `Grade` | enrollmentId, component, marks, letterGrade | [enrollmentId, component] |
| `Announcement` | title, body, targetRole (String), authorId | — |
| `TimetableEntry` | courseId, teacherId, dayOfWeek, startTime, endTime, room, semester | — |
| `Assessment` | title, courseId, dueDate, type, semester, createdById? | — |

**Enums:** `Role` (ADMIN/TEACHER/STUDENT) · `CourseType` (MANDATORY/ELECTIVE) · `GradeComponent` (INTERNAL/MID_TERM/FINAL) · `DayOfWeek` (MON–SAT) · `AssessmentType` (QUIZ/ASSIGNMENT/EXAM/PROJECT)

**Indexes:** `TimetableEntry` on `teacherId`, `room`, `semester`, `dayOfWeek` · `Assessment` on `courseId`, `dueDate`, `semester`

> **`Assessment` carries no marks.** It is a *scheduled item* (title, due date, type) used by the upcoming-assessments widgets — not a graded score. The only marks in the system live on `Grade` (INTERNAL / MID_TERM / FINAL). Any ML feature named `assessment_average` must therefore be derived from `Grade`, not from `Assessment`.

> `Assessment.createdById` is nullable with no cascade — deleting the authoring user does not delete the assessment.

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
| POST | `/reset-password` | PUBLIC | First-login password reset (takes email + newPassword in body) |
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
| GET | `/available` | STUDENT | Courses the student is NOT enrolled in (browse for self-enroll) |
| GET | `/` | ALL | Paginated, role-scoped (admin: all; teacher: assigned; student: active) |
| GET | `/:id` | ALL | Course + teachers + enrollments |
| POST | `/` | ADMIN | Create course |
| PATCH | `/:id` | ADMIN | Update course |
| PATCH | `/:id/deactivate` | ADMIN | Soft-disable (blocked if enrollments exist) |
| POST | `/:id/teachers` | ADMIN | Assign teacher to course |
| DELETE | `/:id/teachers/:userId` | ADMIN | Remove teacher from course |
| POST | `/:id/enroll` | STUDENT | Student self-enroll |
| POST | `/:id/enrollments` | ADMIN | Admin enrolls a student |
| DELETE | `/:id/enrollments/:userId` | ADMIN | Admin removes a student |

### Attendance · `/api/attendance`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/my` | STUDENT | Attendance % per course |
| GET | `/courses` | TEACHER | Teacher's assigned courses with today's submission status |
| GET | `/:courseId/session` | TEACHER | Get session for a date (defaults today; `?date=YYYY-MM-DD` for past) |
| POST | `/:courseId/session` | TEACHER | Save/upsert full session (body: `{ students, date? }`) |
| GET | `/:courseId/history` | TEACHER | List all past sessions with present/absent counts |
| PATCH | `/:enrollmentId` | TEACHER | Edit single attendance record (body: `{ date, present }`) |

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
| GET | `/insights` | STUDENT | Per-course attendance risk + grade projection + next assessment |
| POST | `/generate` | ADMIN | Greedy scheduler → returns draft + warnings (**saves nothing**) |
| POST | `/bulk` | ADMIN | Commit a reviewed draft — re-checks conflicts, writes in a transaction |
| POST | `/` | ADMIN | Create entry |
| PATCH | `/:id` | ADMIN | Update entry |
| DELETE | `/:id` | ADMIN | Delete entry |

> Route order matters: `/semesters` and `/insights` are registered **before** `/` and `/:id`, or Express matches them as `:id` values.

### Assessments · `/api/assessments`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ALL | Role-scoped list, sorted by due date. Filters: `?courseId=` `?upcoming=1` |
| POST | `/` | TEACHER · ADMIN | Create (teacher restricted to own courses) |
| PATCH | `/:id` | TEACHER · ADMIN | Update (teacher restricted to own courses) |
| DELETE | `/:id` | TEACHER · ADMIN | Hard delete |

Role scoping is applied in the controller, not the router: admin sees all; teacher sees courses from `CourseTeacher`; student sees courses from `Enrollment`. An explicit `?courseId=` is **intersected** with that scope — it cannot widen it.

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
| `/admin/timetable/generator` | ADMIN | TimetableGeneratorPage (auto-scheduler draft + review) |
| `/admin/profile` | ADMIN | AdminProfilePage (placeholder — Phase 6) |
| `/teacher` | TEACHER | TeacherDashboard |
| `/teacher/attendance` | TEACHER | TeacherAttendancePage |
| `/teacher/attendance/:courseId` | TEACHER | AttendanceSessionPage (date picker — today + past) |
| `/teacher/attendance/:courseId/history` | TEACHER | AttendanceHistoryPage |
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
DATABASE_URL            PostgreSQL connection string
JWT_SECRET              Long random string — signs access tokens
JWT_REFRESH_SECRET      Different long random string — signs refresh tokens
REDIS_HOST              Redis hostname (127.0.0.1 locally, Upstash host in prod)
REDIS_PORT              Redis port (6379 locally, Upstash port in prod)
REDIS_PASSWORD          Redis auth password (blank locally; required for Upstash)
REDIS_TLS               Set to "true" for Upstash/production TLS; omit for local
RESEND_API_KEY          Resend API key — used for OTP and password-reset emails
HCAPTCHA_SECRET         hCaptcha secret key (server-side verification)
CLIENT_URL              Frontend origin for CORS (http://localhost:5173 locally)
API_PORT                4000
NODE_ENV                development | production

# In client/.env:
VITE_API_URL            http://localhost:4000/api (local dev) or deployed API URL
VITE_HCAPTCHA_SITE      hCaptcha site key (client-side, NOT VITE_HCAPTCHA_SITE_KEY)
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

Run `npx prisma db seed` to populate. The seed is idempotent (upsert-safe to re-run).

**Departments:** CSE · ECE · ME

The seed opens with a **pre-flight block** that frees `studentId`/`teacherId` values reassigned since earlier revisions. Re-running is safe; IDs are not stable across seed rewrites.

**Admins** (password: `admin123`):

| Email | Notes |
|---|---|
| `pavitarmodgil001@gmail.com` | Primary admin (no firstName/lastName) |
| `admin2@uni.com` | Secondary Admin |

**Teachers** (password: `teacher123`):

| Email | ID | Department | Notes |
|---|---|---|---|
| `pavitar0883.becse24@chitkara.edu.in` | TCH001 | CSE | Primary teacher account — 2 courses |
| `harveen.kaur@uni.com` | TCH002 | CSE | `mustResetPassword: true` |
| `rajesh.patel@uni.com` | TCH003 | ECE | |
| `priya.sharma@uni.com` | TCH004 | ME | |
| `guest.instructor@uni.com` | TCH005 | CSE | Part-time |
| `unassigned.teacher@uni.com` | TCH006 | ECE | **0 courses** — edge case |
| `demo.teacher@uni.com` | TCH010 | CSE | |
| `abheyjeet100@gmail.com` | TCH100 | CSE | Legacy, no name — 2 courses |

**Students** (password: `student123`):

| Email | ID | Department | Persona |
|---|---|---|---|
| `aseem.kamra@uni.com` | STU003 | CSE | Legacy (no name) · **100% attendance** · 4 CSE courses |
| `pavitarmodgil1512@gmail.com` | STU100 | CSE | Primary demo student · ~93% · full academic data |
| `maya.singh@uni.com` | STU004 | CSE | Electives only · 100% attendance |
| `arjun.verma@uni.com` | STU005 | ECE | **High performer** — all `O`, GPA 10.0 · cross-dept CSE enrollment |
| `poor.performer@uni.com` | STU006 | CSE | **At-risk** — ~57–64% attendance, barely-passing grades |
| `incomplete.grades@uni.com` | STU007 | ME | INTERNAL + MID_TERM only, **FINAL pending** |
| `cross.dept@uni.com` | STU008 | ECE | Fully enrolled ECE |
| `no.courses@uni.com` | STU009 | CSE | **No enrollments** — empty-dashboard edge case |

**Courses (12):** CSE210 Data Structures · CSE320 Database Systems · CSE340 Web Engineering · CSE450 Machine Learning Basics · CSE460 Mobile App Development · ECE210 Digital Electronics · ECE320 Microprocessors · ECE410 Signal Processing · ECE420 · ME210 Thermodynamics · ME220 Fluid Mechanics · ME450 CAD & Design

**Seed totals:** 3 departments · 18 users (2 admin · 8 teachers · 8 students) · 12 courses · 13 course-teacher assignments · 24 enrollments · 336 attendance records (24 × 14 dates) · 69 grade entries · 27 timetable entries (semester `2026-EVEN`) · 6 assessments · 14 announcements

> Assessment due dates are generated **relative to `now()`**, so the upcoming/overdue widgets demo correctly whenever the seed runs. The seed clears the semester's assessments first, so this part is not upsert-based.

> The student personas are deliberately spread across the risk spectrum (perfect · high · average · incomplete · at-risk · unenrolled). This is what makes the seed useful for exercising the insights engine — and what makes it far too small to train on. See [`ai/README.md`](ai/README.md).

> Users created before the `firstName`/`lastName` migration have `null` in those fields and fall back to email-derived display names throughout the UI.

---

## Phase Tracker

- [x] Phase 0 — Foundation (Git Flow, .env, bcrypt, migration script)
- [x] Phase 1 — Database Architecture (Prisma schema, 9 models, seed data)
- [x] Phase 2 — Authentication (JWT + OTP + Redis + hCaptcha + rate limiting)
- [x] Phase 3 — Frontend Upgrade (Vite + React 19 + Tailwind + shadcn/ui)
- [x] Phase 4 — Features
  - [x] Course Management — CRUD, assign/remove teachers, enroll/remove students, self-enroll, browse available
  - [x] Attendance — teacher marks sessions (today + past), history list, single-record edit, student views %
  - [x] Grades — teacher entry per component, auto letter grade, student GPA report
  - [x] Announcements — admin CRUD, role-targeted broadcast, widget on all dashboards
  - [x] Timetable — CRUD API, admin table, teacher/student weekly grid
- [x] Phase 5 — Deploy (Railway for server + DB + Redis; production hardening complete)
  - [x] Switched from Gmail SMTP to Resend HTTP API (Railway blocks SMTP ports)
  - [x] Replaced `bcrypt` with `bcryptjs` (pure JS — no native binaries needed on Railway)
  - [x] `app.set('trust proxy', 1)` for Railway reverse proxy (rate limiter IP detection)
  - [x] `sameSite: 'none'` on refresh cookie for cross-origin production auth
  - [x] CORS: trim `CLIENT_URL` whitespace and trailing slash
  - [x] Redis TLS support via `REDIS_TLS=true` (Upstash on Railway)
  - [x] Health check endpoint `/api/health`
- [x] Phase 6 — Smart Timetable 2.0
  - [x] `Assessment` model + `AssessmentType` enum + `TimetableEntry` indexes (migration `20260531151946_smart_timetable_assessments_indexes`)
  - [x] Assessments CRUD API — role-scoped reads, teacher restricted to own courses
  - [x] `timetableInsights.js` — attendance risk bands + weighted grade projection, with `node --test` unit tests
  - [x] `GET /api/timetable/insights` — per-course student insight feed
  - [x] Auto Timetable Generator — greedy scheduler (`/generate` draft → `/bulk` commit) + admin review page
  - [x] `CalendarView` shared component + calendar/grid toggle on student and teacher timetables
  - [x] `AcademicCommandCenter` + `UpcomingAssessmentsWidget` on the student dashboard
- [x] Phase 7 — AI/ML Student Performance & At-Risk Prediction (see [`ai/README.md`](ai/README.md))
  - [x] `ai/scripts/export_student_academic_data.js` — read-only ERP → CSV at student-course grain
  - [x] `ai/scripts/prepare_uci_dataset.py` — UCI Student Performance (CC BY 4.0) mapped to the same schema
  - [x] `ai/notebooks/student_performance_at_risk.ipynb` — 63 cells, executed end to end
  - [x] Classification (LogReg · Decision Tree · Random Forest) + regression (Linear · RF Regressor)
  - [x] Benchmarked against the ERP's own `predictFinalGrade` rule on the same test set — ML wins
  - [x] 12 figures exported to `ai/reports/` for the CE presentation (CE-1 state preserved at git tag `ce1-submission`)
- [x] Phase 7b — CE-2 final implementation (branch `feat/ai-ce2`)
  - [x] Third dataset: `ai/scripts/prepare_oulad_dataset.py` — Open University OULAD (CC BY 4.0), 4,959 rows → 6,033 total
  - [x] Notebook extended to 98 cells / 26 sections: KNN · Naive Bayes · SVM · Polynomial Regression · 5-fold CV · bias-variance curves · GridSearchCV · K-Means / hierarchical / DBSCAN · fairness audit
  - [x] Selection by cross-validated F2; selected Random Forest (tuned) — recall 0.865 vs ERP rule 0.316
  - [x] 21 figures in `ai/reports/`, written by the notebook's `show()` helper; `ai/requirements.txt` added
  - [ ] CE-2 PPT (Chitkara template) and spiral-bound project report

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
| Change risk bands / grade weights | `server/lib/timetableInsights.js` — update `__tests__/timetableInsights.test.js` too |
| Run the unit tests | `node --test "server/lib/__tests__/*.test.js"` (12 tests; no `npm test` script exists yet) |
| Change the scheduler's slots or constraints | `server/controllers/timetableController.js` → `GEN_SLOTS` / `GEN_DAYS` / `hasConflict` |
| Work on the ML module | `ai/` — see [`ai/README.md`](ai/README.md); do **not** modify ERP controllers for it |
