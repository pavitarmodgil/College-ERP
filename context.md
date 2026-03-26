# University Management System — Project Context

> **How to use this file:**
> Keep this in your project root. Update "Current State" after every work session.
> Paste into Claude Chat, Claude Code, or Cowork at the start of each session.

---

## Project Overview

Full-stack University Management System — production-learning project.

- **Backend:** Node.js + Express (REST API)
- **Frontend:** React (Vite) + Tailwind + shadcn/ui *(Phase 3)*
- **Primary DB:** MySQL via Prisma ORM 5.x
- **Document DB:** MongoDB — profiles, announcements *(Phase 1 partial)*
- **Cache/OTP:** Redis via ioredis *(Phase 2)*
- **Auth:** JWT + refresh token + Email OTP + hCaptcha *(Phase 2)*

---

## User Roles & Login Logic

| Role    | Login Identifier | Permissions |
|---------|-----------------|-------------|
| Admin   | email only      | All — create/edit users, timetables, fees |
| Teacher | TCH001 or email | Roster, mark attendance, enter grades |
| Student | STU003 or email | Own dashboard, attendance %, grades |

Single portal detection logic:
- starts with "STU" → query studentId
- starts with "TCH" → query teacherId
- contains "@" → query email
- Role ALWAYS read from DB, never trusted from frontend

---

## Seed Data

| Name           | Role    | ID     | Dept | Notes |
|----------------|---------|--------|------|-------|
| admin@uni.com  | ADMIN   | —      | —    | Main admin |
| Dr. Aman Kumar | TEACHER | TCH001 | CSE  | Active |
| Harveen Kaur   | TEACHER | TCH002 | CSE  | mustResetPassword: true |
| Aseem Kamra    | STUDENT | STU003 | CSE  | Active |

All passwords bcrypt hashed, saltRounds: 12.

---

## Database Schema — 7 MySQL Models (Prisma)

| Model         | Purpose | Key constraints |
|---------------|---------|----------------|
| Department    | Dept list | code @unique |
| User          | All roles in one table | email/studentId/teacherId @unique |
| Course        | All courses | code @unique, type: MANDATORY/ELECTIVE |
| Enrollment    | Student-Course junction — anchor table | @@unique([userId, courseId]) |
| CourseTeacher | Teacher-Course junction | @@unique([courseId, userId]) |
| Attendance    | Per-enrollment per-date | @@unique([enrollmentId, date]) |
| Grade         | Per-enrollment per-component | @@unique([enrollmentId, component]) |

Enums: Role (ADMIN/TEACHER/STUDENT), CourseType (MANDATORY/ELECTIVE), GradeComponent (INTERNAL/MID_TERM/FINAL)

Key design decisions:
- Enrollment is the anchor — Attendance/Grade hang off enrollmentId, not userId directly
- Soft delete via isActive on User — never hard-delete users with academic records
- mustResetPassword flag handles first-login forced reset
- Prisma 5.x PINNED — Prisma 7 broke env() in schema.prisma, avoid until Phase 5

---

## Auth Flow (Phase 2 — designed, not yet built)

1. Submit identifier + password + CAPTCHA token
2. Backend detects identifier type, queries correct field
3. Verify CAPTCHA with hCaptcha API
4. bcrypt.compare() checks password
5. If mustResetPassword → redirect to reset, block token issue
6. Generate 6-digit OTP → Redis (5 min TTL) → email via Nodemailer
7. User submits OTP → verify Redis → delete key
8. Issue JWT access token (15 min) + refresh token in httpOnly cookie (7 days)
9. On expiry → client silently calls /auth/refresh

Rate limits: login 5/15min/IP, OTP 3/hour

---

## Key Rules

- Never commit .env — maintain .env.example with placeholders
- Never commit to main directly — Git Flow: main → dev → feat/branch
- Passwords always bcrypt hashed, saltRounds 12
- Helmet + CORS on every Express app
- Schema before routes — migrations first, endpoints after
- Role never trusted from frontend

---

## Phase Tracker

- [x] Phase 0 — Foundation (Git, .env, bcrypt) DONE
- [x] Phase 1 — Database Architecture DONE
  - [x] schema.prisma — 7 models, 3 enums, 4 @@unique constraints
  - [x] seed.js — 4 users + CSE dept, bcrypt hashed
- [x] Phase 2 — Auth (JWT + OTP + Redis + CAPTCHA) DONE
- [x] Phase 3 — Frontend (Vite + React + Tailwind) DONE
- [x] Phase 4 — Features (partial)
  - [x] Course Management — CRUD, assign teachers, enroll students, self-enroll
  - [x] Attendance — teacher marks sessions, student views percentage
  - [x] Grades — teacher entry per component, auto letter grade, student GPA report
  - [ ] Timetable / Announcements
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)

---

## Current State

Last updated: Phase 4 — Grades complete (2026-03-26)
Current branch: feat/phase4-course-management
Next task: Open PR feat/phase4-course-management → dev, then dev → main (Phase 4 complete)

### What's working end-to-end
- Login: identifier (email / TCH001 / STU003) + password + hCaptcha + OTP → JWT
- Admin: user CRUD, course CRUD, department list, all 4 dashboard stat cards live
- Teacher: course list, assign self, mark attendance sessions, enter grades per component
- Student: self-enroll, view attendance %, view grades + GPA

### Grades feature (server)
- `server/lib/gradeUtils.js` — letter grade + GPA logic (business rules isolated)
- `server/controllers/gradeController.js` — 4 endpoints
- `server/routes/grades.js` — `/api/grades`
- Letter grade scale: O(≥80) A+(≥70) A(≥65) B+(≥61) B(≥50) C(≥40) P(≥35) F(<35)
- GPA on 10-point scale, calculated from FINAL component only
- Upsert pattern — re-saving never creates duplicates (@@unique[enrollmentId, component])

### Grades feature (client)
- `/teacher/grades` — TeacherGradesPage: course cards with progress bar + component status
- `/teacher/grades/:courseId` — GradeEntryPage: tab switcher, bulk apply, per-row save
- `/student/grades` — StudentGradesPage: GPA banner, pass/fail/pending per course

### PR commands when ready
```bash
git push origin feat/phase4-course-management
# Open PR: feat/phase4-course-management → dev
# After merge: open PR dev → main (Phase 4 complete)
```

---

## How to Start a New Claude Session

Paste this:
"I'm working on my University Management System. Read my context.md before doing anything: [paste context.md] Current phase: X | Branch: Y | Task: Z"