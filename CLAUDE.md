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
 
- [ ] Phase 0 — Foundation (Git Flow, .env, bcrypt fix)
- [ ] Phase 1 — Database Architecture (Prisma schema design)
- [ ] Phase 2 — Authentication (JWT + OTP + Redis + CAPTCHA)
- [ ] Phase 3 — Frontend Upgrade (Vite + React + Tailwind)
- [ ] Phase 4 — Features (timetable, grades, attendance, announcements)
- [ ] Phase 5 — Deploy (Docker + GitHub Actions)
 
---
 
## How to help me
- Always explain the **why** behind patterns, not just the code
- Prefer production patterns (env vars, error handling, separation of concerns)
- Structure code as a company would (controllers / routes / middleware separated)
- When suggesting a library, briefly explain why it's the industry choice
- Remind me which **Git branch** to work on for each task
- When I'm starting a new phase, check this file and ask what's been completed