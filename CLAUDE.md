# University Management System — Project Context
 
## What this project is
A full-stack University Management System built as a learning project with production-grade practices.
Roles: Student, Teacher, Admin, HOD, Principal.
 
---
 
## Tech Stack
 
| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express | REST API, JSON only |
| Frontend | React (Vite) + Tailwind + shadcn/ui | Fast DX, component-driven |
| Relational DB | MySQL via Prisma ORM | Users, courses, grades, attendance |
| Document DB | MongoDB | Profiles, announcements, file metadata |
| Cache / OTP | Redis (ioredis) | Temporary data, rate limiting, hot queries |
| Auth | JWT (access + refresh) + bcrypt + OTP | Industry-standard auth flow |
| Email | Nodemailer | OTP delivery |
| CAPTCHA | hCaptcha | Bot protection on login |
 
---
 
## Project Structure
 
```
/client            ← React (Vite) app
  /src
    /components    ← Reusable UI pieces
    /pages         ← One file per route (Dashboard, Login, etc.)
    /hooks         ← useAuth, useFetch custom hooks
    /lib           ← Axios instance, helpers
 
/server            ← Express API (JSON only, no views)
  /routes          ← auth.js, users.js, courses.js, etc.
  /controllers     ← Business logic (one per resource)
  /middleware      ← authGuard, rateLimiter, errorHandler
  /prisma          ← schema.prisma + migrations
```
 
---
 
## Auth Flow
1. User submits email + password + CAPTCHA token
2. Backend verifies CAPTCHA with hCaptcha API
3. bcrypt.compare() checks password
4. 6-digit OTP generated → stored in Redis (5 min TTL) → emailed via Nodemailer
5. User submits OTP → verified against Redis
6. Server issues: short-lived JWT access token (15 min) + refresh token in httpOnly cookie (7 days)
7. On expiry, client silently calls `/auth/refresh`
 
---
 
## Key Rules & Conventions
 
- **Never commit `.env`** — always maintain `.env.example` with placeholder values
- **Never commit directly to `main`** — use Git Flow: `main` → `dev` → `feat/branch-name`
- **Passwords always hashed** with bcrypt (saltRounds = 12)
- **Rate limiting**: login → 5 attempts/15 min/IP; OTP → 3 requests/hour
- **Helmet + CORS** middleware on every Express app
- **Prisma schema is designed before API endpoints** — migrations first, then routes
- **Redis** used for: OTP storage, rate limiting, caching hot queries (e.g. timetable)
 
---
 
## Current Phase
> Update this section as you progress.

- [x] Phase 0 — Foundation (Git Flow, .env, bcrypt fix)
- [x] Phase 1 — Database Architecture (Prisma schema design)
- [x] Phase 2 — Authentication (JWT + OTP + Redis + CAPTCHA)
- [x] Phase 3 — Frontend Upgrade (Vite + React + Tailwind)
- [x] Phase 4 — Features
  - [x] Course Management — CRUD, assign teachers, enroll students, self-enroll
  - [x] Attendance — teacher marks sessions, student views percentage
  - [x] Grades — teacher entry per component, auto letter grade, student GPA report
  - [x] Announcements — admin CRUD, role-targeted broadcast, widget on all dashboards
  - [ ] Timetable (not started)
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)

## Phase 4 — What's Built

### Grades (feat/phase4-course-management — latest commit)
- `server/lib/gradeUtils.js` — `calculateLetterGrade` (O/A+/A/B+/B/C/P/F), `gradeToGPA` (10-point scale), `getPassStatus`
- `server/controllers/gradeController.js` — 4 endpoints
- `server/routes/grades.js` — registered at `/api/grades`
- `client/src/pages/teacher/TeacherGradesPage.jsx` — course cards, progress bar, component pills
- `client/src/pages/teacher/GradeEntryPage.jsx` — tab switcher (INTERNAL/MID_TERM/FINAL), bulk apply, per-student save
- `client/src/pages/student/StudentGradesPage.jsx` — GPA banner, pass/fail/pending badges, per-component breakdown
- Admin dashboard Departments stat card wired to real API

### Grade API endpoints
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/grades/courses` | TEACHER | Courses with grading progress + component status |
| GET | `/api/grades/:courseId/students` | TEACHER | Enrolled students + their grades |
| POST | `/api/grades/:courseId/students/:enrollmentId` | TEACHER | Upsert one component grade (letter grade auto-calculated) |
| GET | `/api/grades/my` | STUDENT | Full grade report with GPA |

### Letter grade scale
| Marks | Grade | GPA |
|---|---|---|
| ≥80 | O | 10.0 |
| ≥70 | A+ | 9.0 |
| ≥65 | A | 8.0 |
| ≥61 | B+ | 7.0 |
| ≥50 | B | 6.0 |
| ≥40 | C | 5.0 |
| ≥35 | P | 4.0 |
| <35 | F | 0.0 |

GPA calculated from FINAL component only. Pass = any grade except F (P is a bare pass).

### Announcements (feat/phase4-announcements)
- `prisma/schema.prisma` — `Announcement` model (`targetRole String` — not enum, supports "ALL")
- `prisma/migrations/20260326000000_add_announcements/` — manual migration (shadow DB workaround)
- `server/controllers/announcementController.js` — 5 endpoints, role-scoped list, VALID_TARGETS guard
- `server/routes/announcements.js` — registered at `/api/announcements`
- `client/src/components/AnnouncementFormModal.jsx` — create/edit modal (controlled form, backdrop close)
- `client/src/components/AnnouncementsWidget.jsx` — shared read-only widget for all dashboards
- `client/src/pages/AnnouncementsPage.jsx` — shared full-page feed (Teacher + Student)
- `client/src/pages/admin/AnnouncementsPage.jsx` — admin table view with filter tabs, edit/delete, bento cards
- Widget wired into AdminDashboard, TeacherDashboard, StudentDashboard

### Announcements API endpoints
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/announcements` | ALL | Paginated list scoped to caller's role |
| GET | `/api/announcements/:id` | ALL | Single announcement (role-gated) |
| POST | `/api/announcements` | ADMIN | Create announcement |
| PATCH | `/api/announcements/:id` | ADMIN | Partial update |
| DELETE | `/api/announcements/:id` | ADMIN | Hard delete |

`targetRole` valid values: `ALL`, `ADMIN`, `TEACHER`, `STUDENT`. Stored as String (not enum) to avoid polluting the `Role` enum with a non-user value.

---

## How to help me
- Always explain the **why** behind patterns, not just the code
- Prefer production patterns (env vars, error handling, separation of concerns)
- Structure code as a company would (controllers / routes / middleware separated)
- When suggesting a library, briefly explain why it's the industry choice
- Remind me which **Git branch** to work on for each task
- When I'm starting a new phase, check this file and ask what's been completed