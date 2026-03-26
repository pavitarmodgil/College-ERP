const bcrypt = require('bcrypt')
const prisma = require('../lib/prisma')
const { sendOTPEmail } = require('../lib/mailer')

// Helper: build a human-readable display name from user record
// WHY a helper: display name logic is used in multiple places —
// list, profile, welcome message. One function = one place to change.
function getDisplayName(user) {
  if (!user.firstName) {
    return user.email.split('@')[0].split(/[._-]/)[0]
      .replace(/\b\w/g, (c) => c.toUpperCase())
  }
  const name = `${user.firstName}${user.lastName ? ' ' + user.lastName : ''}`
  if (!user.title) return name
  return `${user.title}. ${name}`
}

// Helper: generate next student or teacher ID
async function generateUserId(role) {
  if (role === 'STUDENT') {
    const last = await prisma.user.findFirst({
      where: { studentId: { not: null } },
      orderBy: { studentId: 'desc' },
      select: { studentId: true },
    })
    const num = last ? parseInt(last.studentId.replace('STU', ''), 10) + 1 : 1
    return `STU${String(num).padStart(3, '0')}`
  }
  if (role === 'TEACHER') {
    const last = await prisma.user.findFirst({
      where: { teacherId: { not: null } },
      orderBy: { teacherId: 'desc' },
      select: { teacherId: true },
    })
    const num = last ? parseInt(last.teacherId.replace('TCH', ''), 10) + 1 : 1
    return `TCH${String(num).padStart(3, '0')}`
  }
  return null
}

// GET /api/users
// Query params: role, isActive, page, limit
async function getUsers(req, res, next) {
  try {
    const { role, isActive, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const where = {}
    if (role) where.role = role
    if (isActive !== undefined) where.isActive = isActive === 'true'

    // WHY Promise.all: runs both DB queries in parallel instead of
    // sequentially. Total time = max(query1, query2) not sum of both.
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          title: true,
          role: true,
          studentId: true,
          teacherId: true,
          isActive: true,
          mustResetPassword: true,
          departmentId: true,
          department: { select: { name: true, code: true } },
          createdAt: true,
        },
      }),
      prisma.user.count({ where }),
    ])

    res.json({
      data: users,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/:id
async function getUserById(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: parseInt(req.params.id) },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        title: true,
        role: true,
        studentId: true,
        teacherId: true,
        isActive: true,
        mustResetPassword: true,
        department: { select: { id: true, name: true, code: true } },
        createdAt: true,
        updatedAt: true,
      },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })
    res.json(user)
  } catch (err) {
    next(err)
  }
}

// POST /api/users
async function createUser(req, res, next) {
  try {
    const { email, password, role, departmentId, firstName, lastName, title } = req.body

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password and role are required' })
    }
    if (!['ADMIN', 'TEACHER', 'STUDENT'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' })
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    // Check email uniqueness before hashing (saves bcrypt work on duplicate)
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already in use' })

    const [hashedPassword, autoId] = await Promise.all([
      bcrypt.hash(password, 12),
      generateUserId(role),
    ])

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role,
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        title: title?.trim() || null,
        studentId: role === 'STUDENT' ? autoId : null,
        teacherId: role === 'TEACHER' ? autoId : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        mustResetPassword: true,
      },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, title: true,
        studentId: true, teacherId: true,
        department: { select: { name: true, code: true } },
        createdAt: true,
      },
    })

    res.status(201).json(user)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/users/:id
async function updateUser(req, res, next) {
  try {
    const { email, departmentId, password, firstName, lastName, title } = req.body
    const userId = parseInt(req.params.id)

    // Prevent editing own account via this endpoint
    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Use profile settings to edit your own account' })
    }

    if (password !== undefined && password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' })
    }

    const updateData = {}
    if (email) updateData.email = email
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    if (title !== undefined) updateData.title = title?.trim() || null
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? parseInt(departmentId) : null
    }
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, title: true,
        studentId: true, teacherId: true,
        department: { select: { name: true, code: true } },
      },
    })

    res.json(user)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' })
    }
    next(err)
  }
}

// PATCH /api/users/:id/deactivate
async function deactivateUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id)

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      select: { id: true, email: true, isActive: true },
    })

    res.json({ message: 'User deactivated', user })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' })
    }
    next(err)
  }
}

// PATCH /api/users/:id/reactivate — Admin only
// WHY separate endpoint from deactivate: explicit intent is clearer
// than a toggle. /reactivate reads unambiguously in logs and audits.
async function reactivateUser(req, res, next) {
  try {
    const userId = parseInt(req.params.id)

    if (req.user.id === userId) {
      return res.status(400).json({ error: 'Cannot modify your own account status' })
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
      select: { id: true, email: true, isActive: true },
    })

    res.json({ message: 'User reactivated', user })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'User not found' })
    }
    next(err)
  }
}

// POST /api/users/:id/reset-password
// Admin-triggered: sets mustResetPassword + emails a temp password
async function adminResetPassword(req, res, next) {
  try {
    const userId = parseInt(req.params.id)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!user) return res.status(404).json({ error: 'User not found' })

    const tempPassword = Math.random().toString(36).slice(-10) + 'A1!'
    const hashed = await bcrypt.hash(tempPassword, 12)

    await prisma.user.update({
      where: { id: userId },
      data: { password: hashed, mustResetPassword: true },
    })

    await sendOTPEmail(
      user.email,
      `Your temporary password is: ${tempPassword}\n\nYou will be asked to set a new password on next login.`
    )

    res.json({ message: 'Password reset. Temporary password sent to user email.' })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/:id/profile — Admin only
// Returns full student record: info + courses + attendance + grades
async function getStudentProfile(req, res, next) {
  try {
    const userId = parseInt(req.params.id)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, role: true,
        firstName: true, lastName: true, title: true,
        studentId: true, teacherId: true,
        isActive: true, mustResetPassword: true,
        createdAt: true,
        department: { select: { id: true, name: true, code: true } },
        enrollments: {
          include: {
            course: {
              select: {
                id: true, name: true, code: true,
                type: true, credits: true,
                department: { select: { name: true, code: true } },
              },
            },
            grades: {
              select: { component: true, marks: true, letterGrade: true },
            },
            attendance: {
              select: { present: true, date: true },
            },
          },
        },
      },
    })

    if (!user) return res.status(404).json({ error: 'User not found' })

    // Compute per-course stats
    const courses = user.enrollments.map((enrollment) => {
      const totalSessions = enrollment.attendance.length
      const attendedSessions = enrollment.attendance.filter((a) => a.present).length
      const attendancePercentage = totalSessions > 0
        ? Math.round((attendedSessions / totalSessions) * 100)
        : 0

      const gradeMap = {}
      enrollment.grades.forEach((g) => {
        gradeMap[g.component] = { marks: g.marks, letterGrade: g.letterGrade }
      })

      const finalGrade = gradeMap['FINAL']
      const passStatus = !finalGrade ? 'PENDING' : finalGrade.letterGrade === 'F' ? 'FAIL' : 'PASS'

      return {
        courseId: enrollment.course.id,
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code,
        courseType: enrollment.course.type,
        credits: enrollment.course.credits,
        department: enrollment.course.department,
        attendance: { totalSessions, attendedSessions, percentage: attendancePercentage },
        grades: {
          INTERNAL: gradeMap['INTERNAL'] || null,
          MID_TERM: gradeMap['MID_TERM'] || null,
          FINAL: gradeMap['FINAL'] || null,
        },
        passStatus,
      }
    })

    // Overall stats
    const totalCredits = courses.reduce((s, c) => s + c.credits, 0)
    const passedCourses = courses.filter((c) => c.passStatus === 'PASS').length
    const overallAttendance = courses.length > 0
      ? Math.round(courses.reduce((s, c) => s + c.attendance.percentage, 0) / courses.length)
      : 0

    res.json({
      ...user,
      displayName: getDisplayName(user),
      enrollments: undefined,
      courses,
      stats: {
        totalCourses: courses.length,
        passedCourses,
        totalCredits,
        overallAttendance,
      },
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/departments
async function getDepartments(req, res, next) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true, name: true, code: true, createdAt: true,
        _count: { select: { users: true, courses: true } },
      },
    })
    res.json(departments)
  } catch (err) {
    next(err)
  }
}

// POST /api/users/departments
async function createDepartment(req, res, next) {
  try {
    const { name, code } = req.body
    if (!name || !code) {
      return res.status(400).json({ error: 'name and code are required' })
    }
    const dept = await prisma.department.create({
      data: { name: name.trim(), code: code.trim().toUpperCase() },
    })
    res.status(201).json(dept)
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Department code already exists' })
    }
    next(err)
  }
}

// PATCH /api/users/departments/:id
async function updateDepartment(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { name, code } = req.body
    const data = {}
    if (name) data.name = name.trim()
    if (code) data.code = code.trim().toUpperCase()
    const dept = await prisma.department.update({ where: { id }, data })
    res.json(dept)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' })
    if (err.code === 'P2002') return res.status(409).json({ error: 'Code already in use' })
    next(err)
  }
}

// DELETE /api/users/departments/:id
// WHY block if users/courses exist: deleting a dept that has students
// attached would leave those students with a null deptId silently.
// Better to force the admin to reassign first.
async function deleteDepartment(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const userCount = await prisma.user.count({ where: { departmentId: id } })
    const courseCount = await prisma.course.count({ where: { departmentId: id } })

    if (userCount > 0 || courseCount > 0) {
      return res.status(409).json({
        error: `Cannot delete: ${userCount} user(s) and ${courseCount} course(s) are assigned to this department.`,
      })
    }

    await prisma.department.delete({ where: { id } })
    res.json({ message: 'Department deleted' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Department not found' })
    next(err)
  }
}

module.exports = {
  getUsers, getUserById, createUser,
  updateUser, deactivateUser, reactivateUser,
  adminResetPassword, getDepartments,
  createDepartment, updateDepartment, deleteDepartment,
  getStudentProfile,
}
