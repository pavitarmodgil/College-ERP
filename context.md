# University Management System — Session Context

> **How to use this file:**
> Paste into Claude Code at the start of each session.
> Update "Current State" after every work session so the next session starts with accurate context.

---

## Project Overview

Full-stack University Management System. Three roles: Admin, Teacher, Student.

- **Backend:** Node.js + Express (REST API, JSON only)
- **Frontend:** React 19 + Vite + Tailwind CSS + shadcn/ui
- **DB:** PostgreSQL via Prisma ORM 5.x (pinned — do not upgrade to 7.x)
- **Cache / OTP:** Redis via ioredis
- **Auth:** JWT (15 min) + httpOnly refresh cookie (7 days) + Email OTP + hCaptcha

---

## Login Identifiers

| Role | Accepted identifier | Permissions |
|---|---|---|
| Admin | email only | Full system access |
| Teacher | TCH001 or email | Attendance, grades, timetable for own courses |
| Student | STU001 or email | Own attendance %, grades, timetable, self-enroll |

Role is always read from the DB, never trusted from the frontend.

---

## Seed Users

All passwords: admin → `admin123` · teacher → `teacher123` · student → `student123`

**Admins:** pavitarmodgil001@gmail.com · admin2@uni.com

**Teachers:** pavitar0883.becse24@chitkara.edu.in (TCH001, 2 courses) · harveen.kaur@uni.com (TCH002, mustReset) · rajesh.patel@uni.com (TCH003, ECE) · priya.sharma@uni.com (TCH004, ME) · guest.instructor@uni.com (TCH005) · unassigned.teacher@uni.com (TCH006, **0 courses**) · demo.teacher@uni.com (TCH010) · abheyjeet100@gmail.com (TCH100, legacy, 2 courses)

**Students (persona-based — deliberately spread across the risk spectrum):**

| ID | Email | Persona |
|---|---|---|
| STU003 | aseem.kamra@uni.com | Legacy, no name · **100% attendance** |
| STU100 | pavitarmodgil1512@gmail.com | Primary demo · ~93% · full data |
| STU004 | maya.singh@uni.com | Electives only · 100% |
| STU005 | arjun.verma@uni.com | **High performer** — all `O`, GPA 10.0 |
| STU006 | poor.performer@uni.com | **At-risk** — ~57–64% attendance |
| STU007 | incomplete.grades@uni.com | **FINAL pending** (INTERNAL + MID_TERM only) |
| STU008 | cross.dept@uni.com | Fully enrolled ECE |
| STU009 | no.courses@uni.com | **No enrollments** — empty dashboard |

**Departments:** CSE · ECE · ME
**Courses (12):** CSE210 · CSE320 · CSE340 · CSE450 · CSE460 · ECE210 · ECE320 · ECE410 · ECE420 · ME210 · ME220 · ME450

**Totals:** 18 users · 12 courses · 13 course-teacher · 24 enrollments · 336 attendance · 69 grades · 27 timetable (`2026-EVEN`) · 6 assessments · 14 announcements

> The seed's pre-flight block frees reassigned `studentId`/`teacherId` values. IDs are **not** stable across seed rewrites — re-check this table after any seed change.

---

## Database — 10 Models (Prisma + PostgreSQL)

**Core relationships:**
```
Department → User (many)
Department → Course (many)
User + Course → Enrollment (junction, anchor table)
  Enrollment → Attendance (per date)
  Enrollment → Grade (per component: INTERNAL / MID_TERM / FINAL)
Course + User(teacher) → CourseTeacher (junction)
Course + User(teacher) → TimetableEntry
Course → Assessment (scheduled item — NO marks)
Announcement → User (author)
```

**Enums (5):** `Role` · `CourseType` · `GradeComponent` · `DayOfWeek` · `AssessmentType` (QUIZ/ASSIGNMENT/EXAM/PROJECT)

**Key design rules:**
- Enrollment is the anchor — never attach Attendance/Grade directly to User
- Soft delete via `isActive` flag — never hard-delete Users or Courses with academic records
- `Assessment` has **no marks field** — it is a scheduled item (title/dueDate/type), not a score. All marks live on `Grade`
- `mustResetPassword` flag on User for first-login forced reset
- `firstName` and `lastName` on User are nullable (`String?`) — users created before the migration have `null` and fall back to email-derived display names throughout the UI
- `targetRole` on Announcement is a plain String (`ALL`/`ADMIN`/`TEACHER`/`STUDENT`), not the Role enum

---

## Auth Flow (implemented and working)

1. Submit identifier + password + hCaptcha token
2. Backend detects identifier type, queries correct DB field
3. Verify hCaptcha with hCaptcha API (dev bypass: captchaToken = `"dev-bypass"` when NODE_ENV=development)
4. `bcryptjs.compare()` checks password
5. Generate 6-digit OTP → Redis (5 min TTL) → email via Resend HTTP API
6. Response includes `mustResetPassword` flag — OTP is always sent, frontend decides flow
7. User submits OTP → verify + delete from Redis (single-use)
8. Issue JWT access token (15 min) + refresh token in httpOnly cookie (7 days)
9. On expiry → Axios interceptor in `client/src/lib/api.js` silently calls `/auth/refresh`

> **Note:** `mustResetPassword` does NOT skip OTP in the backend. The flag is returned in the login response; the frontend redirects to `/reset-password` after OTP verify if the flag is true.

---

## All API Endpoints (current — verified against code)

### Auth · `/api/auth`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/login` | PUBLIC | Identifier + password + CAPTCHA → OTP sent |
| POST | `/verify-otp` | PUBLIC | OTP → JWT access token + refresh cookie |
| POST | `/refresh` | PUBLIC (cookie) | New access token from refresh cookie |
| POST | `/logout` | AUTH | Clear refresh cookie |
| POST | `/reset-password` | PUBLIC | First-login password reset (no auth guard — takes email + newPassword) |
| GET | `/me` | AUTH | Returns decoded JWT payload |

### Users · `/api/users` — ADMIN only
| Method | Path | Purpose |
|---|---|---|
| GET | `/departments` | All departments (dropdown data) |
| GET | `/recent-activity` | 8 most recent enrollments (dashboard widget) |
| GET | `/` | Paginated list (role/isActive filters) |
| GET | `/:id` | Single user with department |
| POST | `/` | Create user — auto-generates studentId/teacherId, mustReset: true |
| PATCH | `/:id` | Update email, department, firstName, lastName, password |
| PATCH | `/:id/deactivate` | Soft-disable (isActive: false) |
| POST | `/:id/reset-password` | Admin resets password → temp password emailed |

### Courses · `/api/courses`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/available` | STUDENT | Courses the student is NOT enrolled in (for self-enroll browse) |
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
| GET | `/:courseId/session` | TEACHER | Get session for a date (defaults today; pass `?date=YYYY-MM-DD` for past) |
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
| GET | `/semesters` | ADMIN | Distinct semester values for dropdown |
| GET | `/insights` | STUDENT | Per-course attendance risk + grade projection + next assessment; per-course `mlRisk` when `ML_RISK_ENABLED=true` |
| GET | `/` | ALL | Entries scoped to role (admin: all; teacher/student: own) |
| POST | `/generate` | ADMIN | Greedy auto-scheduler → draft + warnings (saves nothing) |
| POST | `/bulk` | ADMIN | Commit reviewed draft (re-checks conflicts, `$transaction`) |
| POST | `/` | ADMIN | Create entry |
| PATCH | `/:id` | ADMIN | Update entry |
| DELETE | `/:id` | ADMIN | Delete entry |

> `/semesters` and `/insights` must stay registered before `/` and `/:id` — otherwise Express matches them as `:id`.

### Assessments · `/api/assessments`
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/` | ALL | Role-scoped, sorted by dueDate. `?courseId=` `?upcoming=1` |
| POST | `/` | TEACHER · ADMIN | Create (teacher: own courses only) |
| PATCH | `/:id` | TEACHER · ADMIN | Update (teacher: own courses only) |
| DELETE | `/:id` | TEACHER · ADMIN | Hard delete |

---

## Frontend Routes (current — verified against App.jsx)

All routes defined in `client/src/App.jsx`.

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
| `/admin/timetable/generator` | ADMIN | TimetableGeneratorPage (auto-scheduler) |
| `/admin/profile` | ADMIN | AdminProfilePage (placeholder) |
| `/teacher` | TEACHER | TeacherDashboard |
| `/teacher/attendance` | TEACHER | TeacherAttendancePage |
| `/teacher/attendance/:courseId` | TEACHER | AttendanceSessionPage (date picker for past sessions) |
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

## Phase Tracker

- [x] Phase 0 — Foundation (Git Flow, .env, bcrypt)
- [x] Phase 1 — Database Architecture (Prisma schema, 9 models, seed)
- [x] Phase 2 — Authentication (JWT + OTP + Redis + hCaptcha + rate limiting)
- [x] Phase 3 — Frontend (Vite + React 19 + Tailwind + shadcn/ui)
- [x] Phase 4 — Features (all complete)
  - [x] Course Management — CRUD, assign/remove teachers, enroll/remove students, self-enroll, browse available
  - [x] Attendance — teacher marks sessions (today + past dates via date picker), history list, single-record edit, student views %
  - [x] Grades — per-component entry, auto letter grade, GPA report
  - [x] Announcements — admin CRUD, role-targeted, dashboard widget
  - [x] Timetable — CRUD API, admin table, teacher/student weekly grid
  - [x] UX fixes — name fields (firstName/lastName), login OTP preview removed, dashboard duplicate stats removed, sidebar profile card clickable nav
- [x] Phase 5 — Deploy (Railway; production hardening complete)
- [x] Phase 6 — Smart Timetable 2.0 (Assessment model, insights engine, auto-generator, calendar view)
- [x] Phase 7 — AI/ML Student Performance & At-Risk Prediction (notebook executed; see `ai/README.md`)
- [x] Phase 7b — CE-2 implementation (third dataset OULAD, full CE-2 syllabus coverage; PPT + report pending)

---

## Current State

**Last updated:** 2026-11-27
**Current branch:** `feat/ml-risk-badge`. It is stacked on `fix/sprint1-critical` (PR #14) with `feat/ai-ce2` merged in, and its PR targets `dev`.
**Status:** Phases 0–7 complete; CE-2 notebook complete. FUT-1 (ML risk badge in the ERP) implemented behind `ML_RISK_ENABLED`, default off.

### ML risk badge (FUT-1), 2026-11-27

- The notebook's tuned Random Forest is exported to `server/lib/ml/atRiskModel.json` by `ai/scripts/export_at_risk_model.py`, which reads the gitignored `ai/models/at_risk_classifier.joblib`. `server/lib/mlRisk.js` scores it in pure JS, so no Python service is needed.
- Parity: `npm test` checks it against the notebook's section 23 probabilities and against sklearn `predict_proba` fixtures (to 1e-6).
- `GET /api/timetable/insights` adds per-course `mlRisk` only when `ML_RISK_ENABLED=true`. Failures degrade to `UNAVAILABLE`, and missing INTERNAL/MID_TERM/attendance gives `INSUFFICIENT_DATA`.
- The student dashboard's Course Performance Breakdown cards show the rule-based attendance chip and, when the flag is on, the "ML risk estimate" badge. Its tooltip gives the top 3 factors and the disclaimer "Experimental decision support, not a grade".
- Verified in the browser as **STU003**, because the current seed has no STU001. Its probabilities (CSE210 0.047, CSE320 0.063) match the notebook's rows for the same student.
- Known caveat: `course_type` often ranks as a top factor. All OULAD rows are `NOT_RECORDED`, so the feature partly acts as a data-source proxy. The model is not calibrated on ERP data; do not enable it in production until it is retrained or calibrated.

### Phase 7 / CE-2 at a glance

- Trained on **UCI Student Performance** (1,044 rows) + **OULAD** (Open University, 4,959 rows, added for CE-2 at the professor's request) — 6,033 rows total. The ERP has 30 gradeable rows and **zero** at-risk students, so it is used for the real-student demo only.
- OULAD makes the task harder and more realistic: its exam is far less predictable from coursework (corr 0.48 vs UCI 0.91), so CE-2 metrics are lower than CE-1 (R² 0.88 → 0.53). This is expected and explained in the notebook.
- Six classifiers + three regressors, 5-fold CV, bias-variance curves, GridSearchCV, K-Means/hierarchical/DBSCAN clustering, fairness audit.
- Selected: **Random Forest (tuned)** for at-risk (test recall 0.865, 18 of 133 missed; ERP rule misses 91) and **Random Forest Regressor (tuned)** (MAE 10.97, R² 0.529). Selection metric is cross-validated **F2**.
- The CE-2 work itself touched nothing in `server/` or `client/`. Serving it came later, with FUT-1 above.

### What's working end-to-end

- **Auth:** identifier (email / TCH001 / STU001) + password + hCaptcha + OTP → JWT + silent refresh. Dev bypass: `captchaToken: "dev-bypass"` skips hCaptcha.
- **Admin:** user CRUD (firstName/lastName optional), course CRUD, assign/remove teachers, enroll/remove students, department list, announcement CRUD, timetable CRUD, **auto timetable generator (draft → review → bulk commit)**, dashboard stats + recent activity
- **Teacher:** course list, mark attendance sessions (today + any past date via date picker), view full history per course, edit individual past records, enter grades per component, **create/edit assessments for own courses**, view timetable (grid + calendar toggle), view announcements
- **Student:** self-enroll (browse `/available`), view attendance %, view grades + GPA, view timetable (grid + calendar toggle), **Academic Command Center + upcoming assessments + per-course risk insights**, per-course attendance band chip + flagged **ML risk estimate** badge, view announcements

### Smart Timetable 2.0 — how the insights work

`server/lib/timetableInsights.js`. Deterministic rules, **not** ML:

- Weights: `INTERNAL 0.2 · MID_TERM 0.3 · FINAL 0.5`
- Attendance: `≥75%` SAFE · `65–74%` WARNING · `<65%` CRITICAL; `classesNeeded` solves `(attended+x)/(total+x) ≥ 0.75`
- `gradeRisk = true` when the projected letter is `F` or `P` (below 40 marks) — this is the ERP's own "at risk" definition
- When FINAL is missing, the projection assumes final = current average, and reports `marksNeededInFinal`
- Pure helpers are unit-tested; run everything with `npm test` (unit + API tests, no DB/Redis/network)

### Known technical debt

- `server/controllers/courseController.js` and `server/controllers/announcementController.js` both instantiate `new PrismaClient()` directly instead of using the singleton at `server/lib/prisma.js`. This creates extra connection pools.
- `express-session` is in `package.json` dependencies but is not used anywhere in the codebase.
- `POST /api/timetable/bulk` re-checks conflicts in a loop of `await`s *before* the transaction, so a concurrent write between check and commit could still slip through. Low risk for single-admin use.

### Key file locations

| Concern | File |
|---|---|
| All frontend routes | `client/src/App.jsx` |
| Auth state (React) | `client/src/context/AuthContext.jsx` |
| Axios + JWT refresh | `client/src/lib/api.js` |
| JWT middleware | `server/middleware/authGuard.js` |
| Grade scale logic | `server/lib/gradeUtils.js` |
| Risk bands + grade projection | `server/lib/timetableInsights.js` |
| Auto-scheduler slots/constraints | `server/controllers/timetableController.js` (`GEN_SLOTS`, `GEN_DAYS`) |
| ML module (Phase 7) | `ai/` — see `ai/README.md` |
| ML serving (FUT-1) | `server/lib/mlRisk.js` + `server/lib/ml/atRiskModel.json`; badge in `client/src/components/MlRiskBadge.jsx` |
| Prisma singleton | `server/lib/prisma.js` |
| Redis singleton | `server/lib/redis.js` |
| Email / OTP sender | `server/lib/mailer.js` |

---

## How to Start a New Session

Paste this file and add:

> "I'm working on my University Management System. Current branch: feat/ml-risk-badge | Task: [describe what you want to do]"
