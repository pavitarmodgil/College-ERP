# 🎓 UniPortal — University Management System  v2.0

Role-based UMS built with **Node.js + Express + JSON file storage**.

---

## 🚀 Setup & Run

```bash
# 1. Install dependencies
npm install express express-session

# 2. Start the server
node server.js

# 3. Open in browser
http://localhost:3000
```

---

## 🔑 Default Admin Login

| Field    | Value          |
|----------|----------------|
| Email    | admin@uni.com  |
| Password | admin123       |

---

## 👥 Roles

| Role    | Login Page       | Features                          |
|---------|------------------|-----------------------------------|
| Admin   | /admin-login     | Create users, view all users      |
| Teacher | /teacher-login   | View student directory            |
| Student | /student-login   | View own profile (ID, dept, year) |

---

## 📋 All Routes

| Method | Route               | Description                                  |
|--------|---------------------|----------------------------------------------|
| GET    | /                   | Landing page — role selection                |
| GET    | /admin-login        | Admin login page                             |
| GET    | /teacher-login      | Teacher login page                           |
| GET    | /student-login      | Student login page (email OR student ID)     |
| GET    | /reset-password     | First-login password reset page              |
| GET    | /admin-dashboard    | Admin dashboard (protected)                  |
| GET    | /teacher-dashboard  | Teacher dashboard (protected)                |
| GET    | /student-dashboard  | Student dashboard (protected)                |
| GET    | /create-user        | Create user form — admin only                |
| GET    | /view-users         | All users table — admin only                 |
| GET    | /view-students      | Students table — teacher only                |
| GET    | /logout             | Destroy session, redirect to /               |
| POST   | /admin-login        | Validate admin credentials                   |
| POST   | /teacher-login      | Validate teacher credentials                 |
| POST   | /student-login      | Validate student (email OR studentId)        |
| POST   | /create-user        | Admin creates teacher/student account        |
| POST   | /reset-password     | Update password, set firstLogin=false        |
| GET    | /api/session        | Returns current session user                 |
| GET    | /api/users          | All users without passwords (admin)          |
| GET    | /api/students       | All students without passwords (teacher)     |

---

## 🔒 Auth & Protection

- Sessions stored server-side via `express-session`
- Protected GET routes reject unauthenticated requests at server level
- Protected POST routes also check session role
- First-login flag forces password reset before dashboard access
- Student login accepts email **or** studentId (case-insensitive)

---

## 📁 Folder Structure

```
college-backend/
├── server.js          ← All routes + session auth
├── users.json         ← User data store (admin pre-seeded)
├── package.json
├── public/
│   ├── css/style.css  ← Full design system
│   └── js/script.js   ← All frontend logic
└── views/             ← 11 HTML pages
    ├── index.html
    ├── admin-login.html
    ├── teacher-login.html
    ├── student-login.html
    ├── reset-password.html
    ├── admin-dashboard.html
    ├── teacher-dashboard.html
    ├── student-dashboard.html
    ├── create-user.html
    ├── view-users.html
    └── view-students.html
```
