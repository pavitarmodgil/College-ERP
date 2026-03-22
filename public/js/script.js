// ============================================================
//  University Management System — script.js  v2.0
//  Role-based auth guards, login handlers, page logic
// ============================================================

// ── UI Helpers ────────────────────────────────────────────────
function showAlert(el, msg, type = "error") {
  el.className = `alert alert-${type === "error" ? "error" : type === "info" ? "info" : "success"} show`;
  const icon = type === "error" ? "⚠️" : type === "info" ? "ℹ️" : "✅";
  el.innerHTML = `<span>${icon}</span><span>${msg}</span>`;
}

function setLoading(btn, state) {
  btn.classList.toggle("loading", state);
  btn.disabled = state;
}

// ── Session (server-side; /api/session is the source of truth) ──
// We cache locally to avoid a round-trip on every page event.
async function getSession() {
  try {
    const res  = await fetch("/api/session");
    const data = await res.json();
    return data.loggedIn ? data.user : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
//  AUTH GUARD — called on protected pages
//  Fetches /api/session; if not logged in or wrong role → redirect
// ─────────────────────────────────────────────────────────────
async function requireAuth(expectedRole) {
  const user = await getSession();
  if (!user) {
    window.location.replace("/?reason=auth");
    return null;
  }
  if (expectedRole && user.role !== expectedRole) {
    window.location.replace("/?reason=forbidden");
    return null;
  }
  return user;
}

// Redirect logged-in users away from login pages
async function redirectIfLoggedIn() {
  const user = await getSession();
  if (user) {
    window.location.replace(`/${user.role}-dashboard`);
  }
}

// ─────────────────────────────────────────────────────────────
//  POPULATE TOPBAR with session user info
// ─────────────────────────────────────────────────────────────
function populateTopbar(user) {
  document.querySelectorAll("[data-user-name]").forEach(el  => el.textContent = user.name);
  document.querySelectorAll("[data-user-email]").forEach(el => el.textContent = user.email || "");
  document.querySelectorAll("[data-user-role]").forEach(el  => el.textContent = user.role.charAt(0).toUpperCase() + user.role.slice(1));
  document.querySelectorAll("[data-user-initial]").forEach(el => el.textContent = user.name.charAt(0).toUpperCase());
  document.querySelectorAll("[data-student-id]").forEach(el => el.textContent = user.studentId || "—");
  if (user.studentId) {
    document.querySelectorAll(".show-if-student").forEach(el => el.style.display = "");
  }
}

// ─────────────────────────────────────────────────────────────
//  LOGOUT BUTTON
// ─────────────────────────────────────────────────────────────
document.querySelectorAll("[data-logout]").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "/logout";
  });
});

// ─────────────────────────────────────────────────────────────
//  PASSWORD EYE TOGGLE
// ─────────────────────────────────────────────────────────────
document.querySelectorAll(".eye-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const target = document.getElementById(btn.dataset.target);
    if (!target) return;
    const show = target.type === "password";
    target.type = show ? "text" : "password";
    btn.textContent = show ? "🙈" : "👁️";
  });
});

// =============================================================
//  PAGE: ADMIN LOGIN  (/admin-login)
// =============================================================
const adminLoginForm = document.getElementById("adminLoginForm");
if (adminLoginForm) {
  redirectIfLoggedIn();

  adminLoginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const alert = document.getElementById("alertMsg");
    const btn   = document.getElementById("submitBtn");
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value;

    if (!email || !pass) return showAlert(alert, "Please enter email and password.");
    setLoading(btn, true);
    try {
      const res  = await fetch("/admin-login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email, password: pass }) });
      const data = await res.json();
      if (data.success) {
        showAlert(alert, "Login successful! Redirecting…", "success");
        setTimeout(() => window.location.href = "/admin-dashboard", 900);
      } else {
        showAlert(alert, data.message);
      }
    } catch { showAlert(alert, "Server error. Is the server running?"); }
    finally   { setLoading(btn, false); }
  });
}

// =============================================================
//  PAGE: TEACHER LOGIN  (/teacher-login)
// =============================================================
const teacherLoginForm = document.getElementById("teacherLoginForm");
if (teacherLoginForm) {
  redirectIfLoggedIn();

  teacherLoginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const alert = document.getElementById("alertMsg");
    const btn   = document.getElementById("submitBtn");
    const email = document.getElementById("email").value.trim();
    const pass  = document.getElementById("password").value;

    if (!email || !pass) return showAlert(alert, "Please enter email and password.");
    setLoading(btn, true);
    try {
      const res  = await fetch("/teacher-login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ email, password: pass }) });
      const data = await res.json();
      if (data.success) {
        if (data.firstLogin) {
          showAlert(alert, "First login detected. Redirecting to password reset…", "info");
          setTimeout(() => window.location.href = "/reset-password", 1200);
        } else {
          showAlert(alert, "Login successful! Redirecting…", "success");
          setTimeout(() => window.location.href = "/teacher-dashboard", 900);
        }
      } else {
        showAlert(alert, data.message);
      }
    } catch { showAlert(alert, "Server error. Is the server running?"); }
    finally   { setLoading(btn, false); }
  });
}

// =============================================================
//  PAGE: STUDENT LOGIN  (/student-login)
// =============================================================
const studentLoginForm = document.getElementById("studentLoginForm");
if (studentLoginForm) {
  redirectIfLoggedIn();

  studentLoginForm.addEventListener("submit", async e => {
    e.preventDefault();
    const alert      = document.getElementById("alertMsg");
    const btn        = document.getElementById("submitBtn");
    const identifier = document.getElementById("identifier").value.trim(); // email OR studentId
    const pass       = document.getElementById("password").value;

    if (!identifier || !pass) return showAlert(alert, "Please enter your Student ID / Email and password.");
    setLoading(btn, true);
    try {
      const res  = await fetch("/student-login", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ identifier, password: pass }) });
      const data = await res.json();
      if (data.success) {
        if (data.firstLogin) {
          showAlert(alert, "First login detected. Please reset your temporary password.", "info");
          setTimeout(() => window.location.href = "/reset-password", 1200);
        } else {
          showAlert(alert, "Login successful! Redirecting…", "success");
          setTimeout(() => window.location.href = "/student-dashboard", 900);
        }
      } else {
        showAlert(alert, data.message);
      }
    } catch { showAlert(alert, "Server error. Is the server running?"); }
    finally   { setLoading(btn, false); }
  });
}

// =============================================================
//  PAGE: RESET PASSWORD  (/reset-password)
// =============================================================
const resetForm = document.getElementById("resetForm");
if (resetForm) {
  // Check session is valid (must be logged in to reset)
  (async () => {
    const user = await getSession();
    if (!user) { window.location.replace("/?reason=auth"); return; }
    // Show who is resetting
    const nameEl = document.getElementById("resetUserName");
    if (nameEl) nameEl.textContent = user.name;
  })();

  resetForm.addEventListener("submit", async e => {
    e.preventDefault();
    const alert   = document.getElementById("alertMsg");
    const btn     = document.getElementById("submitBtn");
    const newPass = document.getElementById("newPassword").value;
    const confPass= document.getElementById("confirmPassword").value;

    if (!newPass || !confPass) return showAlert(alert, "Please fill in both password fields.");
    if (newPass !== confPass)  return showAlert(alert, "Passwords do not match.");
    if (newPass.length < 6)    return showAlert(alert, "Password must be at least 6 characters.");

    setLoading(btn, true);
    try {
      const res  = await fetch("/reset-password", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ newPassword: newPass, confirmPassword: confPass }) });
      const data = await res.json();
      if (data.success) {
        showAlert(alert, "Password updated! Redirecting to your dashboard…", "success");
        setTimeout(() => window.location.href = `/${data.role}-dashboard`, 1400);
      } else {
        showAlert(alert, data.message);
      }
    } catch { showAlert(alert, "Server error."); }
    finally   { setLoading(btn, false); }
  });
}

// =============================================================
//  PAGE: ADMIN DASHBOARD
// =============================================================
const adminDashboard = document.getElementById("adminDashboard");
if (adminDashboard) {
  (async () => {
    const user = await requireAuth("admin");
    if (!user) return;
    populateTopbar(user);
    // Greet
    const h = new Date().getHours();
    const greet = h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
    const greetEl = document.getElementById("greeting");
    if (greetEl) greetEl.textContent = greet + ",";
    // Load counts
    try {
      const res  = await fetch("/api/users");
      const data = await res.json();
      if (data.success) {
        const all      = data.users;
        const teachers = all.filter(u => u.role === "teacher").length;
        const students = all.filter(u => u.role === "student").length;
        setText("countTotal",   all.length);
        setText("countTeachers",teachers);
        setText("countStudents",students);
      }
    } catch {}
  })();
}

// =============================================================
//  PAGE: TEACHER DASHBOARD
// =============================================================
const teacherDashboard = document.getElementById("teacherDashboard");
if (teacherDashboard) {
  (async () => {
    const user = await requireAuth("teacher");
    if (!user) return;
    populateTopbar(user);
    document.querySelectorAll("[data-dept]").forEach(el => el.textContent = user.department || "N/A");
    // Student count
    try {
      const res  = await fetch("/api/students");
      const data = await res.json();
      if (data.success) {
        setText("countStudents", data.students.length);
      }
    } catch {}
  })();
}

// =============================================================
//  PAGE: STUDENT DASHBOARD
// =============================================================
const studentDashboard = document.getElementById("studentDashboard");
if (studentDashboard) {
  (async () => {
    const user = await requireAuth("student");
    if (!user) return;
    populateTopbar(user);
    document.querySelectorAll("[data-dept]").forEach(el  => el.textContent = user.department || "N/A");
    document.querySelectorAll("[data-year]").forEach(el  => el.textContent = user.year || "N/A");
  })();
}

// =============================================================
//  PAGE: CREATE USER  (/create-user)
// =============================================================
const createUserForm = document.getElementById("createUserForm");
if (createUserForm) {
  (async () => {
    const user = await requireAuth("admin");
    if (!user) return;
    populateTopbar(user);
  })();

  // Role selector — show/hide student-specific fields
  const roleRadios = document.querySelectorAll('input[name="role"]');
  const studentFields = document.querySelector(".student-fields");
  const roleOptions   = document.querySelectorAll(".role-option");

  function updateRoleUI() {
    const selected = document.querySelector('input[name="role"]:checked');
    roleOptions.forEach(opt => {
      opt.classList.remove("selected-teacher","selected-student");
      if (selected && opt.dataset.role === selected.value) {
        opt.classList.add(`selected-${selected.value}`);
      }
    });
    if (studentFields) {
      studentFields.classList.toggle("visible", selected && selected.value === "student");
    }
  }

  roleRadios.forEach(r => r.addEventListener("change", updateRoleUI));
  roleOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      const radio = opt.querySelector("input[type='radio']");
      if (radio) { radio.checked = true; updateRoleUI(); }
    });
  });

  createUserForm.addEventListener("submit", async e => {
    e.preventDefault();
    const alert  = document.getElementById("alertMsg");
    const btn    = document.getElementById("submitBtn");
    const role   = document.querySelector('input[name="role"]:checked')?.value;

    if (!role) return showAlert(alert, "Please select a role (Teacher or Student).");

    const payload = {
      name:       document.getElementById("name").value.trim(),
      email:      document.getElementById("email").value.trim(),
      password:   document.getElementById("password").value,
      role,
      department: document.getElementById("department").value.trim(),
    };
    if (role === "student") {
      payload.year = document.getElementById("year").value;
    }

    if (!payload.name || !payload.email || !payload.password) {
      return showAlert(alert, "Name, email and password are required.");
    }

    setLoading(btn, true);
    try {
      const res  = await fetch("/create-user", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        let msg = `${role.charAt(0).toUpperCase()+role.slice(1)} "${data.user.name}" created successfully!`;
        if (data.user.studentId) msg += ` Student ID: ${data.user.studentId}`;
        showAlert(alert, msg, "success");
        createUserForm.reset();
        updateRoleUI();
      } else {
        showAlert(alert, data.message);
      }
    } catch { showAlert(alert, "Server error."); }
    finally   { setLoading(btn, false); }
  });
}

// =============================================================
//  PAGE: VIEW USERS  (/view-users)  — Admin
// =============================================================
const viewUsersPage = document.getElementById("viewUsersPage");
if (viewUsersPage) {
  (async () => {
    const user = await requireAuth("admin");
    if (!user) return;
    populateTopbar(user);
    loadUsersTable();
  })();

  async function loadUsersTable() {
    const tbody    = document.getElementById("usersTableBody");
    const countEl  = document.getElementById("tableCount");
    const loading  = document.getElementById("tableLoading");
    try {
      const res  = await fetch("/api/users");
      const data = await res.json();
      if (!data.success) return;
      const users = data.users;
      if (loading) loading.style.display = "none";
      if (countEl) countEl.textContent = `${users.length} users`;
      tbody.innerHTML = users.map(u => `
        <tr>
          <td>
            <div class="cell-user">
              <div class="avatar avatar-${u.role}">${u.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight:600">${u.name}</div>
                <div class="cell-sub">${u.email}</div>
              </div>
            </div>
          </td>
          <td><span class="tag tag-${u.role}">${u.role.charAt(0).toUpperCase()+u.role.slice(1)}</span></td>
          <td>${u.studentId ? `<span class="id-tag">${u.studentId}</span>` : '<span style="color:var(--faint)">—</span>'}</td>
          <td>${u.department || '<span style="color:var(--faint)">—</span>'}</td>
          <td><span class="tag ${u.firstLogin ? 'tag-yes' : 'tag-no'}">${u.firstLogin ? '⏳ Pending' : '✅ Set'}</span></td>
        </tr>`).join("");

      // Live search
      document.getElementById("tableSearch")?.addEventListener("input", function() {
        const q = this.value.toLowerCase();
        const rows = tbody.querySelectorAll("tr");
        let shown = 0;
        rows.forEach(r => { const vis = r.textContent.toLowerCase().includes(q); r.style.display = vis ? "" : "none"; if(vis) shown++; });
        if (countEl) countEl.textContent = `${shown} users`;
      });
    } catch (e) { if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px">Failed to load users.</td></tr>`; }
  }
}

// =============================================================
//  PAGE: VIEW STUDENTS  (/view-students)  — Teacher
// =============================================================
const viewStudentsPage = document.getElementById("viewStudentsPage");
if (viewStudentsPage) {
  (async () => {
    const user = await requireAuth("teacher");
    if (!user) return;
    populateTopbar(user);
    loadStudentsTable();
  })();

  async function loadStudentsTable() {
    const tbody   = document.getElementById("studentsTableBody");
    const countEl = document.getElementById("tableCount");
    const loading = document.getElementById("tableLoading");
    try {
      const res  = await fetch("/api/students");
      const data = await res.json();
      if (!data.success) return;
      const students = data.students;
      if (loading) loading.style.display = "none";
      if (countEl) countEl.textContent = `${students.length} students`;
      tbody.innerHTML = students.map(s => `
        <tr>
          <td><span class="id-tag">${s.studentId || '—'}</span></td>
          <td>
            <div class="cell-user">
              <div class="avatar avatar-student">${s.name.charAt(0).toUpperCase()}</div>
              <div>
                <div style="font-weight:600">${s.name}</div>
                <div class="cell-sub">${s.year || ''}</div>
              </div>
            </div>
          </td>
          <td>${s.email}</td>
          <td>${s.department || '<span style="color:var(--faint)">—</span>'}</td>
          <td><span class="tag ${s.firstLogin ? 'tag-yes' : 'tag-no'}">${s.firstLogin ? '⏳ Temp' : '✅ Set'}</span></td>
        </tr>`).join("");

      // Live search
      document.getElementById("tableSearch")?.addEventListener("input", function() {
        const q = this.value.toLowerCase();
        const rows = tbody.querySelectorAll("tr");
        let shown = 0;
        rows.forEach(r => { const vis = r.textContent.toLowerCase().includes(q); r.style.display = vis ? "" : "none"; if(vis) shown++; });
        if (countEl) countEl.textContent = `${shown} students`;
      });
    } catch { if(tbody) tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:32px">Failed to load students.</td></tr>`; }
  }
}

// ── Utility ──────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
