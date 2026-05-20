# Academic Curator — University Management System

A full-stack, role-based University Management System built with production-grade architecture. Three roles (Admin, Teacher, Student) each get a tailored dashboard, with features spanning course management, attendance tracking, grading, announcements, and timetable scheduling.

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19 + Vite 8 + Tailwind CSS + Material Symbols |
| **Backend** | Node.js + Express (REST API, JSON only) |
| **Database** | PostgreSQL via Prisma ORM (9 models, 4 enums) |
| **Cache** | Redis (ioredis) — OTP storage, rate limiting |
| **Auth** | JWT (access + refresh tokens) + bcrypt + 6-digit OTP |
| **Email** | Nodemailer (Gmail SMTP) |
| **CAPTCHA** | hCaptcha |

---

## Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Redis server
- Gmail account with App Password (for OTP emails)
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
# Edit .env with your PostgreSQL, Redis, Gmail, hCaptcha, and JWT secrets

# 3. Set up the database
npx prisma migrate deploy
npx prisma db seed

# 4. Start both servers
npm run dev
```

The API runs on `http://localhost:4000` and the client on `http://localhost:5173`.

---

## Seed Accounts

| Email | Role | Password |
|---|---|---|
| `pavitarmodgil001@gmail.com` | Admin | `admin123` |
| `aman.kumar@uni.com` | Teacher (TCH001) | `teacher123` |
| `harveen.kaur@uni.com` | Teacher (TCH002) | `teacher123` |
| `aseem.kamra@uni.com` | Student (STU003) | `student123` |

---

## Features by Role

### Admin
- **Dashboard** — stat cards (students, teachers, courses, departments, enrollments, attendance rate), quick actions, announcements widget
- **User Management** — create/edit/deactivate users, admin-triggered password reset, paginated table with role filters, clickable student rows → profile page
- **Course Management** — CRUD courses, assign teachers, enroll students
- **Departments** — view all departments and codes
- **Announcements** — create/edit/delete broadcasts targeted to specific roles (ALL, ADMIN, TEACHER, STUDENT)
- **Timetable** — full CRUD for scheduling (course, teacher, day, time, room, semester)

### Teacher
- **Dashboard** — assigned courses, announcements widget
- **Attendance** — select course → mark present/absent per student per date
- **Grades** — per-course grading with three components (Internal, Mid-Term, Final), auto letter grade calculation, bulk apply
- **Timetable** — weekly grid view showing assigned teaching slots, today highlighted
- **Announcements** — role-scoped feed

### Student
- **Dashboard** — enrolled courses, announcements widget
- **Attendance** — per-course attendance percentage summary
- **Grades** — GPA banner, per-course breakdown with pass/fail/pending badges, component-level detail
- **Timetable** — weekly grid with day filter pills, today indicator, course/teacher/room details
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
| GET | `/` | Paginated list |
| GET | `/:id` | Course details |
| POST | `/` | Create (Admin) |
| PATCH | `/:id` | Update (Admin) |
| PATCH | `/:id/deactivate` | Deactivate (Admin) |
| POST | `/:id/assign-teacher` | Assign teacher (Admin) |
| POST | `/:id/enroll` | Enroll student (Admin) |
| POST | `/:id/self-enroll` | Self-enroll (Student) |

### Attendance — `/api/attendance`
| Method | Path | Description |
|---|---|---|
| GET | `/courses` | Teacher's courses |
| GET | `/:courseId/students` | Students for course |
| POST | `/:courseId/mark` | Mark attendance |
| GET | `/my` | Student's summary |

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
| GET | `/semesters` | Distinct semesters |
| POST | `/` | Create entry (Admin) |
| PATCH | `/:id` | Update entry (Admin) |
| DELETE | `/:id` | Delete entry (Admin) |

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
│       ├── components/             # 12 reusable components
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
│       │   └── TimetableEntryFormModal.jsx
│       ├── pages/                  # 20 route pages
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
│       │   │   └── TimetablePage.jsx
│       │   ├── teacher/
│       │   │   ├── TeacherAttendancePage.jsx
│       │   │   ├── AttendanceSessionPage.jsx
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
│   ├── controllers/                # 7 controllers
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── courseController.js
│   │   ├── attendanceController.js
│   │   ├── gradeController.js
│   │   ├── announcementController.js
│   │   └── timetableController.js
│   ├── routes/                     # 7 route files
│   │   ├── auth.js
│   │   ├── users.js
│   │   ├── courses.js
│   │   ├── attendance.js
│   │   ├── grades.js
│   │   ├── announcements.js
│   │   └── timetable.js
│   ├── middleware/
│   │   ├── authGuard.js            # JWT verification + role check
│   │   ├── rateLimiter.js          # Login + OTP throttling
│   │   └── errorHandler.js         # Global error handler
│   └── lib/
│       ├── prisma.js               # Prisma client singleton
│       ├── redis.js                # ioredis client
│       ├── mailer.js               # Nodemailer config
│       └── gradeUtils.js           # Letter grade + GPA helpers
│
├── prisma/
│   ├── schema.prisma               # 9 models, 4 enums
│   ├── seed.js                     # Test data (4 users, 1 dept)
│   └── migrations/                 # All migration history
│
├── .env.example                    # Environment variable template
├── CLAUDE.md                       # AI assistant context file
└── package.json                    # Scripts: dev, server, client
```

---

## Security

- Passwords hashed with **bcrypt** (12 salt rounds)
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
```

---

## License

MIT
