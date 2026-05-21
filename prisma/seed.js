const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

function toLetterGrade(marks) {
  if (marks >= 90) return 'A+'
  if (marks >= 80) return 'A'
  if (marks >= 70) return 'B'
  if (marks >= 60) return 'C'
  if (marks >= 50) return 'D'
  return 'F'
}

async function ensureTimetableEntry(data) {
  const exists = await prisma.timetableEntry.findFirst({ where: data, select: { id: true } })
  if (!exists) await prisma.timetableEntry.create({ data })
}

async function ensureAnnouncement(data) {
  const exists = await prisma.announcement.findFirst({
    where: { title: data.title, authorId: data.authorId, targetRole: data.targetRole },
    select: { id: true },
  })
  if (!exists) await prisma.announcement.create({ data })
}

async function main() {
  // Create CSE department
  const cseDept = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: {
      name: 'Computer Science & Engineering',
      code: 'CSE',
    },
  })

  console.log('Created department:', cseDept.code)

  // Admin
  await prisma.user.upsert({
    where: { email: 'pavitarmodgil001@gmail.com' },
    update: {},
    create: {
      email: 'pavitarmodgil001@gmail.com',
      password: await bcrypt.hash('admin123', SALT_ROUNDS),
      role: 'ADMIN',
    },
  })

  // Teacher 1 — Dr. Aman Kumar
  await prisma.user.upsert({
    where: { email: 'aman.kumar@uni.com' },
    update: {},
    create: {
      email: 'aman.kumar@uni.com',
      password: await bcrypt.hash('teacher123', SALT_ROUNDS),
      role: 'TEACHER',
      teacherId: 'TCH001',
      departmentId: cseDept.id,
    },
  })

  // Teacher 2 — Harveen Kaur (mustResetPassword: true)
  await prisma.user.upsert({
    where: { email: 'harveen.kaur@uni.com' },
    update: {},
    create: {
      email: 'harveen.kaur@uni.com',
      password: await bcrypt.hash('teacher123', SALT_ROUNDS),
      role: 'TEACHER',
      teacherId: 'TCH002',
      departmentId: cseDept.id,
      mustResetPassword: true,
    },
  })

  // Student — Aseem Kamra
  await prisma.user.upsert({
    where: { studentId: 'STU003' },
    update: {},
    create: {
      email: 'aseem.kamra@uni.com',
      password: await bcrypt.hash('student123', SALT_ROUNDS),
      role: 'STUDENT',
      studentId: 'STU003',
      departmentId: cseDept.id,
    },
  })

  // Requested teacher account with dashboard-ready seed data
  const abheyjeetTeacher = await prisma.user.upsert({
    where: { email: 'abheyjeet100@gmail.com' },
    update: {},
    create: {
      email: 'abheyjeet100@gmail.com',
      password: await bcrypt.hash('teacher123', SALT_ROUNDS),
      role: 'TEACHER',
      teacherId: 'TCH100',
      departmentId: cseDept.id,
    },
  })

  // Requested student account with dashboard-ready seed data
  const aseemStudent = await prisma.user.upsert({
    where: { email: 'aseemkamra22@gmail.com' },
    update: {},
    create: {
      email: 'aseemkamra22@gmail.com',
      password: await bcrypt.hash('student123', SALT_ROUNDS),
      role: 'STUDENT',
      studentId: 'STU100',
      departmentId: cseDept.id,
    },
  })

  // Additional courses for richer teacher/student dashboards
  const courses = await Promise.all([
    prisma.course.upsert({
      where: { code: 'CSE210' },
      update: {},
      create: { name: 'Data Structures', code: 'CSE210', type: 'MANDATORY', credits: 4, departmentId: cseDept.id },
    }),
    prisma.course.upsert({
      where: { code: 'CSE320' },
      update: {},
      create: { name: 'Database Systems', code: 'CSE320', type: 'MANDATORY', credits: 3, departmentId: cseDept.id },
    }),
    prisma.course.upsert({
      where: { code: 'CSE340' },
      update: {},
      create: { name: 'Web Engineering', code: 'CSE340', type: 'ELECTIVE', credits: 3, departmentId: cseDept.id },
    }),
  ])

  for (const course of courses) {
    await prisma.courseTeacher.upsert({
      where: { courseId_userId: { courseId: course.id, userId: abheyjeetTeacher.id } },
      update: {},
      create: { courseId: course.id, userId: abheyjeetTeacher.id },
    })
  }

  // Timetable rows visible on both teacher and student timetable pages
  await ensureTimetableEntry({
    courseId: courses[0].id, teacherId: abheyjeetTeacher.id, dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: '2026-EVEN',
  })
  await ensureTimetableEntry({
    courseId: courses[0].id, teacherId: abheyjeetTeacher.id, dayOfWeek: 'WED', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: '2026-EVEN',
  })
  await ensureTimetableEntry({
    courseId: courses[1].id, teacherId: abheyjeetTeacher.id, dayOfWeek: 'TUE', startTime: '11:00', endTime: '12:00', room: 'DB-201', semester: '2026-EVEN',
  })
  await ensureTimetableEntry({
    courseId: courses[2].id, teacherId: abheyjeetTeacher.id, dayOfWeek: 'THU', startTime: '14:00', endTime: '15:00', room: 'LAB-3', semester: '2026-EVEN',
  })

  const enrollments = []
  for (const course of courses) {
    const enrollment = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: aseemStudent.id, courseId: course.id } },
      update: {},
      create: { userId: aseemStudent.id, courseId: course.id },
    })
    enrollments.push(enrollment)
  }

  // Attendance trend data for the student dashboard
  const attendanceDates = [
    new Date('2026-02-10'),
    new Date('2026-02-17'),
    new Date('2026-02-24'),
    new Date('2026-03-03'),
    new Date('2026-03-10'),
  ]
  for (const enrollment of enrollments) {
    for (let i = 0; i < attendanceDates.length; i += 1) {
      const present = i !== 2
      await prisma.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: enrollment.id, date: attendanceDates[i] } },
        update: { present },
        create: { enrollmentId: enrollment.id, date: attendanceDates[i], present },
      })
    }
  }

  // Grade components so reports and GPA sections are populated
  const scoreCard = [78, 84, 88]
  for (let i = 0; i < enrollments.length; i += 1) {
    const enrollment = enrollments[i]
    const internal = scoreCard[i]
    const mid = scoreCard[i] + 4
    const final = scoreCard[i] + 8

    await prisma.grade.upsert({
      where: { enrollmentId_component: { enrollmentId: enrollment.id, component: 'INTERNAL' } },
      update: { marks: internal, letterGrade: toLetterGrade(internal) },
      create: { enrollmentId: enrollment.id, component: 'INTERNAL', marks: internal, letterGrade: toLetterGrade(internal) },
    })
    await prisma.grade.upsert({
      where: { enrollmentId_component: { enrollmentId: enrollment.id, component: 'MID_TERM' } },
      update: { marks: mid, letterGrade: toLetterGrade(mid) },
      create: { enrollmentId: enrollment.id, component: 'MID_TERM', marks: mid, letterGrade: toLetterGrade(mid) },
    })
    await prisma.grade.upsert({
      where: { enrollmentId_component: { enrollmentId: enrollment.id, component: 'FINAL' } },
      update: { marks: final, letterGrade: toLetterGrade(final) },
      create: { enrollmentId: enrollment.id, component: 'FINAL', marks: final, letterGrade: toLetterGrade(final) },
    })
  }

  await ensureAnnouncement({
    title: 'Assessment Calendar - CSE210/CSE320/CSE340',
    body: 'INTERNAL, MID_TERM, and FINAL timelines are now live for all students enrolled in the Spring 2026 section.',
    targetRole: 'STUDENT',
    authorId: abheyjeetTeacher.id,
  })
  await ensureAnnouncement({
    title: 'Faculty Reminder: Attendance Sync Complete',
    body: 'Attendance sessions for all allocated courses have been uploaded and synced for this week.',
    targetRole: 'TEACHER',
    authorId: abheyjeetTeacher.id,
  })

  console.log('Seeded: 1 dept, 4 users (pavitarmodgil001, TCH001, TCH002, STU003)')
  console.log('Added requested users: abheyjeet100@gmail.com (TCH100), aseemkamra22@gmail.com (STU100)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
