const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

// Matches gradeUtils.calculateLetterGrade exactly
function toLetterGrade(marks) {
  if (marks >= 80) return 'O'
  if (marks >= 70) return 'A+'
  if (marks >= 65) return 'A'
  if (marks >= 61) return 'B+'
  if (marks >= 50) return 'B'
  if (marks >= 40) return 'C'
  if (marks >= 35) return 'P'
  return 'F'
}

async function seedAttendance(enrollmentId, dates, absentIndices) {
  await Promise.all(
    dates.map((date, i) =>
      prisma.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId, date } },
        update: { present: !absentIndices.includes(i) },
        create: { enrollmentId, date, present: !absentIndices.includes(i) },
      })
    )
  )
}

async function upsertGrade(enrollmentId, component, marks) {
  await prisma.grade.upsert({
    where: { enrollmentId_component: { enrollmentId, component } },
    update: { marks, letterGrade: toLetterGrade(marks) },
    create: { enrollmentId, component, marks, letterGrade: toLetterGrade(marks) },
  })
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
  // ── Pre-flight: free conflicting IDs from previous seed runs ──────────────
  // Teacher IDs being reassigned: TCH002 (harveen: TCH004→TCH002),
  // TCH003 (priya.sharma: TCH003→TCH004, rajesh.patel taking TCH003),
  // TCH005/TCH006 (vikram/anjali freed for new users)
  await prisma.user.updateMany({
    where: {
      email: {
        in: [
          'rajesh.singh@uni.com',
          'vikram.patel@uni.com',
          'anjali.gupta@uni.com',
          'neha.mishra@uni.com',
          'harveen.kaur@uni.com',
          'priya.sharma@uni.com',
        ],
      },
    },
    data: { teacherId: null },
  })
  // Student IDs being reassigned (aseemkamra22: STU001→STU100, others freed for new users)
  await prisma.user.updateMany({
    where: {
      email: {
        in: [
          'aseemkamra22@gmail.com',
          'rohan.sharma@uni.com',
          'kavya.nair@uni.com',
          'aditya.verma@uni.com',
          'disha.mehta@uni.com',
          'arjun.mishra@uni.com',
          'zara.khan@uni.com',
          'tanvi.singh@uni.com',
          'priya.jain@uni.com',
        ],
      },
    },
    data: { studentId: null },
  })
  console.log('✓ Pre-flight ID cleanup')

  const [adminPwd, teacherPwd, studentPwd] = await Promise.all([
    bcrypt.hash('admin123', SALT_ROUNDS),
    bcrypt.hash('teacher123', SALT_ROUNDS),
    bcrypt.hash('student123', SALT_ROUNDS),
  ])

  // ── Departments ───────────────────────────────────────────────────────────
  const [cseDept, eceDept, meDept] = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CSE' },
      update: {},
      create: { name: 'Computer Science & Engineering', code: 'CSE' },
    }),
    prisma.department.upsert({
      where: { code: 'ECE' },
      update: {},
      create: { name: 'Electronics & Communication Engineering', code: 'ECE' },
    }),
    prisma.department.upsert({
      where: { code: 'ME' },
      update: {},
      create: { name: 'Mechanical Engineering', code: 'ME' },
    }),
  ])
  console.log('✓ Departments: 3')

  // ── Admins ────────────────────────────────────────────────────────────────
  const [adminPav] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'pavitarmodgil001@gmail.com' },
      update: {},
      create: { email: 'pavitarmodgil001@gmail.com', password: adminPwd, role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { email: 'admin2@uni.com' },
      update: {},
      create: {
        email: 'admin2@uni.com',
        firstName: 'Secondary',
        lastName: 'Admin',
        password: adminPwd,
        role: 'ADMIN',
      },
    }),
  ])

  // ── Teachers ──────────────────────────────────────────────────────────────
  // All teacherIds are free after pre-flight — can run in parallel
  const [tch1, tch2, tch3, tch4, tch5, tch6, tch10, tch100] = await Promise.all([
    // TCH001 — Aman Kumar (CSE, no change)
    prisma.user.upsert({
      where: { email: 'aman.kumar@uni.com' },
      update: { firstName: 'Aman', lastName: 'Kumar', teacherId: 'TCH001' },
      create: {
        email: 'aman.kumar@uni.com',
        firstName: 'Aman',
        lastName: 'Kumar',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH001',
        departmentId: cseDept.id,
      },
    }),
    // TCH002 — Harveen Kaur (CSE, mustReset — was TCH004)
    prisma.user.upsert({
      where: { email: 'harveen.kaur@uni.com' },
      update: { teacherId: 'TCH002', firstName: 'Harveen', lastName: 'Kaur', mustResetPassword: true },
      create: {
        email: 'harveen.kaur@uni.com',
        firstName: 'Harveen',
        lastName: 'Kaur',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH002',
        departmentId: cseDept.id,
        mustResetPassword: true,
      },
    }),
    // TCH003 — Rajesh Patel (ECE, new)
    prisma.user.upsert({
      where: { email: 'rajesh.patel@uni.com' },
      update: {},
      create: {
        email: 'rajesh.patel@uni.com',
        firstName: 'Rajesh',
        lastName: 'Patel',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH003',
        departmentId: eceDept.id,
      },
    }),
    // TCH004 — Priya Sharma (ME, was TCH003/ECE)
    prisma.user.upsert({
      where: { email: 'priya.sharma@uni.com' },
      update: { teacherId: 'TCH004', departmentId: meDept.id, firstName: 'Priya', lastName: 'Sharma' },
      create: {
        email: 'priya.sharma@uni.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH004',
        departmentId: meDept.id,
      },
    }),
    // TCH005 — Guest Instructor (CSE, part-time, new)
    prisma.user.upsert({
      where: { email: 'guest.instructor@uni.com' },
      update: {},
      create: {
        email: 'guest.instructor@uni.com',
        firstName: 'Guest',
        lastName: 'Instructor',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH005',
        departmentId: cseDept.id,
      },
    }),
    // TCH006 — Unassigned (ECE, 0 courses — edge case)
    prisma.user.upsert({
      where: { email: 'unassigned.teacher@uni.com' },
      update: {},
      create: {
        email: 'unassigned.teacher@uni.com',
        firstName: 'Unassigned',
        lastName: 'Teacher',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH006',
        departmentId: eceDept.id,
      },
    }),
    // TCH010 — Demo Teacher (CSE, new)
    prisma.user.upsert({
      where: { email: 'demo.teacher@uni.com' },
      update: {},
      create: {
        email: 'demo.teacher@uni.com',
        firstName: 'Demo',
        lastName: 'Teacher',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH010',
        departmentId: cseDept.id,
      },
    }),
    // TCH100 — Abheyjeet (CSE, legacy, no name)
    prisma.user.upsert({
      where: { email: 'abheyjeet100@gmail.com' },
      update: { password: teacherPwd },
      create: {
        email: 'abheyjeet100@gmail.com',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH100',
        departmentId: cseDept.id,
      },
    }),
  ])
  console.log('✓ Teachers: 8')

  // ── Students ──────────────────────────────────────────────────────────────
  // STU003 — Aseem Kamra (CSE, legacy email, no name)
  const stuAseem = await prisma.user.upsert({
    where: { email: 'aseem.kamra@uni.com' },
    update: { studentId: 'STU003' },
    create: {
      email: 'aseem.kamra@uni.com',
      password: studentPwd,
      role: 'STUDENT',
      studentId: 'STU003',
      departmentId: cseDept.id,
    },
  })

  // STU100 — aseemkamra22 (CSE, was STU001, now demo student)
  const stuDemo = await prisma.user.upsert({
    where: { email: 'aseemkamra22@gmail.com' },
    update: { studentId: 'STU100', firstName: 'Aseem', lastName: 'Kamra', departmentId: cseDept.id },
    create: {
      email: 'aseemkamra22@gmail.com',
      firstName: 'Aseem',
      lastName: 'Kamra',
      password: studentPwd,
      role: 'STUDENT',
      studentId: 'STU100',
      departmentId: cseDept.id,
    },
  })

  const [stu4, stu5, stu6, stu7, stu8, stu9] = await Promise.all([
    // STU004 — Maya Singh (CSE, partial enrollment — electives only)
    prisma.user.upsert({
      where: { email: 'maya.singh@uni.com' },
      update: {},
      create: {
        email: 'maya.singh@uni.com',
        firstName: 'Maya',
        lastName: 'Singh',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU004',
        departmentId: cseDept.id,
      },
    }),
    // STU005 — Arjun Verma (ECE dept, enrolls in CSE — high performer)
    prisma.user.upsert({
      where: { email: 'arjun.verma@uni.com' },
      update: {},
      create: {
        email: 'arjun.verma@uni.com',
        firstName: 'Arjun',
        lastName: 'Verma',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU005',
        departmentId: eceDept.id,
      },
    }),
    // STU006 — Poor Performer (CSE, at-risk: low attendance + grades)
    prisma.user.upsert({
      where: { email: 'poor.performer@uni.com' },
      update: {},
      create: {
        email: 'poor.performer@uni.com',
        firstName: 'Poor',
        lastName: 'Performer',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU006',
        departmentId: cseDept.id,
      },
    }),
    // STU007 — Incomplete Grades (ME dept, ECE courses, no FINAL grades)
    prisma.user.upsert({
      where: { email: 'incomplete.grades@uni.com' },
      update: {},
      create: {
        email: 'incomplete.grades@uni.com',
        firstName: 'Incomplete',
        lastName: 'Grades',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU007',
        departmentId: meDept.id,
      },
    }),
    // STU008 — Cross Dept (ECE, fully enrolled ECE courses)
    prisma.user.upsert({
      where: { email: 'cross.dept@uni.com' },
      update: {},
      create: {
        email: 'cross.dept@uni.com',
        firstName: 'Cross',
        lastName: 'Dept',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU008',
        departmentId: eceDept.id,
      },
    }),
    // STU009 — No Courses (CSE, edge case: empty dashboard)
    prisma.user.upsert({
      where: { email: 'no.courses@uni.com' },
      update: {},
      create: {
        email: 'no.courses@uni.com',
        firstName: 'No',
        lastName: 'Courses',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU009',
        departmentId: cseDept.id,
      },
    }),
  ])
  console.log('✓ Students: 8')

  // ── Courses ───────────────────────────────────────────────────────────────
  const [cse210, cse320, cse340, cse450, cse460, ece210, ece320, ece410, ece420, me210, me220, me450] =
    await Promise.all([
      prisma.course.upsert({
        where: { code: 'CSE210' },
        update: { name: 'Data Structures', type: 'MANDATORY', credits: 4 },
        create: { name: 'Data Structures', code: 'CSE210', type: 'MANDATORY', credits: 4, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'CSE320' },
        update: { name: 'Database Systems', type: 'MANDATORY', credits: 3 },
        create: { name: 'Database Systems', code: 'CSE320', type: 'MANDATORY', credits: 3, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'CSE340' },
        update: { name: 'Web Engineering', type: 'MANDATORY', credits: 4 },
        create: { name: 'Web Engineering', code: 'CSE340', type: 'MANDATORY', credits: 4, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'CSE450' },
        update: { name: 'Machine Learning Basics' },
        create: { name: 'Machine Learning Basics', code: 'CSE450', type: 'ELECTIVE', credits: 3, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'CSE460' },
        update: {},
        create: { name: 'Mobile App Development', code: 'CSE460', type: 'ELECTIVE', credits: 3, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE210' },
        update: { name: 'Digital Electronics', type: 'MANDATORY', credits: 3 },
        create: { name: 'Digital Electronics', code: 'ECE210', type: 'MANDATORY', credits: 3, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE320' },
        update: { name: 'Microprocessors', type: 'MANDATORY', credits: 4 },
        create: { name: 'Microprocessors', code: 'ECE320', type: 'MANDATORY', credits: 4, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE410' },
        update: {},
        create: { name: 'Signal Processing', code: 'ECE410', type: 'ELECTIVE', credits: 3, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE420' },
        update: {},
        create: { name: 'Embedded Systems', code: 'ECE420', type: 'ELECTIVE', credits: 3, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ME210' },
        update: { name: 'Thermodynamics', type: 'MANDATORY', credits: 3 },
        create: { name: 'Thermodynamics', code: 'ME210', type: 'MANDATORY', credits: 3, departmentId: meDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ME220' },
        update: {},
        create: { name: 'Fluid Mechanics', code: 'ME220', type: 'MANDATORY', credits: 4, departmentId: meDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ME450' },
        update: {},
        create: { name: 'CAD & Design', code: 'ME450', type: 'ELECTIVE', credits: 3, departmentId: meDept.id },
      }),
    ])
  console.log('✓ Courses: 12 (5 CSE · 4 ECE · 3 ME)')

  // ── CourseTeacher assignments ──────────────────────────────────────────────
  // TCH006 (unassigned) intentionally excluded — 0 courses edge case
  const ctPairs = [
    { courseId: cse210.id, userId: tch1.id },   // CSE210 multi-teacher
    { courseId: cse210.id, userId: tch2.id },
    { courseId: cse320.id, userId: tch100.id },
    { courseId: cse340.id, userId: tch100.id },
    { courseId: cse450.id, userId: tch1.id },
    { courseId: cse460.id, userId: tch5.id },
    { courseId: ece210.id, userId: tch3.id },
    { courseId: ece320.id, userId: tch3.id },
    { courseId: ece410.id, userId: tch4.id },
    { courseId: ece420.id, userId: tch3.id },   // tch3 teaches 3 ECE courses
    { courseId: me210.id, userId: tch4.id },
    { courseId: me220.id, userId: tch4.id },    // tch4 teaches 3 courses cross-dept
    { courseId: me450.id, userId: tch10.id },
  ]
  await Promise.all(
    ctPairs.map(({ courseId, userId }) =>
      prisma.courseTeacher.upsert({
        where: { courseId_userId: { courseId, userId } },
        update: {},
        create: { courseId, userId },
      })
    )
  )
  console.log('✓ CourseTeacher: 13 assignments')

  // ── Enrollments ───────────────────────────────────────────────────────────
  const enrollDefs = [
    // STU003 (aseem.kamra) — fully enrolled, 4 CSE courses
    { userId: stuAseem.id, courseId: cse210.id },
    { userId: stuAseem.id, courseId: cse320.id },
    { userId: stuAseem.id, courseId: cse340.id },
    { userId: stuAseem.id, courseId: cse450.id },
    // STU100 (aseemkamra22) — demo student, same 4 courses
    { userId: stuDemo.id, courseId: cse210.id },
    { userId: stuDemo.id, courseId: cse320.id },
    { userId: stuDemo.id, courseId: cse340.id },
    { userId: stuDemo.id, courseId: cse450.id },
    // STU004 (maya.singh) — electives only
    { userId: stu4.id, courseId: cse450.id },
    { userId: stu4.id, courseId: cse460.id },
    // STU005 (arjun.verma) — high performer, 4 CSE courses (cross-dept enrollment)
    { userId: stu5.id, courseId: cse210.id },
    { userId: stu5.id, courseId: cse320.id },
    { userId: stu5.id, courseId: cse340.id },
    { userId: stu5.id, courseId: cse450.id },
    // STU006 (poor.performer) — at-risk, 3 courses
    { userId: stu6.id, courseId: cse210.id },
    { userId: stu6.id, courseId: cse320.id },
    { userId: stu6.id, courseId: cse340.id },
    // STU007 (incomplete.grades) — ECE courses, no FINAL grades
    { userId: stu7.id, courseId: ece210.id },
    { userId: stu7.id, courseId: ece320.id },
    { userId: stu7.id, courseId: ece410.id },
    // STU008 (cross.dept) — fully enrolled ECE
    { userId: stu8.id, courseId: ece210.id },
    { userId: stu8.id, courseId: ece320.id },
    { userId: stu8.id, courseId: ece410.id },
    { userId: stu8.id, courseId: ece420.id },
    // STU009 (no.courses) — no enrollments (edge case)
  ]

  const enrollMap = {}
  for (const def of enrollDefs) {
    const enr = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: def.userId, courseId: def.courseId } },
      update: {},
      create: { userId: def.userId, courseId: def.courseId, enrolledAt: new Date('2026-01-15') },
    })
    enrollMap[`${def.userId}-${def.courseId}`] = enr
  }
  const E = (uid, cid) => enrollMap[`${uid}-${cid}`]
  console.log('✓ Enrollments: 24')

  // ── Attendance — 14 dates across 5 weeks ─────────────────────────────────
  const dates = [
    new Date('2026-02-10'), // W1 Mon
    new Date('2026-02-12'), // W1 Wed
    new Date('2026-02-14'), // W1 Fri
    new Date('2026-02-17'), // W2 Mon
    new Date('2026-02-19'), // W2 Wed
    new Date('2026-02-21'), // W2 Fri
    new Date('2026-02-24'), // W3 Mon
    new Date('2026-02-26'), // W3 Wed
    new Date('2026-02-28'), // W3 Fri
    new Date('2026-03-03'), // W4 Mon
    new Date('2026-03-05'), // W4 Wed
    new Date('2026-03-10'), // W5 Mon
    new Date('2026-03-12'), // W5 Wed
    new Date('2026-03-14'), // W5 Fri
  ]

  // STU003 (aseem.kamra) — 100% perfect attendance
  for (const cId of [cse210.id, cse320.id, cse340.id, cse450.id]) {
    await seedAttendance(E(stuAseem.id, cId).id, dates, [])
  }

  // STU100 (demo) — ~93% (1 absent per 2 courses)
  await seedAttendance(E(stuDemo.id, cse210.id).id, dates, [2])
  await seedAttendance(E(stuDemo.id, cse320.id).id, dates, [7])
  await seedAttendance(E(stuDemo.id, cse340.id).id, dates, [])
  await seedAttendance(E(stuDemo.id, cse450.id).id, dates, [])

  // STU004 (maya.singh) — 100% on electives
  await seedAttendance(E(stu4.id, cse450.id).id, dates, [])
  await seedAttendance(E(stu4.id, cse460.id).id, dates, [])

  // STU005 (arjun.verma) — ~96% high performer
  await seedAttendance(E(stu5.id, cse210.id).id, dates, [5])
  await seedAttendance(E(stu5.id, cse320.id).id, dates, [])
  await seedAttendance(E(stu5.id, cse340.id).id, dates, [11])
  await seedAttendance(E(stu5.id, cse450.id).id, dates, [])

  // STU006 (poor.performer) — ~57–64% at-risk (below 75% threshold)
  await seedAttendance(E(stu6.id, cse210.id).id, dates, [0, 2, 4, 7, 9, 11])  // 8/14 = 57%
  await seedAttendance(E(stu6.id, cse320.id).id, dates, [1, 3, 5, 8, 10, 12]) // 8/14 = 57%
  await seedAttendance(E(stu6.id, cse340.id).id, dates, [0, 2, 6, 9, 13])     // 9/14 = 64%

  // STU007 (incomplete.grades) — ~86%
  await seedAttendance(E(stu7.id, ece210.id).id, dates, [3, 8])
  await seedAttendance(E(stu7.id, ece320.id).id, dates, [5, 11])
  await seedAttendance(E(stu7.id, ece410.id).id, dates, [1, 6])

  // STU008 (cross.dept) — ~93%
  await seedAttendance(E(stu8.id, ece210.id).id, dates, [4])
  await seedAttendance(E(stu8.id, ece320.id).id, dates, [9])
  await seedAttendance(E(stu8.id, ece410.id).id, dates, [])
  await seedAttendance(E(stu8.id, ece420.id).id, dates, [12])

  console.log('✓ Attendance: 24 enrollments × 14 dates = 336 records')

  // ── Grades ────────────────────────────────────────────────────────────────
  // STU003 (average) — all 3 components, mix of grades
  const aseemGrades = {
    [cse210.id]: [75, 78, 82],  // A+, A+, O
    [cse320.id]: [68, 72, 75],  // A, A+, A+
    [cse340.id]: [82, 88, 90],  // O, O, O
    [cse450.id]: [70, 74, 78],  // A+, A+, A+
  }
  for (const [cId, [i, m, f]] of Object.entries(aseemGrades)) {
    const enr = E(stuAseem.id, Number(cId))
    await upsertGrade(enr.id, 'INTERNAL', i)
    await upsertGrade(enr.id, 'MID_TERM', m)
    await upsertGrade(enr.id, 'FINAL', f)
  }

  // STU100 (demo) — same as aseem
  for (const [cId, [i, m, f]] of Object.entries(aseemGrades)) {
    const enr = E(stuDemo.id, Number(cId))
    await upsertGrade(enr.id, 'INTERNAL', i)
    await upsertGrade(enr.id, 'MID_TERM', m)
    await upsertGrade(enr.id, 'FINAL', f)
  }

  // STU005 (high performer) — all O, GPA 10.0
  const highGrades = {
    [cse210.id]: [92, 95, 98],
    [cse320.id]: [88, 91, 94],
    [cse340.id]: [90, 93, 96],
    [cse450.id]: [87, 90, 93],
  }
  for (const [cId, [i, m, f]] of Object.entries(highGrades)) {
    const enr = E(stu5.id, Number(cId))
    await upsertGrade(enr.id, 'INTERNAL', i)
    await upsertGrade(enr.id, 'MID_TERM', m)
    await upsertGrade(enr.id, 'FINAL', f)
  }

  // STU006 (at-risk) — low grades, barely passing
  const atRiskGrades = {
    [cse210.id]: [42, 48, 55],  // C, C, B
    [cse320.id]: [38, 45, 52],  // C, C, B
    [cse340.id]: [35, 40, 45],  // P, C, C
  }
  for (const [cId, [i, m, f]] of Object.entries(atRiskGrades)) {
    const enr = E(stu6.id, Number(cId))
    await upsertGrade(enr.id, 'INTERNAL', i)
    await upsertGrade(enr.id, 'MID_TERM', m)
    await upsertGrade(enr.id, 'FINAL', f)
  }

  // STU004 (maya) — excellent on electives
  await upsertGrade(E(stu4.id, cse450.id).id, 'INTERNAL', 85)
  await upsertGrade(E(stu4.id, cse450.id).id, 'MID_TERM', 88)
  await upsertGrade(E(stu4.id, cse450.id).id, 'FINAL', 91)
  await upsertGrade(E(stu4.id, cse460.id).id, 'INTERNAL', 80)
  await upsertGrade(E(stu4.id, cse460.id).id, 'MID_TERM', 83)
  await upsertGrade(E(stu4.id, cse460.id).id, 'FINAL', 86)

  // STU007 (incomplete) — INTERNAL + MID_TERM only, FINAL pending
  await upsertGrade(E(stu7.id, ece210.id).id, 'INTERNAL', 72)
  await upsertGrade(E(stu7.id, ece210.id).id, 'MID_TERM', 76)
  await upsertGrade(E(stu7.id, ece320.id).id, 'INTERNAL', 68)
  await upsertGrade(E(stu7.id, ece320.id).id, 'MID_TERM', 71)
  await upsertGrade(E(stu7.id, ece410.id).id, 'INTERNAL', 80)
  await upsertGrade(E(stu7.id, ece410.id).id, 'MID_TERM', 84)

  // STU008 (cross.dept) — solid across all ECE courses
  const crossGrades = {
    [ece210.id]: [78, 81, 85],  // A+, O, O
    [ece320.id]: [75, 79, 83],  // A+, A+, O
    [ece410.id]: [82, 86, 89],  // O, O, O
    [ece420.id]: [70, 73, 76],  // A+, A+, A+
  }
  for (const [cId, [i, m, f]] of Object.entries(crossGrades)) {
    const enr = E(stu8.id, Number(cId))
    await upsertGrade(enr.id, 'INTERNAL', i)
    await upsertGrade(enr.id, 'MID_TERM', m)
    await upsertGrade(enr.id, 'FINAL', f)
  }

  console.log('✓ Grades: 69 entries (mix of complete + incomplete)')

  // ── Timetable — semester 2026-EVEN ────────────────────────────────────────
  const S = '2026-EVEN'
  const ttEntries = [
    // CSE210 — tch1 (Mon/Wed/Fri), tch2 (Tue/Thu)
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'WED', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'FRI', startTime: '14:00', endTime: '15:00', room: 'LAB-1', semester: S },
    { courseId: cse210.id, teacherId: tch2.id, dayOfWeek: 'TUE', startTime: '11:00', endTime: '12:00', room: 'CSE-211', semester: S },
    { courseId: cse210.id, teacherId: tch2.id, dayOfWeek: 'THU', startTime: '11:00', endTime: '12:00', room: 'CSE-211', semester: S },
    // CSE320 — tch100 (Mon/Wed)
    { courseId: cse320.id, teacherId: tch100.id, dayOfWeek: 'MON', startTime: '11:00', endTime: '12:00', room: 'DB-Lab', semester: S },
    { courseId: cse320.id, teacherId: tch100.id, dayOfWeek: 'WED', startTime: '11:00', endTime: '12:00', room: 'DB-Lab', semester: S },
    // CSE340 — tch100 (Tue/Thu)
    { courseId: cse340.id, teacherId: tch100.id, dayOfWeek: 'TUE', startTime: '14:00', endTime: '15:30', room: 'LAB-3', semester: S },
    { courseId: cse340.id, teacherId: tch100.id, dayOfWeek: 'THU', startTime: '14:00', endTime: '15:30', room: 'LAB-3', semester: S },
    // CSE450 — tch1 (Mon/Fri)
    { courseId: cse450.id, teacherId: tch1.id, dayOfWeek: 'MON', startTime: '14:00', endTime: '15:00', room: 'CSE-320', semester: S },
    { courseId: cse450.id, teacherId: tch1.id, dayOfWeek: 'FRI', startTime: '11:00', endTime: '12:00', room: 'CSE-320', semester: S },
    // CSE460 — tch5 (Tue/Thu)
    { courseId: cse460.id, teacherId: tch5.id, dayOfWeek: 'TUE', startTime: '09:00', endTime: '10:30', room: 'LAB-2', semester: S },
    { courseId: cse460.id, teacherId: tch5.id, dayOfWeek: 'THU', startTime: '09:00', endTime: '10:30', room: 'LAB-2', semester: S },
    // ECE210 — tch3 (Mon/Fri)
    { courseId: ece210.id, teacherId: tch3.id, dayOfWeek: 'MON', startTime: '10:00', endTime: '11:00', room: 'ECE-LH-1', semester: S },
    { courseId: ece210.id, teacherId: tch3.id, dayOfWeek: 'FRI', startTime: '10:00', endTime: '11:00', room: 'ECE-LH-1', semester: S },
    // ECE320 — tch3 (Tue/Wed)
    { courseId: ece320.id, teacherId: tch3.id, dayOfWeek: 'TUE', startTime: '10:00', endTime: '11:00', room: 'ECE-Lab-1', semester: S },
    { courseId: ece320.id, teacherId: tch3.id, dayOfWeek: 'WED', startTime: '14:00', endTime: '15:00', room: 'ECE-Lab-1', semester: S },
    // ECE410 — tch4 (Mon/Thu)
    { courseId: ece410.id, teacherId: tch4.id, dayOfWeek: 'MON', startTime: '13:00', endTime: '14:00', room: 'ECE-Lab-2', semester: S },
    { courseId: ece410.id, teacherId: tch4.id, dayOfWeek: 'THU', startTime: '13:00', endTime: '14:00', room: 'ECE-Lab-2', semester: S },
    // ECE420 — tch3 (Sat, 1 session/week)
    { courseId: ece420.id, teacherId: tch3.id, dayOfWeek: 'SAT', startTime: '10:00', endTime: '12:00', room: 'ECE-Lab-3', semester: S },
    // ME210 — tch4 (Tue/Fri)
    { courseId: me210.id, teacherId: tch4.id, dayOfWeek: 'TUE', startTime: '13:00', endTime: '14:00', room: 'ME-LH-1', semester: S },
    { courseId: me210.id, teacherId: tch4.id, dayOfWeek: 'FRI', startTime: '13:00', endTime: '14:00', room: 'ME-LH-1', semester: S },
    // ME220 — tch4 (Wed/Sat)
    { courseId: me220.id, teacherId: tch4.id, dayOfWeek: 'WED', startTime: '10:00', endTime: '11:00', room: 'ME-Lab-1', semester: S },
    { courseId: me220.id, teacherId: tch4.id, dayOfWeek: 'SAT', startTime: '09:00', endTime: '10:00', room: 'ME-Lab-1', semester: S },
    // ME450 — tch10 (Mon/Wed/Fri)
    { courseId: me450.id, teacherId: tch10.id, dayOfWeek: 'MON', startTime: '15:00', endTime: '16:30', room: 'CAD-Lab', semester: S },
    { courseId: me450.id, teacherId: tch10.id, dayOfWeek: 'WED', startTime: '15:00', endTime: '16:30', room: 'CAD-Lab', semester: S },
    { courseId: me450.id, teacherId: tch10.id, dayOfWeek: 'FRI', startTime: '15:00', endTime: '16:30', room: 'CAD-Lab', semester: S },
  ]
  for (const entry of ttEntries) {
    await ensureTimetableEntry(entry)
  }
  console.log('✓ Timetable: 27 entries')

  // ── Announcements ─────────────────────────────────────────────────────────
  const announcements = [
    // STUDENT (4)
    {
      title: 'Assessment Calendar — Spring 2026',
      body: 'INTERNAL (Feb 24–28), MID_TERM (Mar 10–14), FINAL (Apr 7–18). Mark your calendars.',
      targetRole: 'STUDENT',
      authorId: tch1.id,
    },
    {
      title: 'Lab Assignment: Data Structures',
      body: 'Week 5 assignment now live on the portal. Deadline: Mar 14.',
      targetRole: 'STUDENT',
      authorId: tch1.id,
    },
    {
      title: 'Semester Project Guidelines',
      body: 'All teams must submit project proposals by Mar 20. See announcement details for rubric.',
      targetRole: 'STUDENT',
      authorId: tch100.id,
    },
    {
      title: 'Mid-term Exam Postponed',
      body: 'Due to unforeseen circumstances, Mid-term exams for CSE batch postponed to Mar 15.',
      targetRole: 'STUDENT',
      authorId: adminPav.id,
    },
    // TEACHER (4)
    {
      title: 'Faculty Meeting — Mar 8',
      body: 'Quarterly faculty meeting at 2 PM in Hall-1. Attendance mandatory.',
      targetRole: 'TEACHER',
      authorId: adminPav.id,
    },
    {
      title: 'Grade Submission Deadline',
      body: 'All grades must be submitted by Mar 25. Late submissions will not be accepted.',
      targetRole: 'TEACHER',
      authorId: adminPav.id,
    },
    {
      title: 'Course Feedback Survey',
      body: 'Please complete the end-of-semester survey. Link sent to your email.',
      targetRole: 'TEACHER',
      authorId: adminPav.id,
    },
    {
      title: 'New LMS Features Available',
      body: 'Grade tracking and attendance sync now automated. See IT helpdesk for setup.',
      targetRole: 'TEACHER',
      authorId: adminPav.id,
    },
    // ADMIN (3)
    {
      title: 'System Maintenance — Mar 18 (2–6 PM)',
      body: 'Database maintenance scheduled. All services will be unavailable.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    {
      title: 'New Compliance Requirements',
      body: 'Audit trail logging now mandatory for all grade changes. Review IT docs.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    {
      title: 'Department Budget Review',
      body: 'Budget allocation meeting for all dept heads. Confidential.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    // ALL (3)
    {
      title: 'Welcome to Spring 2026 Semester',
      body: 'A new semester begins! Check your timetable, enrollments, and announcements on the dashboard.',
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
    {
      title: 'Important: Update Your Contact Information',
      body: 'Please verify your email and phone number in your profile. Critical for notifications.',
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
    {
      title: 'Holiday Notice — Mar 22 (Weekend Extended)',
      body: 'Extended weekend for Holi festival. No classes on Mar 22–24.',
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
  ]
  for (const ann of announcements) {
    await ensureAnnouncement(ann)
  }
  console.log('✓ Announcements: 14 (4 STUDENT · 4 TEACHER · 3 ADMIN · 3 ALL)')

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n─────────────────────────────────────────────────────')
  console.log('✓  3 departments')
  console.log('✓ 18 users   (2 admin · 8 teachers · 8 students)')
  console.log('✓ 12 courses (5 CSE · 4 ECE · 3 ME)')
  console.log('✓ 13 course-teacher assignments')
  console.log('✓ 24 enrollments')
  console.log('✓ 336 attendance records (24 enrollments × 14 dates)')
  console.log('✓ 69 grade entries (complete for 6 students · FINAL pending for STU007)')
  console.log('✓ 27 timetable entries')
  console.log('✓ 14 announcements')
  console.log('─────────────────────────────────────────────────────')
  console.log('')
  console.log('Test accounts (password shown):')
  console.log('  Admin  : pavitarmodgil001@gmail.com  admin123')
  console.log('  Teacher: aman.kumar@uni.com          teacher123  (TCH001 — 2 courses)')
  console.log('  Teacher: abheyjeet100@gmail.com      teacher123  (TCH100 — 2 courses)')
  console.log('  Student: aseemkamra22@gmail.com      student123  (STU100 — demo, 4 courses)')
  console.log('  Student: aseem.kamra@uni.com         student123  (STU003 — 100% attendance)')
  console.log('  Student: arjun.verma@uni.com         student123  (STU005 — high performer)')
  console.log('  Student: poor.performer@uni.com      student123  (STU006 — at-risk)')
  console.log('  Student: no.courses@uni.com          student123  (STU009 — empty dashboard)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
