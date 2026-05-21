const prisma = require('../lib/prisma')

function todayDate() {
  const now = new Date()
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
}

// Returns midnight-UTC Date for a "YYYY-MM-DD" string, or null if invalid
function parseAndValidateDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  const date = new Date(Date.UTC(y, m - 1, d))
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null
  return date
}

// GET /api/attendance/courses
// Teacher: their assigned courses with today's submission status
async function getTeacherCourses(req, res, next) {
  try {
    const teacherId = req.user.id
    const today = todayDate()

    const assignments = await prisma.courseTeacher.findMany({
      where: { userId: teacherId },
      include: {
        course: {
          include: {
            department: { select: { name: true, code: true } },
            _count: { select: { enrollments: true } },
            enrollments: {
              take: 1,
              include: {
                attendance: {
                  where: { date: today },
                  take: 1,
                },
              },
            },
          },
        },
      },
    })

    // WHY we check enrollments[0].attendance to determine todaySubmitted:
    // We only need to know if ANY attendance record exists for today
    // on this course. We don't need to load all records just to check.
    const courses = assignments.map(({ course }) => {
      const todaySubmitted = course.enrollments.some(
        (e) => e.attendance.length > 0
      )
      return {
        id: course.id,
        name: course.name,
        code: course.code,
        type: course.type,
        department: course.department,
        enrollmentCount: course._count.enrollments,
        todaySubmitted,
        lastSessionDate: null,
      }
    })

    res.json(courses)
  } catch (err) {
    next(err)
  }
}

async function getOrCreateSession(req, res, next) {
  try {
    const courseId = parseInt(req.params.courseId)
    const teacherId = req.user.id

    let sessionDate = todayDate()
    if (req.query.date) {
      sessionDate = parseAndValidateDate(req.query.date)
      if (!sessionDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' })
      }
      if (sessionDate > todayDate()) {
        return res.status(400).json({ error: 'Cannot view future attendance sessions' })
      }
    }

    const assignment = await prisma.courseTeacher.findUnique({
      where: { courseId_userId: { courseId, userId: teacherId } },
    })
    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true, email: true,
            studentId: true, isActive: true,
          },
        },
        attendance: {
          where: { date: sessionDate },
          take: 1,
        },
      },
    })

    if (enrollments.length === 0) {
      return res.json({ courseId, date: sessionDate, students: [], totalStudents: 0, presentCount: 0 })
    }

    const students = enrollments.map((enrollment) => ({
      enrollmentId: enrollment.id,
      userId: enrollment.user.id,
      email: enrollment.user.email,
      studentId: enrollment.user.studentId,
      present: enrollment.attendance[0]?.present ?? false,
      alreadySaved: enrollment.attendance.length > 0,
    }))

    res.json({
      courseId,
      date: sessionDate,
      students,
      totalStudents: students.length,
      presentCount: students.filter((s) => s.present).length,
    })
  } catch (err) {
    next(err)
  }
}

async function saveSession(req, res, next) {
  try {
    const courseId = parseInt(req.params.courseId)
    const teacherId = req.user.id
    const { students, date: dateParam } = req.body

    let sessionDate = todayDate()
    if (dateParam) {
      sessionDate = parseAndValidateDate(dateParam)
      if (!sessionDate) {
        return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' })
      }
      if (sessionDate > todayDate()) {
        return res.status(400).json({ error: 'Cannot save attendance for future dates' })
      }
    }

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'students array is required' })
    }

    const assignment = await prisma.courseTeacher.findUnique({
      where: { courseId_userId: { courseId, userId: teacherId } },
    })
    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    const upserts = students.map(({ enrollmentId, present }) =>
      prisma.attendance.upsert({
        where: {
          enrollmentId_date: {
            enrollmentId: parseInt(enrollmentId),
            date: sessionDate,
          },
        },
        create: {
          enrollmentId: parseInt(enrollmentId),
          date: sessionDate,
          present: Boolean(present),
        },
        update: {
          present: Boolean(present),
        },
      })
    )

    await Promise.all(upserts)

    const presentCount = students.filter((s) => s.present).length
    res.json({
      message: 'Attendance saved',
      date: sessionDate,
      totalStudents: students.length,
      presentCount,
      absentCount: students.length - presentCount,
    })
  } catch (err) {
    next(err)
  }
}

// GET /api/attendance/:courseId/history
// Teacher: list of past sessions (unique dates) with counts
async function getSessionHistory(req, res, next) {
  try {
    const courseId = parseInt(req.params.courseId)
    const teacherId = req.user.id

    const assignment = await prisma.courseTeacher.findUnique({
      where: { courseId_userId: { courseId, userId: teacherId } },
    })
    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    // WHY findMany + JS aggregation instead of groupBy with _sum:
    // PostgreSQL does not allow SUM(boolean) — it requires an explicit cast.
    // MySQL treats booleans as TINYINT so _sum worked there. Aggregating
    // in JS keeps the query database-agnostic and avoids the runtime error.
    const [allRecords, totalEnrolled] = await Promise.all([
      prisma.attendance.findMany({
        where: { enrollment: { courseId } },
        select: { date: true, present: true },
        orderBy: { date: 'desc' },
      }),
      prisma.enrollment.count({ where: { courseId } }),
    ])

    const dateMap = new Map()
    for (const r of allRecords) {
      const key = r.date.toISOString()
      if (!dateMap.has(key)) dateMap.set(key, { date: r.date, total: 0, present: 0 })
      const entry = dateMap.get(key)
      entry.total++
      if (r.present) entry.present++
    }

    const history = [...dateMap.values()].map((e) => ({
      date: e.date,
      totalStudents: e.total,
      presentCount: e.present,
      absentCount: e.total - e.present,
      percentage: totalEnrolled > 0
        ? Math.round((e.present / totalEnrolled) * 100)
        : 0,
    }))

    res.json(history)
  } catch (err) {
    next(err)
  }
}

// GET /api/attendance/my
// Student: attendance percentage per enrolled course
async function getMyAttendance(req, res, next) {
  try {
    const studentId = req.user.id

    const enrollments = await prisma.enrollment.findMany({
      where: { userId: studentId },
      include: {
        course: {
          select: {
            id: true, name: true, code: true, type: true,
            department: { select: { name: true, code: true } },
          },
        },
        attendance: {
          select: { present: true, date: true },
        },
      },
    })

    const result = enrollments.map((enrollment) => {
      const total = enrollment.attendance.length
      const attended = enrollment.attendance.filter((a) => a.present).length
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0

      return {
        courseId: enrollment.course.id,
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code,
        courseType: enrollment.course.type,
        department: enrollment.course.department,
        totalSessions: total,
        attendedSessions: attended,
        percentage,
        atRisk: total > 0 && percentage < 75,
      }
    })

    const totalSessions = result.reduce((sum, c) => sum + c.totalSessions, 0)
    const totalAttended = result.reduce((sum, c) => sum + c.attendedSessions, 0)
    const overallPercentage = totalSessions > 0
      ? Math.round((totalAttended / totalSessions) * 100)
      : 0

    res.json({
      overallPercentage,
      totalCourses: result.length,
      courses: result,
    })
  } catch (err) {
    next(err)
  }
}

async function updateSingleAttendance(req, res, next) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId)
    const teacherId = req.user.id
    const { date, present } = req.body

    if (!date || present === undefined) {
      return res.status(400).json({
        error: 'date and present are required. Example: { "date": "2026-02-10", "present": true }',
      })
    }

    const attendanceDate = parseAndValidateDate(date)
    if (!attendanceDate) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD.' })
    }

    if (attendanceDate > todayDate()) {
      return res.status(400).json({ error: 'Cannot edit future attendance' })
    }

    const enrollment = await prisma.enrollment.findUnique({
      where: { id: enrollmentId },
      include: {
        course: {
          include: {
            teachers: {
              where: { userId: teacherId },
              select: { id: true },
            },
          },
        },
      },
    })

    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found' })
    }

    if (enrollment.course.teachers.length === 0) {
      return res.status(403).json({
        error: 'You are not assigned to this course. Cannot edit attendance.',
      })
    }

    const updated = await prisma.attendance.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId,
          date: attendanceDate,
        },
      },
      create: {
        enrollmentId,
        date: attendanceDate,
        present: Boolean(present),
      },
      update: {
        present: Boolean(present),
      },
      include: {
        enrollment: {
          include: {
            user: { select: { email: true, studentId: true } },
            course: { select: { name: true, code: true } },
          },
        },
      },
    })

    res.json({
      message: 'Attendance updated',
      attendanceRecord: {
        id: updated.id,
        enrollmentId: updated.enrollmentId,
        student: `${updated.enrollment.user.studentId} (${updated.enrollment.user.email})`,
        course: `${updated.enrollment.course.code} — ${updated.enrollment.course.name}`,
        date: updated.date,
        present: updated.present,
      },
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getTeacherCourses,
  getOrCreateSession,
  saveSession,
  getSessionHistory,
  getMyAttendance,
  updateSingleAttendance,
}
