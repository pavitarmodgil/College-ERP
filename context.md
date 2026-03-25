# University Management System — Project Context

> **How to use this file:**
> Keep this in your project root. Update "Current State" after every work session.
> Paste into Claude Chat, Claude Code, or Cowork at the start of each session.

---

## Project Overview

Full-stack University Management System — production-learning project.

- **Backend:** Node.js + Express (REST API) — server/index.js on port 4000
- **Frontend:** React (Vite) + Tailwind — client/ on port 5173
- **Primary DB:** MySQL via Prisma ORM 5.x
- **Document DB:** MongoDB — profiles, announcements *(Phase 4)*
- **Cache/OTP:** Redis (local Windows service, port 6379)
- **Auth:** JWT + refresh token + Email OTP + hCaptcha ✅ DONE

---

## User Roles & Login Logic

| Role    | Login Identifier | Permissions |
|---------|-----------------|-------------|
| Admin   | email only      | All — create/edit users, timetables, fees |
| Teacher | TCH001 or email | Roster, mark attendance, enter grades |
| Student | STU003 or email | Own dashboard, attendance %, grades |

Single portal detection (server/controllers/authController.js):
- starts with "STU" → query studentId
- starts with "TCH" → query teacherId
- contains "@" → query email
- Role ALWAYS read from DB, never trusted from frontend

---

## Seed Data

| Name           | Role    | ID     | Notes |
|----------------|---------|--------|-------|
| admin@uni.com  | ADMIN   | —      | Main admin |
| Dr. Aman Kumar | TEACHER | TCH001 | Active |
| Harveen Kaur   | TEACHER | TCH002 | mustResetPassword: true |
| Aseem Kamra    | STUDENT | STU003 | Active |

All passwords bcrypt hashed, saltRounds: 12.

---

## Database Schema — 7 MySQL Models (Prisma 5.x)

| Model         | Purpose | Key constraints |
|---------------|---------|----------------|
| Department    | Dept list | code @unique |
| User          | All roles in one table | email/studentId/teacherId @unique |
| Course        | All courses | code @unique, type: MANDATORY/ELECTIVE |
| Enrollment    | Student-Course junction — anchor table | @@unique([userId, courseId]) |
| CourseTeacher | Teacher-Course junction | @@unique([courseId, userId]) |
| Attendance    | Per-enrollment per-date | @@unique([enrollmentId, date]) |
| Grade         | Per-enrollment per-component | @@unique([enrollmentId, component]) |

Enums: Role, CourseType, GradeComponent
Prisma 5.x PINNED — do not upgrade until Phase 5.

---

## API Structure (server/ — port 4000)

```
server/
  index.js              ← entry point, helmet + cors + cookieParser
  routes/
    auth.js             ← 5 auth routes
  controllers/
    authController.js   ← login, verifyOTP, refresh, logout, resetPassword
  middleware/
    authGuard.js        ← JWT verification + requireRole()
    rateLimiter.js      ← loginLimiter (5/15min), otpLimiter (3/hr)
    errorHandler.js     ← central error handler
  lib/
    prisma.js           ← singleton PrismaClient
    redis.js            ← singleton ioredis client
    mailer.js           ← nodemailer + sendOTPEmail()
```

## Auth Routes

| Method | Route | Protection | Purpose |
|--------|-------|-----------|---------|
| POST | /api/auth/login | loginLimiter | identifier + password + captcha → OTP |
| POST | /api/auth/verify-otp | otpLimiter | OTP → JWT + refresh cookie |
| POST | /api/auth/refresh | none | refresh cookie → new JWT |
| POST | /api/auth/logout | none | clear refresh cookie |
| POST | /api/auth/reset-password | none | for mustResetPassword users |
| GET | /api/health | none | health check |

## Auth Flow

1. Submit identifier + password + hCaptcha token
2. Backend detects identifier type, queries correct field
3. Verify CAPTCHA with hCaptcha API (dev mode: bypass with 'dev-bypass' token)
4. bcrypt.compare() checks password
5. If mustResetPassword → client redirects to reset page
6. Generate 6-digit OTP → Redis (5 min TTL) → email via Nodemailer
7. User submits OTP → verify Redis → delete key (one-time use)
8. Issue JWT access token (15 min) + refresh token in httpOnly cookie (7 days)
9. On expiry → client silently calls /api/auth/refresh

## Security layers
- helmet() — 12 HTTP security headers
- CORS — only allows CLIENT_URL origin, credentials: true
- Rate limiting — login 5/15min, OTP 3/hr
- httpOnly cookie — JS cannot read refresh token
- JWT — stateless, short-lived access tokens
- hCaptcha — bot protection before DB is touched (dev bypass in dev mode)
- Role from DB only — never trusted from client

---

## Frontend Structure (client/ — port 5173)

```
client/
  src/
    components/
      ProtectedRoute.jsx  ← route guard (auth + role check)
      Sidebar.jsx         ← role-aware nav, username display, theme toggle
      ThemeToggle.jsx      ← dark/light mode toggle (localStorage)
    context/
      AuthContext.jsx      ← global auth state, login/logout, JWT parsing
    lib/
      api.js              ← axios singleton, interceptors (auto JWT, 401 refresh)
    pages/
      LoginPage.jsx       ← split layout, hCaptcha (dev bypass), 2-step OTP
      ResetPasswordPage.jsx
      AdminDashboard.jsx  ← greeting, 4 stat cards, quick actions
      TeacherDashboard.jsx ← greeting, 3 stat cards, empty state
      StudentDashboard.jsx ← greeting, 3 stat cards, empty state
    App.jsx               ← router (public + 3 role-protected routes)
    main.jsx              ← entry, theme init
    index.css             ← Tailwind directives
  .env                    ← VITE_API_URL, VITE_HCAPTCHA_SITE_KEY
  tailwind.config.js      ← darkMode: 'class'
  vite.config.js
```

---

## Environment Variables

```
DATABASE_URL="mysql://root:PASSWORD@localhost:3306/university_db"
JWT_SECRET="<32+ char random string>"
JWT_REFRESH_SECRET="<different 32+ char random string>"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
GMAIL_USER="email@gmail.com"
GMAIL_APP_PASSWORD="xxxx xxxx xxxx xxxx"
HCAPTCHA_SECRET="<from hcaptcha.com or test secret for dev>"
NODE_ENV="development"
CLIENT_URL="http://localhost:5173"
API_PORT=4000
```

Client env (client/.env):
```
VITE_API_URL=http://localhost:4000/api
VITE_HCAPTCHA_SITE_KEY=<from hcaptcha.com or test key for dev>
```

---

## Key Rules

- Never commit .env — maintain .env.example
- Never commit to main — Git Flow: main → dev → feat/branch
- Passwords always bcrypt, saltRounds 12
- Schema before routes — migrations first
- Role never from frontend
- Prisma 5.x pinned

---

## Phase Tracker

- [x] Phase 0 — Foundation (Git, .env, bcrypt) ✅
- [x] Phase 1 — Database Architecture (Prisma, MySQL, 7 models) ✅
- [x] Phase 2 — Authentication (JWT + OTP + Redis + hCaptcha) ✅
  - [x] All 5 auth routes working
  - [x] Rate limiting verified (blocks at attempt 5)
  - [x] authGuard middleware working
  - [x] OTP flow working end-to-end
  - [x] Refresh token cookie working
  - [x] Logout working
  - [x] hCaptcha — dev bypass in dev mode, real widget in prod
- [x] Phase 3 — Frontend (Vite + React + Tailwind) ✅
  - [x] Split-layout login page with hCaptcha dev bypass
  - [x] 2-step auth flow (credentials → OTP) with step indicator
  - [x] Role-based routing (admin/teacher/student dashboards)
  - [x] Sidebar with username, role badge, gradient active state
  - [x] Dashboard stat cards (bento grid) for all 3 roles
  - [x] Dark mode toggle (persists via localStorage)
  - [x] Old server.js, users.json, views/, public/ deleted
- [ ] Phase 4 — Features (attendance, grades, timetable, announcements)
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)

---

## Current State

Last updated: Phase 3 complete ✅
Current branch: dev
Next task: Phase 4 — Features (attendance, grades, timetable, announcements)

### What's working
- MySQL: 7 tables, seed data verified in Prisma Studio
- Redis: local Windows service, confirmed working
- API server: port 4000, all auth routes tested
- React frontend: port 5173, login + OTP + dashboards
- Dark mode: works on all pages, persists on refresh
- Role routing: each role gets correct dashboard, wrong role redirects
- GitHub: main + dev branches, PRs merged

### Known items for Phase 4
- MongoDB needed for announcements and profiles
- Need routes for: users CRUD, courses CRUD, enrollment CRUD, attendance, grades
- Wire dashboard stat cards to real API endpoints
- Add real content to dashboard pages (tables, forms, charts)

---

## Folder Structure (current)

```
/
├── server/              ← Express API (port 4000) ✅
│   ├── index.js
│   ├── routes/
│   ├── controllers/
│   ├── middleware/
│   └── lib/
├── client/              ← React app (Vite, port 5173) ✅
│   └── src/
│       ├── components/
│       ├── context/
│       ├── lib/
│       └── pages/
├── prisma/              ← schema, migrations, seed ✅
├── .env
├── .env.example
├── CLAUDE.md
└── context.md
```

---

## Libraries Installed

| Library | Purpose |
|---------|---------|
| prisma@5 + @prisma/client@5 | ORM, schema-first, type-safe |
| bcrypt | Password hashing, saltRounds 12 |
| jsonwebtoken | JWT access + refresh tokens |
| ioredis | Redis client, singleton |
| nodemailer | OTP email via Gmail SMTP |
| express-rate-limit | Login + OTP rate limiting |
| helmet | 12 HTTP security headers |
| cors | Cross-origin for React frontend |
| cookie-parser | Read httpOnly refresh cookie |
| dotenv | Environment variable loading |
| react + react-dom | UI framework |
| react-router-dom | Client-side routing |
| axios | HTTP client with interceptors |
| @hcaptcha/react-hcaptcha | CAPTCHA widget |
| tailwindcss | Utility-first CSS |
| lucide-react | Icon set |
| concurrently | Run server + client together |

---

## Git Branch Convention

```
main      ← always deployable, protected
dev       ← integration branch
feat/xxx  ← features
fix/xxx   ← bug fixes
chore/xxx ← config, tooling
```

---

## How to Start a New Claude Session

```
I'm working on my University Management System.
Read my context.md before doing anything:
[paste context.md]
Current phase: X | Branch: Y | Task: Z
```
