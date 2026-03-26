const prisma = require('../lib/prisma')

const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Helper: sort entries by day then start time
function sortEntries(entries) {
  return entries.sort((a, b) => {
    const dayDiff = DAYS_ORDER.indexOf(a.dayOfWeek) - DAYS_ORDER.indexOf(b.dayOfWeek)
    if (dayDiff !== 0) return dayDiff
    return a.startTime.localeCompare(b.startTime)
  })
}

// Shared include block — same shape for all queries
const entryInclude = {
  course: {
    select: {
      id: true, name: true, code: true, type: true,
      department: { select: { name: true, code: true } },
    },
  },
  teacher: {
    select: { id: true, email: true, teacherId: true },
  },
}

// GET /api/timetable?semester=2024-ODD
// Role-scoped: Admin sees all, Teacher sees own, Student sees enrolled courses
async function getTimetable(req, res, next) {
  try {
    const { role, id: userId } = req.user
    const { semester } = req.query

    const where = semester ? { semester } : {}

    let entries = []

    if (role === 'ADMIN') {
      // Admin sees the full timetable for the semester
      entries = await prisma.timetableEntry.findMany({
        where,
        include: entryInclude,
      })

    } else if (role === 'TEACHER') {
      // Teacher only sees their own assigned slots
      entries = await prisma.timetableEntry.findMany({
        where: { ...where, teacherId: userId },
        include: entryInclude,
      })

    } else {
      // Student sees timetable for all courses they are enrolled in
      // WHY we go through Enrollment: TimetableEntry links to Course, not User directly.
      // Student → Enrollment → Course → TimetableEntry is the correct join path.
      const enrollments = await prisma.enrollment.findMany({
        where: { userId },
        select: { courseId: true },
      })
      const enrolledCourseIds = enrollments.map((e) => e.courseId)

      entries = await prisma.timetableEntry.findMany({
        where: {
          ...where,
          courseId: { in: enrolledCourseIds },
        },
        include: entryInclude,
      })
    }

    // Sort by day then time for clean display
    const sorted = sortEntries(entries)

    // Group by day for easy frontend consumption
    const grouped = DAYS_ORDER.reduce((acc, day) => {
      acc[day] = sorted.filter((e) => e.dayOfWeek === day)
      return acc
    }, {})

    res.json({
      semester: semester || 'all',
      total: entries.length,
      entries: sorted,
      grouped,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/timetable/semesters — Admin only
// Returns list of distinct semesters that exist — for the dropdown
async function getSemesters(req, res, next) {
  try {
    const result = await prisma.timetableEntry.findMany({
      distinct: ['semester'],
      select: { semester: true },
      orderBy: { semester: 'desc' },
    })
    res.json(result.map((r) => r.semester))
  } catch (err) {
    next(err)
  }
}

// POST /api/timetable — Admin only
async function createEntry(req, res, next) {
  try {
    const { courseId, teacherId, dayOfWeek, startTime, endTime, room, semester } = req.body

    if (!courseId || !teacherId || !dayOfWeek || !startTime || !endTime || !room || !semester) {
      return res.status(400).json({
        error: 'courseId, teacherId, dayOfWeek, startTime, endTime, room and semester are required',
      })
    }

    const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    if (!VALID_DAYS.includes(dayOfWeek)) {
      return res.status(400).json({ error: 'Invalid dayOfWeek' })
    }

    // Verify teacher exists and has TEACHER role
    const teacher = await prisma.user.findUnique({
      where: { id: parseInt(teacherId) },
      select: { role: true },
    })
    if (!teacher || teacher.role !== 'TEACHER') {
      return res.status(400).json({ error: 'Invalid teacher' })
    }

    // Verify course exists
    const course = await prisma.course.findUnique({
      where: { id: parseInt(courseId) },
      select: { id: true },
    })
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }

    const entry = await prisma.timetableEntry.create({
      data: {
        courseId: parseInt(courseId),
        teacherId: parseInt(teacherId),
        dayOfWeek,
        startTime,
        endTime,
        room: room.trim(),
        semester: semester.trim(),
      },
      include: entryInclude,
    })

    res.status(201).json(entry)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/timetable/:id — Admin only
async function updateEntry(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    const { courseId, teacherId, dayOfWeek, startTime, endTime, room, semester } = req.body

    const VALID_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
    if (dayOfWeek && !VALID_DAYS.includes(dayOfWeek)) {
      return res.status(400).json({ error: 'Invalid dayOfWeek' })
    }

    const data = {}
    if (courseId !== undefined) data.courseId = parseInt(courseId)
    if (teacherId !== undefined) data.teacherId = parseInt(teacherId)
    if (dayOfWeek !== undefined) data.dayOfWeek = dayOfWeek
    if (startTime !== undefined) data.startTime = startTime
    if (endTime !== undefined) data.endTime = endTime
    if (room !== undefined) data.room = room.trim()
    if (semester !== undefined) data.semester = semester.trim()

    const entry = await prisma.timetableEntry.update({
      where: { id },
      data,
      include: entryInclude,
    })

    res.json(entry)
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Timetable entry not found' })
    }
    next(err)
  }
}

// DELETE /api/timetable/:id — Admin only
async function deleteEntry(req, res, next) {
  try {
    const id = parseInt(req.params.id)
    await prisma.timetableEntry.delete({ where: { id } })
    res.json({ message: 'Entry deleted' })
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Timetable entry not found' })
    }
    next(err)
  }
}

module.exports = {
  getTimetable,
  getSemesters,
  createEntry,
  updateEntry,
  deleteEntry,
}
