/**
 * ERP -> ML dataset extraction.
 *
 * Reads the live ERP database and emits one row per student-course enrollment
 * to ai/data/raw/erp_student_course.csv.
 *
 * READ-ONLY. This script issues no writes of any kind. It reuses the existing
 * Prisma singleton (server/lib/prisma.js) rather than opening a second pool.
 *
 * Attendance is aggregated in JavaScript, not SQL, because PostgreSQL cannot
 * SUM(boolean) through Prisma's _sum -- the same constraint attendanceController
 * and timetableInsights already work around.
 *
 * Usage:  node ai/scripts/export_student_academic_data.js
 */

require('dotenv').config()

const fs = require('fs')
const path = require('path')
const prisma = require('../../server/lib/prisma')

const OUT_DIR = path.join(__dirname, '..', 'data', 'raw')
const OUT_FILE = path.join(OUT_DIR, 'erp_student_course.csv')

// at_risk threshold. Mirrors timetableInsights.gradeRisk, which flags a
// projected letter of F or P -- i.e. below 40 marks. See ai/README.md section 5.
const AT_RISK_THRESHOLD = 40

const COLUMNS = [
  'source',
  'student_id',
  'course_code',
  'department',
  'course_type',
  'credits',
  'attendance_percentage',
  'classes_held',
  'internal_marks',
  'midterm_marks',
  'past_failures',
  'study_time',
  'final_marks',
  'at_risk',
]

function csvEscape(value) {
  if (value === null || value === undefined) return ''
  const s = String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

async function main() {
  console.log('ERP -> ML dataset extraction (read-only)\n')

  const enrollments = await prisma.enrollment.findMany({
    where: { user: { role: 'STUDENT' } },
    include: {
      user: { select: { studentId: true, department: { select: { code: true } } } },
      course: {
        select: { code: true, type: true, credits: true, department: { select: { code: true } } },
      },
      attendance: { select: { present: true } },
      grades: { select: { component: true, marks: true } },
    },
  })

  console.log(`Enrollments read: ${enrollments.length}`)

  const rows = []
  let skippedNoFinal = 0

  for (const e of enrollments) {
    const gradeMap = {}
    for (const g of e.grades) gradeMap[g.component] = g.marks

    // A missing FINAL is a missing OUTCOME, not a missing feature. Imputing it
    // would mean inventing the label, so these rows are dropped, not filled.
    if (gradeMap.FINAL === undefined || gradeMap.FINAL === null) {
      skippedNoFinal++
      continue
    }

    const classesHeld = e.attendance.length
    const attended = e.attendance.filter((a) => a.present).length
    const attendancePct = classesHeld > 0 ? (attended / classesHeld) * 100 : null

    rows.push({
      source: 'ERP',
      student_id: e.user.studentId || `user_${e.userId}`,
      course_code: e.course.code,
      department: e.course.department?.code ?? e.user.department?.code ?? '',
      course_type: e.course.type,
      credits: e.course.credits,
      attendance_percentage: attendancePct === null ? '' : attendancePct.toFixed(2),
      classes_held: classesHeld,
      internal_marks: gradeMap.INTERNAL ?? '',
      midterm_marks: gradeMap.MID_TERM ?? '',
      // The ERP has no equivalent of these two UCI columns. Left empty on
      // purpose -- the notebook demonstrates handling them as missing values.
      past_failures: '',
      study_time: '',
      final_marks: gradeMap.FINAL,
      at_risk: gradeMap.FINAL < AT_RISK_THRESHOLD ? 1 : 0,
    })
  }

  fs.mkdirSync(OUT_DIR, { recursive: true })
  const csv = [
    COLUMNS.join(','),
    ...rows.map((r) => COLUMNS.map((c) => csvEscape(r[c])).join(',')),
  ].join('\n')
  fs.writeFileSync(OUT_FILE, csv + '\n', 'utf8')

  const atRisk = rows.filter((r) => r.at_risk === 1).length

  console.log(`Dropped (no FINAL grade):  ${skippedNoFinal}`)
  console.log(`Usable rows written:       ${rows.length}`)
  console.log(`  at_risk = 1:             ${atRisk}`)
  console.log(`  at_risk = 0:             ${rows.length - atRisk}`)
  console.log(`\nWritten to: ${path.relative(process.cwd(), OUT_FILE)}`)

  if (rows.length < 100) {
    console.log(
      `\nWARNING: ${rows.length} rows is far too few to train on. ` +
        `Use the UCI dataset for training -- see ai/README.md section 7.`
    )
  }
  if (atRisk === 0) {
    console.log(
      'WARNING: zero at_risk rows. The classification target has only one ' +
        'class, so no classifier can be trained on this data alone.'
    )
  }
}

main()
  .catch((err) => {
    console.error('\nExtraction FAILED.')
    console.error(err.message)
    console.error(
      '\nIs the database reachable? This script needs DATABASE_URL in .env ' +
        'and a running PostgreSQL instance.'
    )
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
