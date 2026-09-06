# Academic Curator — University Management System

A full-stack, role-based University Management System built with production-grade architecture. Three roles (Admin, Teacher, Student) each get a tailored dashboard, with features spanning course management, attendance tracking, grading, announcements, and timetable scheduling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS + Material Symbols |
| **Backend** | Node.js + Express (REST API, JSON only) |
| **Database** | PostgreSQL via Prisma ORM 5.x (10 models, 5 enums) |
| **Cache** | Redis (ioredis) — OTP storage, rate limiting |
| **Auth** | JWT (access + refresh tokens) + bcryptjs + 6-digit OTP |
| **Email** | Resend HTTP API (Railway blocks SMTP ports) |
| **CAPTCHA** | hCaptcha |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis server
- Resend API key (for OTP emails)
- hCaptcha site key + secret

### Setup

```bash
# 1. Clone and install
git clone https://github.com/pavitarmodgil/College-ERP.git
cd College-ERP
npm install
cd client && npm install && cd ..

# 2. Configure environment
cp .env.example .env
# Edit .env with your PostgreSQL, Redis, Resend, hCaptcha, and JWT secrets

# 3. Set up the database
npx prisma migrate deploy
npx prisma db seed

# 4. Start both servers
npm run dev
```

The API runs on `http://localhost:4000` and the client on `http://localhost:5173`.

---

## Seed Accounts

| Email | Role | Password | Notes |
|---|---|---|---|
| `pavitarmodgil001@gmail.com` | Admin | `admin123` | |
| `pavitar0883.becse24@chitkara.edu.in` | Teacher (TCH001) | `teacher123` | 2 courses |
| `abheyjeet100@gmail.com` | Teacher (TCH100) | `teacher123` | 2 courses |
| `pavitarmodgil1512@gmail.com` | Student (STU100) | `student123` | Demo — 4 courses, full data |
| `arjun.verma@uni.com` | Student (STU005) | `student123` | High performer — GPA 10.0 |
| `poor.performer@uni.com` | Student (STU006) | `student123` | At-risk — low attendance + grades |
| `no.courses@uni.com` | Student (STU009) | `student123` | Empty-dashboard edge case |

Full seed roster (18 users · 12 courses · 24 enrollments) is documented in [`CLAUDE.md`](CLAUDE.md#seed-data).

---

## Features by Role

### Admin
- **Dashboard** — stat cards (students, teachers, courses, departments, enrollments, attendance rate), quick actions, announcements widget
- **User Management** — create/edit/deactivate users, admin-triggered password reset, paginated table with role filters, clickable student rows → profile page
- **Course Management** — CRUD courses, assign teachers, enroll students
- **Departments** — view all departments and codes
- **Announcements** — create/edit/delete broadcasts targeted to specific roles (ALL, ADMIN, TEACHER, STUDENT)
- **Timetable** — full CRUD for scheduling (course, teacher, day, time, room, semester)
- **Auto Timetable Generator** — greedy scheduler proposes a conflict-free week; review the draft, then commit it in one transaction

### Teacher
- **Dashboard** — assigned courses, announcements widget
- **Attendance** — select course → mark present/absent per student per date, plus full history and single-record editing
- **Grades** — per-course grading with three components (Internal, Mid-Term, Final), auto letter grade calculation, bulk apply
- **Assessments** — schedule quizzes/assignments/exams/projects for own courses
- **Timetable** — weekly grid or calendar view of assigned teaching slots, today highlighted
- **Announcements** — role-scoped feed

### Student
- **Dashboard** — Academic Command Center, enrolled courses, upcoming assessments, announcements widget
- **Attendance** — per-course attendance percentage summary
- **Grades** — GPA banner, per-course breakdown with pass/fail/pending badges, component-level detail
- **Academic Insights** — per-course attendance risk band, classes needed to reach 75%, projected final grade, and marks needed in the final
- **Timetable** — weekly grid or calendar view with day filter pills, today indicator, course/teacher/room details
- **Announcements** — role-scoped feed
- **Self-Enrollment** — browse and enroll in available courses

---

## API Endpoints

### Auth — `/api/auth`
| Method | Path | Description |
|---|---|---|
| POST | `/login` | Verify credentials + CAPTCHA → send OTP |
| POST | `/verify-otp` | Verify OTP → issue JWT tokens |
| POST | `/refresh` | Refresh access token |
| POST | `/logout` | Clear refresh cookie |
| POST | `/reset-password` | Change password (first-login) |

### Users — `/api/users` (Admin)
| Method | Path | Description |
|---|---|---|
| GET | `/` | Paginated list with role/status filters |
| GET | `/:id` | Single user details |
| POST | `/` | Create user (auto studentId/teacherId) |
| PATCH | `/:id` | Update user |
| PATCH | `/:id/deactivate` | Soft-disable |
| POST | `/:id/reset-password` | Email temp password |
| GET | `/departments` | All departments |
| GET | `/recent-activity` | Recent enrollments |

### Courses — `/api/courses`
| Method | Path | Description |
|---|---|---|
| GET | `/available` | Courses the student is not enrolled in (Student) |
| GET | `/` | Paginated list, role-scoped |
| GET | `/:id` | Course details |
| POST | `/` | Create (Admin) |
| PATCH | `/:id` | Update (Admin) |
| PATCH | `/:id/deactivate` | Deactivate (Admin) |
| POST | `/:id/teachers` | Assign teacher (Admin) |
| DELETE | `/:id/teachers/:userId` | Remove teacher (Admin) |
| POST | `/:id/enroll` | Self-enroll (Student) |
| POST | `/:id/enrollments` | Enroll a student (Admin) |
| DELETE | `/:id/enrollments/:userId` | Remove a student (Admin) |

### Attendance — `/api/attendance`
| Method | Path | Description |
|---|---|---|
| GET | `/my` | Student's per-course percentage |
| GET | `/courses` | Teacher's courses + today's submission status |
| GET | `/:courseId/session` | Session for a date (`?date=YYYY-MM-DD`) |
| POST | `/:courseId/session` | Save/upsert a full session |
| GET | `/:courseId/history` | Past sessions with present/absent counts |
| PATCH | `/:enrollmentId` | Edit a single record |

### Grades — `/api/grades`
| Method | Path | Description |
|---|---|---|
| GET | `/courses` | Teacher's courses + progress |
| GET | `/:courseId/students` | Students + grades |
| POST | `/:courseId/students/:enrollmentId` | Upsert grade |
| GET | `/my` | Student's GPA report |

### Announcements — `/api/announcements`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Role-scoped list |
| GET | `/:id` | Single announcement |
| POST | `/` | Create (Admin) |
| PATCH | `/:id` | Update (Admin) |
| DELETE | `/:id` | Delete (Admin) |

### Timetable — `/api/timetable`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Entries (scoped by role) |
| GET | `/semesters` | Distinct semesters (Admin) |
| GET | `/insights` | Per-course risk + grade projection (Student) |
| POST | `/generate` | Auto-scheduler → draft, saves nothing (Admin) |
| POST | `/bulk` | Commit a reviewed draft (Admin) |
| POST | `/` | Create entry (Admin) |
| PATCH | `/:id` | Update entry (Admin) |
| DELETE | `/:id` | Delete entry (Admin) |

### Assessments — `/api/assessments`
| Method | Path | Description |
|---|---|---|
| GET | `/` | Role-scoped list (`?courseId=` `?upcoming=1`) |
| POST | `/` | Create (Teacher: own courses · Admin) |
| PATCH | `/:id` | Update (Teacher: own courses · Admin) |
| DELETE | `/:id` | Delete (Teacher: own courses · Admin) |

---

## Academic Insights

`GET /api/timetable/insights` returns per-course decision support for a student. The logic lives in `server/lib/timetableInsights.js` and is **rule-based, not machine learning**:

| Signal | Rule |
|---|---|
| Attendance band | `≥ 75%` SAFE · `65–74%` WARNING · `< 65%` CRITICAL |
| Classes needed | Smallest `x` where `(attended + x) / (total + x) ≥ 0.75` |
| Grade projection | Weighted `INTERNAL 0.2 · MID_TERM 0.3 · FINAL 0.5` |
| Grade risk | Projected letter is `F` or `P` (below 40 marks) |
| Marks needed in final | Minimum final score that holds the projected letter band |

The pure helpers are unit-tested:

```bash
node --test server/lib/__tests__/
```

---

## Grading Scale

| Marks | Grade | GPA |
|---|---|---|
| ≥ 80 | O (Outstanding) | 10.0 |
| ≥ 70 | A+ | 9.0 |
| ≥ 65 | A | 8.0 |
| ≥ 61 | B+ | 7.0 |
| ≥ 50 | B | 6.0 |
| ≥ 40 | C | 5.0 |
| ≥ 35 | P (Pass) | 4.0 |
| < 35 | F (Fail) | 0.0 |

GPA is calculated from the **FINAL** component only.

---

## Project Structure

```
College-ERP/
├── client/                         # React (Vite) frontend
│   └── src/
│       ├── components/             # 15 reusable components
│       │   ├── Sidebar.jsx         #   Role-based navigation
│       │   ├── ProtectedRoute.jsx  #   Route guard (role check)
│       │   ├── ThemeToggle.jsx     #   Dark/light mode
│       │   ├── UserModal.jsx       #   Create/edit user form
│       │   ├── CourseFormModal.jsx  #   Create/edit course form
│       │   ├── CourseDetailModal.jsx
│       │   ├── DeactivateConfirmModal.jsx
│       │   ├── DeactivateCourseModal.jsx
│       │   ├── AnnouncementFormModal.jsx
│       │   ├── AnnouncementDetailModal.jsx
│       │   ├── AnnouncementsWidget.jsx
│       │   ├── TimetableEntryFormModal.jsx
│       │   ├── CalendarView.jsx     #   Shared calendar (student + teacher)
│       │   ├── AcademicCommandCenter.jsx
│       │   └── UpcomingAssessmentsWidget.jsx
│       ├── pages/                  # 21 route pages
│       │   ├── LoginPage.jsx
│       │   ├── ResetPasswordPage.jsx
│       │   ├── AdminDashboard.jsx
│       │   ├── TeacherDashboard.jsx
│       │   ├── StudentDashboard.jsx
│       │   ├── AnnouncementsPage.jsx  # Shared (Teacher + Student)
│       │   ├── admin/
│       │   │   ├── UsersPage.jsx
│       │   │   ├── CoursesPage.jsx
│       │   │   ├── DepartmentsPage.jsx
│       │   │   ├── StudentProfilePage.jsx
│       │   │   ├── AnnouncementsPage.jsx
│       │   │   ├── TimetablePage.jsx
│       │   │   ├── TimetableGeneratorPage.jsx
│       │   │   └── AdminProfilePage.jsx
│       │   ├── teacher/
│       │   │   ├── TeacherAttendancePage.jsx
│       │   │   ├── AttendanceSessionPage.jsx
│       │   │   ├── AttendanceHistoryPage.jsx
│       │   │   ├── TeacherGradesPage.jsx
│       │   │   ├── GradeEntryPage.jsx
│       │   │   └── TeacherTimetablePage.jsx
│       │   └── student/
│       │       ├── StudentAttendancePage.jsx
│       │       ├── StudentGradesPage.jsx
│       │       └── StudentTimetablePage.jsx
│       ├── context/AuthContext.jsx  # Auth state + JWT management
│       ├── lib/api.js               # Axios instance
│       └── App.jsx                  # Route registry (single source of truth)
│
├── server/                         # Express API
│   ├── index.js                    # App entry point
│   ├── controllers/                # 8 controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── courseController.js
│   │   ├── attendanceController.js
│   │   ├── gradeController.js
│   │   ├── announcementController.js
│   │   ├── timetableController.js
│   │   └── assessmentController.js
│   ├── routes/                     # 8 route files
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── courses.js
│   │   ├── attendance.js
│   │   ├── grades.js
│   │   ├── announcements.js
│   │   ├── timetable.js
│   │   └── assessments.js
│   ├── middleware/
│   │   ├── authGuard.js            # JWT verification + role check
│   │   ├── rateLimiter.js          # Login + OTP throttling
│   │   └── errorHandler.js         # Global error handler
│   └── lib/
│       ├── prisma.js               # Prisma client singleton
│       ├── redis.js                # ioredis client
│       ├── mailer.js               # Resend HTTP API client
│       ├── gradeUtils.js           # Letter grade + GPA helpers
│       ├── timetableInsights.js    # Risk bands + grade projection (pure + DB)
│       └── __tests__/
│           └── timetableInsights.test.js
│
├── ai/                             # Phase 7 — ML module (see ai/README.md)
│
├── prisma/
│   ├── schema.prisma               # 10 models, 5 enums
│   ├── seed.js                     # 18 users, 12 courses, full academic records
│   └── migrations/                 # All migration history
│
├── .env.example                    # Environment variable template
├── CLAUDE.md                       # AI assistant context file
├── context.md                      # Session-to-session handoff doc
└── package.json                    # Scripts: dev, server, client
```

---

## Security

- Passwords hashed with **bcryptjs** (12 salt rounds)
- **JWT** access tokens (15 min) + refresh tokens in httpOnly cookies (7 days)
- **6-digit OTP** via email, stored in Redis with 5-minute TTL
- **hCaptcha** verification on login
- **Rate limiting**: 5 login attempts / 15 min / IP, 3 OTP requests / hour
- **Helmet** security headers on all responses
- **CORS** configured for client origin only
- **Role-based access control** on every API endpoint
- First-login **forced password reset**

---

## Scripts

```bash
npm run dev        # Start both API + client (concurrently)
npm run server     # Start API server only
npm run client     # Start Vite dev server only
npm start          # Production: API server

node --test server/lib/__tests__/    # Unit tests (no npm test script yet)
```

---

## License

MIT
