const prisma = require('../lib/prisma')
const { calculateLetterGrade, gradeToGPA, getPassStatus } = require('../lib/gradeUtils')

// GET /api/grades/courses
// Teacher: their courses with grading completion status
async function getTeacherCourses(req, res, next) {
  try {
    const teacherId = req.user.id

    const assignments = await prisma.courseTeacher.findMany({
      where: { userId: teacherId },
      include: {
        course: {
          include: {
            department: { select: { name: true, code: true } },
            _count: { select: { enrollments: true } },
            enrollments: {
              include: {
                grades: {
                  select: { component: true },
                },
              },
            },
          },
        },
      },
    })

    const courses = assignments.map(({ course }) => {
      const totalStudents = course._count.enrollments
      const fullyGraded = course.enrollments.filter(
        (e) => e.grades.length === 3
      ).length

      // Which components have at least one grade entered
      const allComponents = course.enrollments.flatMap((e) =>
        e.grades.map((g) => g.component)
      )
      const componentStatus = {
        INTERNAL: allComponents.includes('INTERNAL'),
        MID_TERM: allComponents.includes('MID_TERM'),
        FINAL: allComponents.includes('FINAL'),
      }

      return {
        id: course.id,
        name: course.name,
        code: course.code,
        department: course.department,
        enrollmentCount: totalStudents,
        gradingProgress: {
          fullyGraded,
          total: totalStudents,
          percentage: totalStudents > 0
            ? Math.round((fullyGraded / totalStudents) * 100)
            : 0,
        },
        componentStatus,
      }
    })

    res.json(courses)
  } catch (err) {
    next(err)
  }
}

// GET /api/grades/:courseId/students
// Teacher: all enrolled students + their grades for this course
async function getCourseStudents(req, res, next) {
  try {
    const courseId = parseInt(req.params.courseId)
    const teacherId = req.user.id

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
            id: true, email: true, studentId: true,
          },
        },
        grades: {
          select: {
            id: true, component: true,
            marks: true, letterGrade: true,
          },
        },
      },
      orderBy: { enrolledAt: 'asc' },
    })

    const students = enrollments.map((enrollment) => {
      const gradeMap = {}
      enrollment.grades.forEach((g) => {
        gradeMap[g.component] = {
          gradeId: g.id,
          marks: g.marks,
          letterGrade: g.letterGrade,
        }
      })

      return {
        enrollmentId: enrollment.id,
        userId: enrollment.user.id,
        email: enrollment.user.email,
        studentId: enrollment.user.studentId,
        grades: {
          INTERNAL: gradeMap['INTERNAL'] || null,
          MID_TERM: gradeMap['MID_TERM'] || null,
          FINAL: gradeMap['FINAL'] || null,
        },
      }
    })

    res.json({ courseId, students })
  } catch (err) {
    next(err)
  }
}

// POST /api/grades/:courseId/students/:enrollmentId
// Teacher: upsert one component grade — letter grade auto-calculated
async function upsertGrade(req, res, next) {
  try {
    const enrollmentId = parseInt(req.params.enrollmentId)
    const courseId = parseInt(req.params.courseId)
    const teacherId = req.user.id
    const { component, marks } = req.body

    if (!component || marks === undefined) {
      return res.status(400).json({ error: 'component and marks are required' })
    }
    if (!['INTERNAL', 'MID_TERM', 'FINAL'].includes(component)) {
      return res.status(400).json({ error: 'Invalid component' })
    }
    if (marks < 0 || marks > 100) {
      return res.status(400).json({ error: 'Marks must be between 0 and 100' })
    }

    // Verify teacher owns this course
    const assignment = await prisma.courseTeacher.findUnique({
      where: { courseId_userId: { courseId, userId: teacherId } },
    })
    if (!assignment) {
      return res.status(403).json({ error: 'You are not assigned to this course' })
    }

    // Verify enrollment belongs to this course
    const enrollment = await prisma.enrollment.findFirst({
      where: { id: enrollmentId, courseId },
    })
    if (!enrollment) {
      return res.status(404).json({ error: 'Enrollment not found in this course' })
    }

    // WHY backend calculates letter grade:
    // Business rules live on the server. Frontend never decides grades.
    const letterGrade = calculateLetterGrade(parseFloat(marks))

    const grade = await prisma.grade.upsert({
      where: {
        enrollmentId_component: {
          enrollmentId,
          component,
        },
      },
      create: {
        enrollmentId,
        component,
        marks: parseFloat(marks),
        letterGrade,
      },
      update: {
        marks: parseFloat(marks),
        letterGrade,
      },
    })

    res.json(grade)
  } catch (err) {
    next(err)
  }
}

// GET /api/grades/my
// Student: full grade report with GPA
async function getMyGrades(req, res, next) {
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
        grades: {
          select: {
            component: true, marks: true, letterGrade: true,
          },
        },
      },
    })

    let totalGPAPoints = 0
    let gpaCoursesCount = 0

    const courses = enrollments.map((enrollment) => {
      const gradeMap = {}
      enrollment.grades.forEach((g) => {
        gradeMap[g.component] = {
          marks: g.marks,
          letterGrade: g.letterGrade,
        }
      })

      const passStatus = getPassStatus(gradeMap)

      // Total marks = sum of all entered components
      const enteredGrades = Object.values(gradeMap).filter(Boolean)
      const totalMarks = enteredGrades.reduce((sum, g) => sum + g.marks, 0)
      const averagePercentage = enteredGrades.length > 0
        ? Math.round(totalMarks / enteredGrades.length)
        : null

      // Overall letter grade based on average
      const overallGrade = averagePercentage !== null
        ? calculateLetterGrade(averagePercentage)
        : null

      // Contribute to GPA only if FINAL is graded
      if (gradeMap.FINAL) {
        totalGPAPoints += gradeToGPA(gradeMap.FINAL.letterGrade)
        gpaCoursesCount++
      }

      return {
        courseId: enrollment.course.id,
        courseName: enrollment.course.name,
        courseCode: enrollment.course.code,
        courseType: enrollment.course.type,
        department: enrollment.course.department,
        passStatus,
        grades: {
          INTERNAL: gradeMap['INTERNAL'] || null,
          MID_TERM: gradeMap['MID_TERM'] || null,
          FINAL: gradeMap['FINAL'] || null,
        },
        totalMarks: Math.round(totalMarks),
        averagePercentage,
        overallGrade,
      }
    })

    const gpa = gpaCoursesCount > 0
      ? Math.round((totalGPAPoints / gpaCoursesCount) * 100) / 100
      : null

    const passedCourses = courses.filter((c) => c.passStatus === 'PASS').length
    const pendingCourses = courses.filter((c) => c.passStatus === 'PENDING').length
    const failedCourses = courses.filter((c) => c.passStatus === 'FAIL').length

    res.json({
      gpa,
      totalCourses: courses.length,
      passedCourses,
      pendingCourses,
      failedCourses,
      courses,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getTeacherCourses,
  getCourseStudents,
  upsertGrade,
  getMyGrades,
}
