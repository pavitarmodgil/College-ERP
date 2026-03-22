// ============================================================
//  University Management System — server.js
//  Node.js + Express + JSON file storage
//  Roles: Admin | Teacher | Student
// ============================================================

require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt  = require("bcrypt");
const fs      = require("fs");
const path    = require("path");

const app  = express();
const PORT = process.env.PORT || 3000;
const USERS_FILE = path.join(__dirname, "users.json");

// ── Middleware ───────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session middleware — stores role + userId server-side
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 } // 1 hour
}));

// ── File Helpers ─────────────────────────────────────────────
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, "utf-8"));
  } catch (e) {
    console.error("Failed to read users.json:", e.message);
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");
}

// Generate next student ID: finds highest STU number and increments
function generateStudentId(users) {
  const students = users.filter(u => u.role === "student" && u.studentId);
  if (students.length === 0) return "STU001";
  const nums = students.map(s => parseInt(s.studentId.replace("STU", ""), 10));
  const next = Math.max(...nums) + 1;
  return "STU" + String(next).padStart(3, "0");
}

// Generate a short unique user ID
function generateId(users) {
  return "u" + String(users.length + 1).padStart(3, "0") + Date.now().toString().slice(-3);
}

// ── Auth Guards (middleware) ─────────────────────────────────
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect("/?reason=auth");
    }
    if (!roles.includes(req.session.user.role)) {
      return res.redirect("/?reason=forbidden");
    }
    next();
  };
}

// ─────────────────────────────────────────────────────────────
//  GET — HTML PAGE ROUTES
// ─────────────────────────────────────────────────────────────

// Public pages
app.get("/",               (req, res) => res.sendFile(view("index.html")));
app.get("/admin-login",    (req, res) => res.sendFile(view("admin-login.html")));
app.get("/teacher-login",  (req, res) => res.sendFile(view("teacher-login.html")));
app.get("/student-login",  (req, res) => res.sendFile(view("student-login.html")));
app.get("/reset-password", (req, res) => res.sendFile(view("reset-password.html")));

// Protected pages — server enforces role before serving HTML
app.get("/admin-dashboard",  requireRole("admin"),   (req, res) => res.sendFile(view("admin-dashboard.html")));
app.get("/teacher-dashboard",requireRole("teacher"), (req, res) => res.sendFile(view("teacher-dashboard.html")));
app.get("/student-dashboard",requireRole("student"), (req, res) => res.sendFile(view("student-dashboard.html")));
app.get("/create-user",      requireRole("admin"),   (req, res) => res.sendFile(view("create-user.html")));
app.get("/view-users",       requireRole("admin"),   (req, res) => res.sendFile(view("view-users.html")));
app.get("/view-students",    requireRole("teacher"), (req, res) => res.sendFile(view("view-students.html")));

// Logout — destroy session and redirect home
app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

// Helper to resolve view path
function view(filename) {
  return path.join(__dirname, "views", filename);
}

// ─────────────────────────────────────────────────────────────
//  API — /api/session  (frontend reads logged-in user info)
// ─────────────────────────────────────────────────────────────
app.get("/api/session", (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ loggedIn: false });
  }
  res.json({ loggedIn: true, user: req.session.user });
});

// ─────────────────────────────────────────────────────────────
//  POST /admin-login
// ─────────────────────────────────────────────────────────────
app.post("/admin-login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const users = readUsers();
  const user  = users.find(u => u.email === email && u.role === "admin");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "You are not registered in the system. Please contact administration."
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: "Incorrect password." });
  }

  // Store safe user object in session (no password)
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  console.log(`[LOGIN] Admin logged in: ${user.email}`);
  res.json({ success: true, role: "admin", firstLogin: user.firstLogin || false });
});

// ─────────────────────────────────────────────────────────────
//  POST /teacher-login
// ─────────────────────────────────────────────────────────────
app.post("/teacher-login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: "Email and password are required." });
  }

  const users = readUsers();
  const user  = users.find(u => u.email === email && u.role === "teacher");

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "You are not registered in the system. Please contact administration."
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: "Incorrect password." });
  }

  req.session.user = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, department: user.department || ""
  };
  console.log(`[LOGIN] Teacher logged in: ${user.email}`);
  res.json({ success: true, role: "teacher", firstLogin: user.firstLogin || false });
});

// ─────────────────────────────────────────────────────────────
//  POST /student-login  (email OR studentId)
// ─────────────────────────────────────────────────────────────
app.post("/student-login", async (req, res) => {
  const { identifier, password } = req.body; // identifier = email or studentId
  if (!identifier || !password) {
    return res.status(400).json({ success: false, message: "Student ID / Email and password are required." });
  }

  const users = readUsers();
  // Match by email OR studentId, role must be "student"
  const user = users.find(u =>
    u.role === "student" &&
    (u.email === identifier || u.studentId === identifier.toUpperCase())
  );

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "You are not registered in the system. Please contact administration."
    });
  }

  const passwordMatch = await bcrypt.compare(password, user.password);
  if (!passwordMatch) {
    return res.status(401).json({ success: false, message: "Incorrect password." });
  }

  req.session.user = {
    id: user.id, name: user.name, email: user.email,
    role: user.role, studentId: user.studentId,
    department: user.department || "", year: user.year || ""
  };
  console.log(`[LOGIN] Student logged in: ${user.studentId} (${user.email})`);
  res.json({ success: true, role: "student", firstLogin: user.firstLogin || false });
});

// ─────────────────────────────────────────────────────────────
//  POST /reset-password
// ─────────────────────────────────────────────────────────────
app.post("/reset-password", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, message: "Not authenticated." });
  }

  const { newPassword, confirmPassword } = req.body;
  if (!newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: "Both password fields are required." });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: "Passwords do not match." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  const userId = req.session.user.id;
  const users  = readUsers();
  const idx    = users.findIndex(u => u.id === userId);

  if (idx === -1) {
    return res.status(404).json({ success: false, message: "User not found." });
  }

  // Hash the new password before storing (saltRounds=12 per project convention)
  users[idx].password   = await bcrypt.hash(newPassword, 12);
  users[idx].firstLogin = false;
  writeUsers(users);

  console.log(`[RESET] Password reset for: ${users[idx].email}`);
  res.json({ success: true, role: req.session.user.role });
});

// ─────────────────────────────────────────────────────────────
//  POST /create-user  (admin only — server enforces)
// ─────────────────────────────────────────────────────────────
app.post("/create-user", async (req, res) => {
  // Server-side role check
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }

  const { name, email, password, role, department, year } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ success: false, message: "Name, email, password and role are required." });
  }
  if (!["teacher", "student"].includes(role)) {
    return res.status(400).json({ success: false, message: "Role must be teacher or student." });
  }

  const users = readUsers();

  // Check duplicate email
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ success: false, message: "A user with this email already exists." });
  }

  // Hash password before storing (saltRounds=12 per project convention)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Build new user object
  const newUser = {
    id:         generateId(users),
    name:       name.trim(),
    email:      email.trim().toLowerCase(),
    password:   hashedPassword,
    role,
    department: department || "",
    firstLogin: true
  };

  // Extra fields per role
  if (role === "student") {
    newUser.studentId = generateStudentId(users);
    newUser.year      = year || "1st Year";
  }

  users.push(newUser);
  writeUsers(users);

  console.log(`[CREATE] New ${role} created: ${newUser.email}` +
    (newUser.studentId ? ` (${newUser.studentId})` : ""));

  // Return sanitized user (no password)
  const { password: _p, ...safeUser } = newUser;
  res.status(201).json({ success: true, user: safeUser });
});

// ─────────────────────────────────────────────────────────────
//  GET /api/users  (admin — returns all users without passwords)
// ─────────────────────────────────────────────────────────────
app.get("/api/users", (req, res) => {
  if (!req.session.user || req.session.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Access denied." });
  }
  const users = readUsers().map(({ password: _p, ...u }) => u);
  res.json({ success: true, users });
});

// ─────────────────────────────────────────────────────────────
//  GET /api/students  (teacher — returns only students)
// ─────────────────────────────────────────────────────────────
app.get("/api/students", (req, res) => {
  if (!req.session.user || !["admin","teacher"].includes(req.session.user.role)) {
    return res.status(403).json({ success: false, message: "Access denied." });
  }
  const students = readUsers()
    .filter(u => u.role === "student")
    .map(({ password: _p, ...u }) => u);
  res.json({ success: true, students });
});

// ─────────────────────────────────────────────────────────────
//  Start Server
// ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✅  Server running at http://localhost:${PORT}`);
});
