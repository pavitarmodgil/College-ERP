const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

// GET /api/courses — role-scoped list
async function listCourses(req, res, next) {
  try {
    const { role, id: userId } = req.user
    const { department, type, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    let where = {}

    if (role === 'ADMIN') {
      // Admin sees all courses
      if (department) where.departmentId = parseInt(department)
      if (type) where.type = type
    } else if (role === 'TEACHER') {
      // Teacher sees courses they are assigned to
      where.teachers = { some: { userId } }
      if (department) where.departmentId = parseInt(department)
    } else {
      // Student sees all active courses (for browsing/enrolling)
      where.isActive = true
      if (department) where.departmentId = parseInt(department)
      if (type) where.type = type
    }

    const [courses, total] = await Promise.all([
      prisma.course.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: {
          department: { select: { name: true, code: true } },
          teachers: { include: { teacher: { select: { email: true, teacherId: true } } } },
          _count: { select: { enrollments: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.course.count({ where }),
    ])

    res.json({ courses, total, page: parseInt(page), limit: parseInt(limit) })
  } catch (err) {
    next(err)
  }
}

// GET /api/courses/available — courses student is NOT enrolled in
async function getAvailableCourses(req, res, next) {
  try {
    const { id: userId } = req.user

    const enrolled = await prisma.enrollment.findMany({
      where: { userId },
      select: { courseId: true },
    })
    const enrolledIds = enrolled.map((e) => e.courseId)

    const courses = await prisma.course.findMany({
      where: {
        isActive: true,
        id: { notIn: enrolledIds },
      },
      include: {
        department: { select: { name: true, code: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    })

    res.json({ courses })
  } catch (err) {
    next(err)
  }
}

// GET /api/courses/:id
async function getCourseById(req, res, next) {
  try {
    const id = parseInt(req.params.id)

    const course = await prisma.course.findUnique({
      where: { id },
      include: {
        department: { select: { name: true, code: true } },
        teachers: {
          include: {
            teacher: { select: { id: true, email: true, teacherId: true } },
          },
        },
        enrollments: {
          include: {
            user: { select: { id: true, email: true, studentId: true } },
          },
        },
        _count: { select: { enrollments: true } },
      },
    })

    if (!course) return res.status(404).json({ error: 'Course not found' })
    res.json(course)
  } catch (err) {
    next(err)
  }
}

// POST /api/courses — Admin only
async function createCourse(req, res, next) {
  try {
    const { name, code, type, credits, departmentId } = req.body

    const course = await prisma.course.create({
      data: {
        name,
        code: code.toUpperCase(),
        type,
        credits: parseInt(credits) || 3,
        departmentId: parseInt(departmentId),
      },
      include: { department: { select: { name: true, code: true } } },
    })

    res.status(201).json(course)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Course code already exists' })
    next(err)
  }
}

// PATCH /api/courses/:id — Admin only
async function updateCourse(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { name, code, type, credits, departmentId } = req.body

    const data = {}
    if (name !== undefined) data.name = name
    if (code !== undefined) data.code = code.toUpperCase()
    if (type !== undefined) data.type = type
    if (credits !== undefined) data.credits = parseInt(credits)
    if (departmentId !== undefined) data.departmentId = parseInt(departmentId)

    const course = await prisma.course.update({
      where: { id },
      data,
      include: { department: { select: { name: true, code: true } } },
    })

    res.json(course)
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Course code already exists' })
    if (err.code === 'P2025') return res.status(404).json({ error: 'Course not found' })
    next(err)
  }
}

// PATCH /api/courses/:id/deactivate — Admin only
async function deactivateCourse(req, res, next) {
  try {
    const id = parseInt(req.params.id)

    const enrollmentCount = await prisma.enrollment.count({ where: { courseId: id } })
    if (enrollmentCount > 0) {
      return res.status(409).json({
        error: `Cannot deactivate: ${enrollmentCount} student(s) are enrolled in this course.`,
      })
    }

    const course = await prisma.course.update({
      where: { id },
      data: { isActive: false },
    })

    res.json(course)
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Course not found' })
    next(err)
  }
}

// POST /api/courses/:id/teachers — assign teacher (Admin)
async function assignTeacher(req, res, next) {
  try {
    const courseId = parseInt(req.params.id)
    const { userId } = req.body

    // Verify user is a TEACHER
    const teacher = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({ error: 'User is not a teacher' })
    }

    await prisma.courseTeacher.create({
      data: { courseId, userId: parseInt(userId) },
    })

    res.status(201).json({ message: 'Teacher assigned' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Teacher already assigned' })
    next(err)
  }
}

// DELETE /api/courses/:id/teachers/:userId — remove teacher (Admin)
async function removeTeacher(req, res, next) {
  try {
    const courseId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)

    await prisma.courseTeacher.delete({
      where: { courseId_userId: { courseId, userId } },
    })

    res.json({ message: 'Teacher removed' })
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Assignment not found' })
    next(err)
  }
}

// POST /api/courses/:id/enroll — Student self-enroll
async function enrollSelf(req, res, next) {
  try {
    const courseId = parseInt(req.params.id)
    const userId = req.user.id

    const course = await prisma.course.findUnique({ where: { id: courseId } })
    if (!course || !course.isActive) {
      return res.status(404).json({ error: 'Course not found or inactive' })
    }

    await prisma.enrollment.create({ data: { userId, courseId } })
    res.status(201).json({ message: 'Enrolled successfully' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Already enrolled' })
    next(err)
  }
}

// POST /api/courses/:id/enrollments — Admin enrolls a student
async function adminEnrollStudent(req, res, next) {
  try {
    const courseId = parseInt(req.params.id)
    const { userId } = req.body

    const user = await prisma.user.findUnique({ where: { id: parseInt(userId) } })
    if (!user || user.role !== 'STUDENT') {
      return res.status(400).json({ error: 'User is not a student' })
    }

    await prisma.enrollment.create({ data: { userId: parseInt(userId), courseId } })
    res.status(201).json({ message: 'Student enrolled' })
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Student already enrolled' })
    next(err)
  }
}

// DELETE /api/courses/:id/enrollments/:userId — Admin removes student
async function adminRemoveStudent(req, res, next) {
  try {
    const courseId = parseInt(req.params.id)
    const userId = parseInt(req.params.userId)

    const enrollment = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    })
    if (!enrollment) return res.status(404).json({ error: 'Enrollment not found' })

    await prisma.enrollment.delete({ where: { id: enrollment.id } })
    res.json({ message: 'Student removed' })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listCourses,
  getAvailableCourses,
  getCourseById,
  createCourse,
  updateCourse,
  deactivateCourse,
  assignTeacher,
  removeTeacher,
  enrollSelf,
  adminEnrollStudent,
  adminRemoveStudent,
}
