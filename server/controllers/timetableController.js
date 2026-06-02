const prisma = require('../lib/prisma')
const { buildStudentInsights, timesOverlap } = require('../lib/timetableInsights')

const DAYS_ORDER = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Detect a scheduling conflict for a prospective entry. Returns a descriptive
// error string (for a 409 response) or null if the slot is free. A conflict is
// an *overlap* on the same day + semester for the same teacher, the same room,
// or the same course. Touching edges (10-11 vs 11-12) are fine.
async function findConflict({ teacherId, room, dayOfWeek, startTime, endTime, semester, courseId, excludeId }) {
  const candidates = await prisma.timetableEntry.findMany({
    where: {
      semester,
      dayOfWeek,
      ...(excludeId ? { id: { not: excludeId } } : {}),
      OR: [
        { teacherId: parseInt(teacherId) },
        { room: room.trim() },
        { courseId: parseInt(courseId) },
      ],
    },
    select: { teacherId: true, room: true, courseId: true, startTime: true, endTime: true },
  })

  for (const c of candidates) {
    if (!timesOverlap(startTime, endTime, c.startTime, c.endTime)) continue
    if (c.teacherId === parseInt(teacherId)) {
      return 'Teacher already has a class scheduled at this time'
    }
    if (c.room === room.trim()) {
      return `Room "${room.trim()}" is already occupied at this time`
    }
    if (c.courseId === parseInt(courseId)) {
      return 'This course already has a class scheduled at this time'
    }
  }
  return null
}

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

    // Conflict detection — no double-booked teacher, room, or course
    const conflict = await findConflict({
      teacherId, room, dayOfWeek, startTime, endTime, semester: semester.trim(), courseId,
    })
    if (conflict) {
      return res.status(409).json({ error: conflict })
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

    // Conflict detection against the *effective* values (existing merged with patch)
    const existing = await prisma.timetableEntry.findUnique({ where: { id } })
    if (!existing) {
      return res.status(404).json({ error: 'Timetable entry not found' })
    }
    const effective = {
      teacherId: data.teacherId ?? existing.teacherId,
      room: data.room ?? existing.room,
      dayOfWeek: data.dayOfWeek ?? existing.dayOfWeek,
      startTime: data.startTime ?? existing.startTime,
      endTime: data.endTime ?? existing.endTime,
      semester: data.semester ?? existing.semester,
      courseId: data.courseId ?? existing.courseId,
    }
    const conflict = await findConflict({ ...effective, excludeId: id })
    if (conflict) {
      return res.status(409).json({ error: conflict })
    }

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

// GET /api/timetable/insights — Student only
// Per-course attendance risk, grade projection, and next assessment.
async function getInsights(req, res, next) {
  try {
    const insights = await buildStudentInsights(req.user.id)
    res.json(insights)
  } catch (err) {
    next(err)
  }
}

// ── Auto Timetable Generator ────────────────────────────────────────────────

const GEN_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']

// Fixed 1-hour time slots the generator distributes across.
const GEN_SLOTS = [
  { start: '08:00', end: '09:00' },
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:00', end: '12:00' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
  { start: '16:00', end: '17:00' },
]

// POST /api/timetable/generate — Admin only
// Runs the greedy scheduler and returns a draft (nothing is saved yet).
// Body: { semester, requests: [{ courseId, teacherId, lecturesPerWeek, rooms }] }
async function generateTimetable(req, res, next) {
  try {
    const { semester, requests } = req.body

    if (!semester || !Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({
        error: 'semester and a non-empty requests array are required',
      })
    }
    for (const r of requests) {
      if (!r.courseId || !r.teacherId || !r.lecturesPerWeek) {
        return res.status(400).json({ error: 'Each request needs courseId, teacherId and lecturesPerWeek' })
      }
      if (!Array.isArray(r.rooms) || r.rooms.length === 0) {
        return res.status(400).json({ error: `Request for courseId ${r.courseId} needs at least one room` })
      }
    }

    // Load existing entries for the semester — used for conflict checking.
    const existing = await prisma.timetableEntry.findMany({
      where: { semester },
      select: { courseId: true, teacherId: true, room: true, dayOfWeek: true, startTime: true, endTime: true },
    })

    // Working set includes existing + new draft entries as we place them.
    const placed = [...existing]
    const draft = []
    const warnings = []

    const hasConflict = (teacherId, room, dayOfWeek, start, end, courseId) =>
      placed.some(
        (e) =>
          e.dayOfWeek === dayOfWeek &&
          timesOverlap(start, end, e.startTime, e.endTime) &&
          (e.teacherId === teacherId || e.room === room || e.courseId === courseId)
      )

    for (const request of requests) {
      const cId = parseInt(request.courseId)
      const tId = parseInt(request.teacherId)
      const needed = parseInt(request.lecturesPerWeek)
      const rooms = request.rooms.map((r) => r.trim())

      let assigned = 0
      let dayRotation = 0 // rotate starting day to spread load across the week

      while (assigned < needed) {
        let foundThisLecture = false

        for (let offset = 0; offset < GEN_DAYS.length; offset++) {
          const day = GEN_DAYS[(dayRotation + offset) % GEN_DAYS.length]

          // Never schedule the same course twice on the same day.
          const courseAlreadyToday = placed.some((e) => e.courseId === cId && e.dayOfWeek === day)
          if (courseAlreadyToday) continue

          for (const slot of GEN_SLOTS) {
            for (const room of rooms) {
              if (!hasConflict(tId, room, day, slot.start, slot.end, cId)) {
                const entry = {
                  courseId: cId,
                  teacherId: tId,
                  dayOfWeek: day,
                  startTime: slot.start,
                  endTime: slot.end,
                  room,
                  semester,
                }
                draft.push(entry)
                placed.push(entry)
                assigned++
                dayRotation = (GEN_DAYS.indexOf(day) + 1) % GEN_DAYS.length
                foundThisLecture = true
                break // rooms
              }
            }
            if (foundThisLecture) break // slots
          }
          if (foundThisLecture) break // day offset
        }

        if (!foundThisLecture) {
          warnings.push(
            `Could only place ${assigned}/${needed} lectures for courseId ${cId} (teacherId ${tId}) — no free slot found`
          )
          break
        }
      }
    }

    // Enrich draft with course + teacher names for the preview table.
    const courseIds = [...new Set(draft.map((e) => e.courseId))]
    const teacherIds = [...new Set(draft.map((e) => e.teacherId))]

    const [courses, teachers] = await Promise.all([
      prisma.course.findMany({
        where: { id: { in: courseIds } },
        select: { id: true, name: true, code: true },
      }),
      prisma.user.findMany({
        where: { id: { in: teacherIds } },
        select: { id: true, email: true, teacherId: true, firstName: true, lastName: true },
      }),
    ])

    const courseMap = Object.fromEntries(courses.map((c) => [c.id, c]))
    const teacherMap = Object.fromEntries(teachers.map((t) => [t.id, t]))

    const enriched = draft.map((e) => ({
      ...e,
      course: courseMap[e.courseId] || null,
      teacher: teacherMap[e.teacherId] || null,
    }))

    res.json({ draft: enriched, count: enriched.length, warnings })
  } catch (err) {
    next(err)
  }
}

// POST /api/timetable/bulk — Admin only
// Saves a confirmed draft returned by /generate (no conflict re-check here;
// UI can call /generate first, review, then POST the approved entries here).
async function saveDraft(req, res, next) {
  try {
    const { entries } = req.body

    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ error: 'entries array is required' })
    }

    // Run a final conflict check on each entry before committing.
    for (const e of entries) {
      const conflict = await findConflict({
        teacherId: e.teacherId,
        room: e.room,
        dayOfWeek: e.dayOfWeek,
        startTime: e.startTime,
        endTime: e.endTime,
        semester: e.semester,
        courseId: e.courseId,
      })
      if (conflict) {
        return res.status(409).json({
          error: `Conflict detected: ${conflict} — ${e.course?.code || e.courseId} ${e.dayOfWeek} ${e.startTime}`,
        })
      }
    }

    const created = await prisma.$transaction(
      entries.map((e) =>
        prisma.timetableEntry.create({
          data: {
            courseId: parseInt(e.courseId),
            teacherId: parseInt(e.teacherId),
            dayOfWeek: e.dayOfWeek,
            startTime: e.startTime,
            endTime: e.endTime,
            room: e.room.trim(),
            semester: e.semester.trim(),
          },
          include: entryInclude,
        })
      )
    )

    res.status(201).json({ created, count: created.length })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getTimetable,
  getSemesters,
  getInsights,
  createEntry,
  updateEntry,
  deleteEntry,
  generateTimetable,
  saveDraft,
}
