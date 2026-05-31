// Smart Timetable 2.0 — academic insight helpers.
//
// The pure functions here (getAttendanceRisk, timesOverlap, predictFinalGrade)
// have NO DB calls and are unit-tested in __tests__/timetableInsights.test.js.
// buildStudentInsights() is the one data-aware function — it reuses the same
// JS-side aggregation pattern as attendanceController/gradeController because
// PostgreSQL cannot SUM(boolean) through Prisma's _sum.

const prisma = require('./prisma')
const { calculateLetterGrade } = require('./gradeUtils')

// Component weights for the predicted final grade.
const WEIGHTS = { INTERNAL: 0.2, MID_TERM: 0.3, FINAL: 0.5 }

// Lower mark bound for each letter — mirrors calculateLetterGrade thresholds.
const LETTER_LOWER_BOUND = {
  O: 80, 'A+': 70, A: 65, 'B+': 61, B: 50, C: 40, P: 35, F: 0,
}

const MIN_ATTENDANCE = 0.75

// ---- Pure helpers -------------------------------------------------------

// Attendance risk band + how many consecutive future classes (all attended)
// are needed to climb back to 75%.
//   >= 75% SAFE · 65-74% WARNING · < 65% CRITICAL
function getAttendanceRisk(attended, total) {
  const currentAttendance = total > 0 ? Math.round((attended / total) * 100) : 0

  let riskLevel
  if (total === 0 || currentAttendance >= 75) riskLevel = 'SAFE'
  else if (currentAttendance >= 65) riskLevel = 'WARNING'
  else riskLevel = 'CRITICAL'

  // Solve (attended + x) / (total + x) >= 0.75  ->  x >= (0.75*total - attended) / 0.25
  let classesNeeded = 0
  if (currentAttendance < 75 && total > 0) {
    classesNeeded = Math.ceil((MIN_ATTENDANCE * total - attended) / (1 - MIN_ATTENDANCE))
    if (classesNeeded < 0) classesNeeded = 0
  }

  return { riskLevel, currentAttendance, classesNeeded }
}

// Two "HH:MM" intervals overlap? Touching edges (10:00-11:00 vs 11:00-12:00)
// do NOT count as overlap. String compare is safe for zero-padded 24h times.
function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd
}

// Weighted grade projection from a component map:
//   { INTERNAL?: {marks}, MID_TERM?: {marks}, FINAL?: {marks} }  (marks 0-100)
// If FINAL exists  -> projection reflects the student's actual standing.
// If FINAL missing -> assume the final equals the current average, and also
// report how many marks the final needs to hold the projected letter band.
function predictFinalGrade(gradeMap) {
  const internal = gradeMap.INTERNAL?.marks ?? null
  const mid = gradeMap.MID_TERM?.marks ?? null
  const final = gradeMap.FINAL?.marks ?? null

  if (final !== null) {
    // Normalise over the components actually present so a missing INTERNAL
    // doesn't drag the standing to zero.
    let weightedSum = 0
    let weightTotal = 0
    for (const [comp, weight] of Object.entries(WEIGHTS)) {
      const marks = gradeMap[comp]?.marks
      if (marks !== undefined && marks !== null) {
        weightedSum += marks * weight
        weightTotal += weight
      }
    }
    const projectedPercentage = Math.round(weightedSum / weightTotal)
    return {
      hasFinal: true,
      projectedGrade: calculateLetterGrade(projectedPercentage),
      projectedPercentage,
      marksNeededInFinal: null,
    }
  }

  // No final yet — base everything on entered components.
  const entered = [internal, mid].filter((m) => m !== null)
  if (entered.length === 0) {
    return {
      hasFinal: false,
      projectedGrade: null,
      projectedPercentage: null,
      marksNeededInFinal: null,
    }
  }

  const currentAverage = entered.reduce((s, m) => s + m, 0) / entered.length

  // Project assuming any missing component (incl. final) equals current avg.
  let projected = 0
  for (const [comp, weight] of Object.entries(WEIGHTS)) {
    const marks = gradeMap[comp]?.marks
    projected += weight * (marks !== undefined && marks !== null ? marks : currentAverage)
  }
  const projectedPercentage = Math.round(projected)
  const projectedGrade = calculateLetterGrade(projectedPercentage)

  // Marks the final must earn to keep the projected letter band.
  const fixedContribution =
    WEIGHTS.INTERNAL * (internal !== null ? internal : currentAverage) +
    WEIGHTS.MID_TERM * (mid !== null ? mid : currentAverage)
  const target = LETTER_LOWER_BOUND[projectedGrade] ?? 0
  let marksNeededInFinal = Math.ceil((target - fixedContribution) / WEIGHTS.FINAL)
  if (marksNeededInFinal < 0) marksNeededInFinal = 0
  if (marksNeededInFinal > 100) marksNeededInFinal = 100

  return {
    hasFinal: false,
    projectedGrade,
    projectedPercentage,
    marksNeededInFinal,
  }
}

// ---- Data-aware -----------------------------------------------------------

// Per-course academic insight for one student: attendance risk, grade
// projection, current letter, and the nearest upcoming assessment.
async function buildStudentInsights(userId) {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    include: {
      course: { select: { id: true, name: true, code: true } },
      attendance: { select: { present: true } },
      grades: { select: { component: true, marks: true, letterGrade: true } },
    },
  })

  const courseIds = enrollments.map((e) => e.course.id)

  // Nearest future assessment per enrolled course (today counts as upcoming).
  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  const nextByCourse = {}
  if (courseIds.length > 0) {
    const upcoming = await prisma.assessment.findMany({
      where: { courseId: { in: courseIds }, dueDate: { gte: startOfToday } },
      orderBy: { dueDate: 'asc' },
      select: { id: true, courseId: true, title: true, dueDate: true, type: true },
    })
    for (const a of upcoming) {
      if (!nextByCourse[a.courseId]) nextByCourse[a.courseId] = a
    }
  }

  const courses = enrollments.map((enrollment) => {
    const total = enrollment.attendance.length
    const attended = enrollment.attendance.filter((a) => a.present).length
    const attendance = { ...getAttendanceRisk(attended, total), attended, total }

    // Build component map for the prediction engine.
    const gradeMap = {}
    enrollment.grades.forEach((g) => {
      gradeMap[g.component] = { marks: g.marks, letterGrade: g.letterGrade }
    })
    const prediction = predictFinalGrade(gradeMap)

    // "Current grade" = the real final if entered, else letter of the average.
    let currentLetter = null
    if (gradeMap.FINAL) currentLetter = gradeMap.FINAL.letterGrade
    else if (prediction.projectedPercentage !== null) {
      const entered = Object.values(gradeMap)
      currentLetter = calculateLetterGrade(
        Math.round(entered.reduce((s, g) => s + g.marks, 0) / (entered.length || 1))
      )
    }

    const gradeRisk =
      prediction.projectedGrade !== null &&
      ['F', 'P'].includes(prediction.projectedGrade)

    return {
      courseId: enrollment.course.id,
      courseName: enrollment.course.name,
      courseCode: enrollment.course.code,
      attendance,
      grade: { ...prediction, currentLetter, gradeRisk },
      nextAssessment: nextByCourse[enrollment.course.id] || null,
    }
  })

  return { courses }
}

module.exports = {
  getAttendanceRisk,
  timesOverlap,
  predictFinalGrade,
  buildStudentInsights,
  WEIGHTS,
  LETTER_LOWER_BOUND,
}
