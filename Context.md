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
- [x] Phase 1 — Database Architecture DONE (MySQL install pending)
  - [x] schema.prisma — 7 models, 3 enums, 4 @@unique constraints
  - [x] seed.js — 4 users + CSE dept, bcrypt hashed
  - [x] Committed on feat/prisma-schema
  - [ ] MySQL install → migrate → seed → studio → PR to dev
- [ ] Phase 2 — Auth (JWT + OTP + Redis + CAPTCHA)
- [ ] Phase 3 — Frontend (Vite + React + Tailwind)
- [ ] Phase 4 — Features (attendance, grades, timetable, announcements)
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)

---

## Current State

Last updated: Phase 1 schema complete, MySQL install pending
Current branch: feat/prisma-schema
Next task: Install MySQL → run commands below → PR to dev → start Phase 2

Once MySQL installed:
```
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/university_db"
mysql -u root -p -e "CREATE DATABASE university_db;"
npx prisma migrate dev --name init
npx prisma db seed
npx prisma studio
```

---

## How to Start a New Claude Session

Paste this:
"I'm working on my University Management System. Read my context.md before doing anything: [paste context.md] Current phase: X | Branch: Y | Task: Z"