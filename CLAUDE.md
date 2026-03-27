# University Management System — Project Context

## What this project is
A full-stack University Management System built as a learning project with production-grade practices.
Roles: Student, Teacher, Admin.

---

## Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | Node.js + Express | REST API, JSON only |
| Frontend | React 19 (Vite 8) + Tailwind CSS | Fast DX, component-driven |
| Relational DB | MySQL via Prisma ORM | Users, courses, grades, attendance, timetable |
| Cache / OTP | Redis (ioredis) | OTP storage, rate limiting |
| Auth | JWT (access + refresh) + bcrypt + OTP | Industry-standard auth flow |
| Email | Nodemailer (Gmail) | OTP delivery |
| CAPTCHA | hCaptcha | Bot protection on login |

---

## Project Structure

```
/client                          ← React (Vite) app
  /src
    /components                  ← 12 reusable UI pieces (modals, sidebar, guards)
    /pages                       ← 20 pages across 4 directories
      /admin                     ← 6 pages (Users, Courses, Departments, Timetable, Announcements, StudentProfile)
      /teacher                   ← 5 pages (Attendance, AttendanceSession, Grades, GradeEntry, Timetable)
      /student                   ← 3 pages (Attendance, Grades, Timetable)
    /context                     ← AuthContext (auth state management)
    /lib                         ← Axios instance (api.js)
    App.jsx                      ← Authoritative route registry (all routes in one place)

/server                          ← Express API (JSON only, no views)
  /routes                        ← 7 route files (auth, users, courses, grades, attendance, announcements, timetable)
  /controllers                   ← 7 controllers (one per resource)
  /middleware                    ← authGuard, rateLimiter, errorHandler
  /lib                           ← prisma.js, redis.js, mailer.js, gradeUtils.js

/prisma
  schema.prisma                  ← 9 models, 4 enums
  seed.js                        ← 1 dept + 4 test users
  /migrations                    ← All Prisma migrations
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
- **Redis** used for: OTP storage, rate limiting
- **App.jsx is the single source of truth for all routes** — always edit this one file when adding routes

---

## Prisma Schema — Models & Enums

| Model | Purpose |
|---|---|
| Department | University departments (CSE, ECE, etc.) |
| User | All users — Admin, Teacher, Student (with studentId / teacherId) |
| Course | Course info, linked to department, type (MANDATORY / ELECTIVE) |
| Enrollment | Student ↔ Course junction |
| CourseTeacher | Teacher ↔ Course junction |
| Attendance | Per-date attendance per enrollment |
| Grade | Component grades (INTERNAL, MID_TERM, FINAL) per enrollment |
| Announcement | Admin broadcasts with role-targeted visibility |
| TimetableEntry | Weekly schedule entries (day, time, room, course, teacher) |

**Enums:** `Role`, `CourseType`, `GradeComponent`, `DayOfWeek`

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
  - [x] Timetable — model, CRUD API, admin table, teacher/student weekly grid
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)

---

## All API Endpoints

### Auth (`/api/auth`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/api/auth/login` | PUBLIC | Email + password + CAPTCHA → OTP sent |
| POST | `/api/auth/verify-otp` | PUBLIC | OTP verification → JWT tokens issued |
| POST | `/api/auth/refresh` | PUBLIC | Refresh access token via httpOnly cookie |
| POST | `/api/auth/logout` | AUTH | Clear refresh cookie |
| POST | `/api/auth/reset-password` | AUTH | Change password (first-login flow) |

### Users (`/api/users`) — ADMIN only
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/users` | Paginated list with role/status filters |
| GET | `/api/users/:id` | Single user details |
| POST | `/api/users` | Create user (auto-generates studentId/teacherId) |
| PATCH | `/api/users/:id` | Update email, department, password |
| PATCH | `/api/users/:id/deactivate` | Soft-disable account |
| POST | `/api/users/:id/reset-password` | Admin-triggered password reset via email |
| GET | `/api/users/departments` | All departments (for dropdowns) |
| GET | `/api/users/recent-activity` | 8 most recent enrollments |

### Courses (`/api/courses`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/courses` | ALL | Paginated list with filters |
| GET | `/api/courses/:id` | ALL | Course details + teachers + enrollments |
| POST | `/api/courses` | ADMIN | Create course |
| PATCH | `/api/courses/:id` | ADMIN | Update course |
| PATCH | `/api/courses/:id/deactivate` | ADMIN | Soft-disable course |
| POST | `/api/courses/:id/assign-teacher` | ADMIN | Assign teacher to course |
| POST | `/api/courses/:id/enroll` | ADMIN | Enroll student in course |
| POST | `/api/courses/:id/self-enroll` | STUDENT | Self-enroll in course |

### Attendance (`/api/attendance`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/attendance/courses` | TEACHER | Teacher's assigned courses |
| GET | `/api/attendance/:courseId/students` | TEACHER | Enrolled students for a course |
| POST | `/api/attendance/:courseId/mark` | TEACHER | Mark attendance for a date |
| GET | `/api/attendance/my` | STUDENT | Attendance summary per course |

### Grades (`/api/grades`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/grades/courses` | TEACHER | Courses with grading progress |
| GET | `/api/grades/:courseId/students` | TEACHER | Enrolled students + their grades |
| POST | `/api/grades/:courseId/students/:enrollmentId` | TEACHER | Upsert one component grade |
| GET | `/api/grades/my` | STUDENT | Full grade report with GPA |

### Announcements (`/api/announcements`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/announcements` | ALL | Paginated list scoped to caller's role |
| GET | `/api/announcements/:id` | ALL | Single announcement (role-gated) |
| POST | `/api/announcements` | ADMIN | Create announcement |
| PATCH | `/api/announcements/:id` | ADMIN | Partial update |
| DELETE | `/api/announcements/:id` | ADMIN | Hard delete |

### Timetable (`/api/timetable`)
| Method | Path | Role | Purpose |
|---|---|---|---|
| GET | `/api/timetable` | ALL | Entries for current user (admin: all, teacher/student: own) |
| GET | `/api/timetable/semesters` | ADMIN | Distinct semester values |
| POST | `/api/timetable` | ADMIN | Create entry |
| PATCH | `/api/timetable/:id` | ADMIN | Update entry |
| DELETE | `/api/timetable/:id` | ADMIN | Delete entry |

---

## Frontend Routes (App.jsx)

| Path | Role | Page |
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
| `/teacher/announcements` | TEACHER | AnnouncementsPage (shared) |
| `/teacher/timetable` | TEACHER | TeacherTimetablePage |
| `/student` | STUDENT | StudentDashboard |
| `/student/attendance` | STUDENT | StudentAttendancePage |
| `/student/grades` | STUDENT | StudentGradesPage |
| `/student/announcements` | STUDENT | AnnouncementsPage (shared) |
| `/student/timetable` | STUDENT | StudentTimetablePage |

---

## Grading System

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

`targetRole` valid values for announcements: `ALL`, `ADMIN`, `TEACHER`, `STUDENT`. Stored as String (not enum).

---

## Seed Data (prisma/seed.js)

| Email | Role | ID | Password |
|---|---|---|---|
| `pavitarmodgil001@gmail.com` | ADMIN | — | admin123 |
| `aman.kumar@uni.com` | TEACHER | TCH001 | teacher123 |
| `harveen.kaur@uni.com` | TEACHER | TCH002 | teacher123 |
| `aseem.kamra@uni.com` | STUDENT | STU003 | student123 |

Department seeded: **CSE** (Computer Science & Engineering)

---

## How to help me
- Always explain the **why** behind patterns, not just the code
- Prefer production patterns (env vars, error handling, separation of concerns)
- Structure code as a company would (controllers / routes / middleware separated)
- When suggesting a library, briefly explain why it's the industry choice
- Remind me which **Git branch** to work on for each task
- When I'm starting a new phase, check this file and ask what's been completed
