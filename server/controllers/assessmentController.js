const prisma = require('../lib/prisma')

const VALID_TYPES = ['QUIZ', 'ASSIGNMENT', 'EXAM', 'PROJECT']

const assessmentInclude = {
  course: { select: { id: true, name: true, code: true } },
}

// Course ids the caller is scoped to. Admin -> null (no scope, sees all).
async function scopedCourseIds(user) {
  if (user.role === 'ADMIN') return null
  if (user.role === 'TEACHER') {
    const rows = await prisma.courseTeacher.findMany({
      where: { userId: user.id },
      select: { courseId: true },
    })
    return rows.map((r) => r.courseId)
  }
  // STUDENT
  const rows = await prisma.enrollment.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  })
  return rows.map((r) => r.courseId)
}

// Does this teacher teach the given course?
async function teacherOwnsCourse(userId, courseId) {
  const link = await prisma.courseTeacher.findFirst({
    where: { userId, courseId: parseInt(courseId) },
    select: { id: true },
  })
  return Boolean(link)
}

// GET /api/assessments?courseId=&upcoming=1 — role-scoped, sorted by due date
async function listAssessments(req, res, next) {
  try {
    const { courseId, upcoming } = req.query
    const where = {}

    const ids = await scopedCourseIds(req.user)
    if (ids !== null) {
      // Non-admins only see assessments for their own courses
      where.courseId = { in: ids }
    }

    if (courseId) {
      // Intersect an explicit filter with the role scope
      if (ids !== null && !ids.includes(parseInt(courseId))) {
        return res.json({ assessments: [], total: 0 })
      }
      where.courseId = parseInt(courseId)
    }

    if (upcoming === '1' || upcoming === 'true') {
      const startOfToday = new Date()
      startOfToday.setHours(0, 0, 0, 0)
      where.dueDate = { gte: startOfToday }
    }

    const assessments = await prisma.assessment.findMany({
      where,
      include: assessmentInclude,
      orderBy: { dueDate: 'asc' },
    })

    res.json({ assessments, total: assessments.length })
  } catch (err) {
    next(err)
  }
}

// POST /api/assessments — TEACHER (own course) or ADMIN
async function createAssessment(req, res, next) {
  try {
    const { title, courseId, dueDate, type, semester } = req.body

    if (!title || !courseId || !dueDate || !type || !semester) {
      return res.status(400).json({
        error: 'title, courseId, dueDate, type and semester are required',
      })
    }
    if (!VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' })
    }
    const due = new Date(dueDate)
    if (isNaN(due.getTime())) {
      return res.status(400).json({ error: 'Invalid dueDate' })
    }

    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      select: { id: true },
    })
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    if (req.user.role === 'TEACHER' && !(await teacherOwnsCourse(req.user.id, courseId))) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    const assessment = await prisma.assessment.create({
      data: {
        title: title.trim(),
        courseId: parseInt(courseId),
        dueDate: due,
        type,
        semester: semester.trim(),
        createdById: req.user.id,
      },
      include: assessmentInclude,
    })

    res.status(201).json(assessment)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/assessments/:id — TEACHER (own course) or ADMIN
async function updateAssessment(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { title, dueDate, type, semester, courseId } = req.body

    const existing = await prisma.assessment.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    if (req.user.role === 'TEACHER' && !(await teacherOwnsCourse(req.user.id, existing.courseId))) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    if (type !== undefined && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ error: 'Invalid assessment type' })
    }

    const data = {}
    if (title !== undefined) data.title = title.trim()
    if (semester !== undefined) data.semester = semester.trim()
    if (type !== undefined) data.type = type
    if (dueDate !== undefined) {
      const due = new Date(dueDate)
      if (isNaN(due.getTime())) {
        return res.status(400).json({ error: 'Invalid dueDate' })
      }
      data.dueDate = due
    }
    if (courseId !== undefined) {
      // Teachers may only move an assessment to another course they teach
      if (req.user.role === 'TEACHER' && !(await teacherOwnsCourse(req.user.id, courseId))) {
        return res.status(403).json({ error: 'You are not assigned to that course' })
      }
      data.courseId = parseInt(courseId)
    }

    const assessment = await prisma.assessment.update({
      where: { id },
      data,
      include: assessmentInclude,
    })

    res.json(assessment)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    next(err)
  }
}

// DELETE /api/assessments/:id — TEACHER (own course) or ADMIN
async function deleteAssessment(req, res, next) {
  try {
    const id = parseInt(req.params.id)

    const existing = await prisma.assessment.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    if (req.user.role === 'TEACHER' && !(await teacherOwnsCourse(req.user.id, existing.courseId))) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    await prisma.assessment.delete({ where: { id } })
    res.json({ message: 'Assessment deleted' })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Assessment not found' })
    }
    next(err)
  }
}

module.exports = {
  listAssessments,
  createAssessment,
  updateAssessment,
  deleteAssessment,
}
