const bcrypt = require('bcryptjs')
const prisma = require('../lib/prisma')
const { sendOTPEmail } = require('../lib/mailer')

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
    const { email, password, role, departmentId, firstName, lastName } = req.body

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
        firstName: firstName?.trim() || null,
        lastName: lastName?.trim() || null,
        password: hashedPassword,
        role,
        studentId: role === 'STUDENT' ? autoId : null,
        teacherId: role === 'TEACHER' ? autoId : null,
        departmentId: departmentId ? parseInt(departmentId) : null,
        mustResetPassword: true,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        studentId: true,
        teacherId: true,
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
    const { email, departmentId, password, firstName, lastName } = req.body
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
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId ? parseInt(departmentId) : null
    }
    if (firstName !== undefined) updateData.firstName = firstName?.trim() || null
    if (lastName !== undefined) updateData.lastName = lastName?.trim() || null
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true, email: true, role: true,
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

// GET /api/users/departments
// Returns all departments for dropdown in create/edit form
async function getDepartments(req, res, next) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    })
    res.json(departments)
  } catch (err) {
    next(err)
  }
}

// GET /api/users/recent-activity
// Returns the 8 most recent enrollments for the admin dashboard activity table
async function getRecentActivity(req, res, next) {
  try {
    const enrollments = await prisma.enrollment.findMany({
      take: 8,
      orderBy: { enrolledAt: 'desc' },
      select: {
        id: true,
        enrolledAt: true,
        user: {
          select: {
            firstName: true, lastName: true, email: true,
            department: { select: { name: true } },
          },
        },
        course: { select: { name: true, code: true } },
        grades: { select: { component: true } },
      },
    })

    const activity = enrollments.map((e) => {
      const components = e.grades.map((g) => g.component)
      let status = 'Pending'
      if (components.includes('FINAL')) status = 'Completed'
      else if (components.length > 0) status = 'Processing'

      const name = e.user.firstName
        ? `${e.user.firstName} ${e.user.lastName || ''}`.trim()
        : e.user.email.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

      const words = name.trim().split(' ')
      const initials = words.length >= 2
        ? words[0][0].toUpperCase() + words[words.length - 1][0].toUpperCase()
        : name.slice(0, 2).toUpperCase()

      return {
        initials,
        name,
        dept: e.user.department?.name || '—',
        course: e.course.code,
        status,
        date: new Date(e.enrolledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      }
    })

    res.json(activity)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getUsers, getUserById, createUser,
  updateUser, deactivateUser, adminResetPassword,
  getDepartments, getRecentActivity,
}
