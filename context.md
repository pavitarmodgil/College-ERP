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

**Admins:** pavitarmodgil001@gmail.com · admin.secondary@uni.com

**Teachers:** aman.kumar@uni.com (TCH001) · rajesh.singh@uni.com (TCH002) · priya.sharma@uni.com (TCH003) · harveen.kaur@uni.com (TCH004, mustReset) · vikram.patel@uni.com (TCH005) · anjali.gupta@uni.com (TCH006) · neha.mishra@uni.com (TCH007) · abheyjeet100@gmail.com (TCH100, legacy, no name)

**Students:** aseemkamra22@gmail.com (STU001) · rohan.sharma@uni.com (STU002) · aseem.kamra@uni.com (STU003, legacy) · kavya.nair@uni.com (STU004) · aditya.verma@uni.com (STU005) · disha.mehta@uni.com (STU006) · arjun.mishra@uni.com (STU007) · zara.khan@uni.com (STU008) · tanvi.singh@uni.com (STU009) · priya.jain@uni.com (STU010)

**Departments:** CSE · ECE · ME — **Courses:** CSE210 · CSE320 · CSE340 · CSE410 · CSE420 · ECE210 · ECE320 · ECE410 · ME210

---

## Database — 9 Models (Prisma + PostgreSQL)

**Core relationships:**
```
Department → User (many)
Department → Course (many)
User + Course → Enrollment (junction, anchor table)
  Enrollment → Attendance (per date)
  Enrollment → Grade (per component: INTERNAL / MID_TERM / FINAL)
Course + User(teacher) → CourseTeacher (junction)
Course + User(teacher) → TimetableEntry
Announcement → User (author)
```

**Key design rules:**
- Enrollment is the anchor — never attach Attendance/Grade directly to User
- Soft delete via `isActive` flag — never hard-delete Users or Courses with academic records
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
| GET | `/` | ALL | Entries scoped to role (admin: all; teacher/student: own) |
| POST | `/` | ADMIN | Create entry |
| PATCH | `/:id` | ADMIN | Update entry |
| DELETE | `/:id` | ADMIN | Delete entry |

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
| `/admin/profile` | ADMIN | AdminProfilePage (placeholder — "Phase 6") |
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

---

## Current State

**Last updated:** 2026-05-30
**Current branch:** `main`
**Status:** All planned phases complete. No pending tasks.

### What's working end-to-end

- **Auth:** identifier (email / TCH001 / STU001) + password + hCaptcha + OTP → JWT + silent refresh. Dev bypass: `captchaToken: "dev-bypass"` skips hCaptcha.
- **Admin:** user CRUD (firstName/lastName optional), course CRUD, assign/remove teachers, enroll/remove students, department list, announcement CRUD, timetable CRUD, dashboard stats + recent activity; `/admin/profile` placeholder exists (Phase 6)
- **Teacher:** course list, mark attendance sessions (today + any past date via date picker), view full history per course, edit individual past records, enter grades per component, view timetable, view announcements
- **Student:** self-enroll (browse `/available`), view attendance %, view grades + GPA, view timetable, view announcements

### Known technical debt

- `server/controllers/courseController.js` and `server/controllers/announcementController.js` both instantiate `new PrismaClient()` directly instead of using the singleton at `server/lib/prisma.js`. This creates extra connection pools.
- `express-session` is in `package.json` dependencies but is not used anywhere in the codebase.

### Key file locations

| Concern | File |
|---|---|
| All frontend routes | `client/src/App.jsx` |
| Auth state (React) | `client/src/context/AuthContext.jsx` |
| Axios + JWT refresh | `client/src/lib/api.js` |
| JWT middleware | `server/middleware/authGuard.js` |
| Grade scale logic | `server/lib/gradeUtils.js` |
| Prisma singleton | `server/lib/prisma.js` |
| Redis singleton | `server/lib/redis.js` |
| Email / OTP sender | `server/lib/mailer.js` |

---

## How to Start a New Session

Paste this file and add:

> "I'm working on my University Management System. Current branch: main | Task: [describe what you want to do]"
