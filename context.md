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
| Student | STU003 or email | Own attendance %, grades, timetable, self-enroll |

Role is always read from the DB, never trusted from the frontend.

---

## Seed Users

All passwords: admin → `admin123` · teacher → `teacher123` · student → `student123`

**Admins:** pavitarmodgil001@gmail.com · admin.secondary@uni.com

**Teachers:** aman.kumar@uni.com (TCH001) · rajesh.singh@uni.com (TCH002) · priya.sharma@uni.com (TCH003) · harveen.kaur@uni.com (TCH004, mustReset) · vikram.patel@uni.com (TCH005) · anjali.gupta@uni.com (TCH006) · neha.mishra@uni.com (TCH007)

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
3. Verify hCaptcha with hCaptcha API
4. `bcryptjs.compare()` checks password
5. If `mustResetPassword` → return `{ mustReset: true }`, no OTP issued
6. Generate 6-digit OTP → Redis (5 min TTL) → email via Resend HTTP API
7. User submits OTP → verify + delete from Redis (single-use)
8. Issue JWT access token (15 min) + refresh token in httpOnly cookie (7 days)
9. On expiry → Axios interceptor in `client/src/lib/api.js` silently calls `/auth/refresh`

---

## Phase Tracker

- [x] Phase 0 — Foundation (Git Flow, .env, bcrypt)
- [x] Phase 1 — Database Architecture (Prisma schema, 9 models, seed)
- [x] Phase 2 — Authentication (JWT + OTP + Redis + hCaptcha + rate limiting)
- [x] Phase 3 — Frontend (Vite + React 19 + Tailwind + shadcn/ui)
- [x] Phase 4 — Features (all complete)
  - [x] Course Management — CRUD, assign teachers, enroll, self-enroll
  - [x] Attendance — teacher marks, student views %
  - [x] Grades — per-component entry, auto letter grade, GPA report
  - [x] Announcements — admin CRUD, role-targeted, dashboard widget
  - [x] Timetable — CRUD API, admin table, teacher/student weekly grid
  - [x] UX fixes — name fields (firstName/lastName), login OTP preview removed, dashboard duplicate stats removed, sidebar profile card clickable nav
- [x] Phase 5 — Deploy (Railway; production hardening complete)

---

## Current State

**Last updated:** 2026-05-21
**Current branch:** `main`
**Next task:** Frontend — attendance history UI with edit forms + date picker for backfill

### Phase 5 Progress

- [x] Attendance: Teachers can view past sessions
- [x] Attendance: Teachers can edit past attendance (single + bulk)
- [ ] Frontend: Build attendance history UI with edit forms
- [ ] Frontend: Build date picker for backfill workflow

### What's working end-to-end

- **Auth:** identifier (email / TCH001 / STU003) + password + hCaptcha + OTP → JWT + silent refresh
- **Admin:** user CRUD (with optional firstName/lastName), course CRUD, department list, announcement CRUD, timetable CRUD, dashboard stats (single row) + recent activity; user table and student profile show real names with email fallback
- **Teacher:** course list, mark attendance sessions (today + past dates), edit individual past marks, bulk-add missed sessions, enter grades per component, view timetable, view announcements
- **Student:** self-enroll, view attendance %, view grades + GPA, view timetable, view announcements

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

> "I'm working on my University Management System. Current phase: [X] | Branch: [Y] | Task: [Z]"
