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

async function seedAttendance(enrollmentId, dates, absentIndices) {
  for (let i = 0; i < dates.length; i++) {
    const present = !absentIndices.includes(i)
    await prisma.attendance.upsert({
      where: { enrollmentId_date: { enrollmentId, date: dates[i] } },
      update: { present },
      create: { enrollmentId, date: dates[i], present },
    })
  }
}

async function upsertGrade(enrollmentId, component, marks) {
  await prisma.grade.upsert({
    where: { enrollmentId_component: { enrollmentId, component } },
    update: { marks, letterGrade: toLetterGrade(marks) },
    create: { enrollmentId, component, marks, letterGrade: toLetterGrade(marks) },
  })
}

async function main() {
  const [adminPwd, teacherPwd, studentPwd] = await Promise.all([
    bcrypt.hash('admin123', SALT_ROUNDS),
    bcrypt.hash('teacher123', SALT_ROUNDS),
    bcrypt.hash('student123', SALT_ROUNDS),
  ])

  // ── Departments ────────────────────────────────────────────────────────
  const [cseDept, eceDept, meDept] = await Promise.all([
    prisma.department.upsert({
      where: { code: 'CSE' },
      update: {},
      create: { name: 'Computer Science & Engineering', code: 'CSE' },
    }),
    prisma.department.upsert({
      where: { code: 'ECE' },
      update: {},
      create: { name: 'Electronics & Communication', code: 'ECE' },
    }),
    prisma.department.upsert({
      where: { code: 'ME' },
      update: {},
      create: { name: 'Mechanical Engineering', code: 'ME' },
    }),
  ])
  console.log('✓ Seeded 3 departments')

  // ── Admins ─────────────────────────────────────────────────────────────
  const [adminPav] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'pavitarmodgil001@gmail.com' },
      update: {},
      create: { email: 'pavitarmodgil001@gmail.com', password: adminPwd, role: 'ADMIN' },
    }),
    prisma.user.upsert({
      where: { email: 'admin.secondary@uni.com' },
      update: {},
      create: {
        email: 'admin.secondary@uni.com',
        firstName: 'Secondary',
        lastName: 'Admin',
        password: adminPwd,
        role: 'ADMIN',
      },
    }),
  ])

  // ── Teachers ───────────────────────────────────────────────────────────
  // Harveen updated first to free TCH002 before Rajesh claims it
  const tch4 = await prisma.user.upsert({
    where: { email: 'harveen.kaur@uni.com' },
    update: { teacherId: 'TCH004', firstName: 'Harveen', lastName: 'Kaur' },
    create: {
      email: 'harveen.kaur@uni.com',
      firstName: 'Harveen',
      lastName: 'Kaur',
      password: teacherPwd,
      role: 'TEACHER',
      teacherId: 'TCH004',
      departmentId: cseDept.id,
      mustResetPassword: true,
    },
  })

  const [tch1, tch2, tch3, tch5, tch6, tch7] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'aman.kumar@uni.com' },
      update: { firstName: 'Aman', lastName: 'Kumar' },
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
    prisma.user.upsert({
      where: { email: 'rajesh.singh@uni.com' },
      update: {},
      create: {
        email: 'rajesh.singh@uni.com',
        firstName: 'Rajesh',
        lastName: 'Singh',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH002',
        departmentId: cseDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'priya.sharma@uni.com' },
      update: {},
      create: {
        email: 'priya.sharma@uni.com',
        firstName: 'Priya',
        lastName: 'Sharma',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH003',
        departmentId: eceDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'vikram.patel@uni.com' },
      update: {},
      create: {
        email: 'vikram.patel@uni.com',
        firstName: 'Vikram',
        lastName: 'Patel',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH005',
        departmentId: meDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'anjali.gupta@uni.com' },
      update: {},
      create: {
        email: 'anjali.gupta@uni.com',
        firstName: 'Anjali',
        lastName: 'Gupta',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH006',
        departmentId: eceDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'neha.mishra@uni.com' },
      update: {},
      create: {
        email: 'neha.mishra@uni.com',
        firstName: 'Neha',
        lastName: 'Mishra',
        password: teacherPwd,
        role: 'TEACHER',
        teacherId: 'TCH007',
        departmentId: cseDept.id,
      },
    }),
  ])

  // Legacy teacher (backward compat)
  await prisma.user.upsert({
    where: { email: 'abheyjeet100@gmail.com' },
    update: { password: teacherPwd },
    create: {
      email: 'abheyjeet100@gmail.com',
      password: teacherPwd,
      role: 'TEACHER',
      teacherId: 'TCH100',
      departmentId: cseDept.id,
    },
  })
  console.log('✓ Seeded 7 teachers (+ 1 legacy)')

  // ── Students ───────────────────────────────────────────────────────────
  const [stu1, stu2, stu3pj, stu4, stu5, stu6, stu7, stu8, stu9] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'aseemkamra22@gmail.com' },
      update: { firstName: 'Aseem', lastName: 'Kamra', studentId: 'STU001' },
      create: {
        email: 'aseemkamra22@gmail.com',
        firstName: 'Aseem',
        lastName: 'Kamra',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU001',
        departmentId: cseDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'rohan.sharma@uni.com' },
      update: {},
      create: {
        email: 'rohan.sharma@uni.com',
        firstName: 'Rohan',
        lastName: 'Sharma',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU002',
        departmentId: cseDept.id,
      },
    }),
    // STU003 is reserved for legacy aseem.kamra@uni.com; using STU010
    prisma.user.upsert({
      where: { email: 'priya.jain@uni.com' },
      update: {},
      create: {
        email: 'priya.jain@uni.com',
        firstName: 'Priya',
        lastName: 'Jain',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU010',
        departmentId: cseDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'kavya.nair@uni.com' },
      update: {},
      create: {
        email: 'kavya.nair@uni.com',
        firstName: 'Kavya',
        lastName: 'Nair',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU004',
        departmentId: eceDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'aditya.verma@uni.com' },
      update: {},
      create: {
        email: 'aditya.verma@uni.com',
        firstName: 'Aditya',
        lastName: 'Verma',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU005',
        departmentId: eceDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'disha.mehta@uni.com' },
      update: {},
      create: {
        email: 'disha.mehta@uni.com',
        firstName: 'Disha',
        lastName: 'Mehta',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU006',
        departmentId: meDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'arjun.mishra@uni.com' },
      update: {},
      create: {
        email: 'arjun.mishra@uni.com',
        firstName: 'Arjun',
        lastName: 'Mishra',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU007',
        departmentId: meDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'zara.khan@uni.com' },
      update: {},
      create: {
        email: 'zara.khan@uni.com',
        firstName: 'Zara',
        lastName: 'Khan',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU008',
        departmentId: cseDept.id,
      },
    }),
    prisma.user.upsert({
      where: { email: 'tanvi.singh@uni.com' },
      update: {},
      create: {
        email: 'tanvi.singh@uni.com',
        firstName: 'Tanvi',
        lastName: 'Singh',
        password: studentPwd,
        role: 'STUDENT',
        studentId: 'STU009',
        departmentId: cseDept.id,
      },
    }),
  ])

  // Legacy student (STU003)
  await prisma.user.upsert({
    where: { studentId: 'STU003' },
    update: {},
    create: {
      email: 'aseem.kamra@uni.com',
      password: studentPwd,
      role: 'STUDENT',
      studentId: 'STU003',
      departmentId: cseDept.id,
    },
  })
  console.log('✓ Seeded 9 students (+ 1 legacy)')

  // ── Courses ────────────────────────────────────────────────────────────
  const [cse210, cse320, cse340, cse410, cse420, ece210, ece320, ece410, me210] =
    await Promise.all([
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
      prisma.course.upsert({
        where: { code: 'CSE410' },
        update: {},
        create: { name: 'Machine Learning Basics', code: 'CSE410', type: 'ELECTIVE', credits: 3, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'CSE420' },
        update: {},
        create: { name: 'Cloud Computing', code: 'CSE420', type: 'ELECTIVE', credits: 3, departmentId: cseDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE210' },
        update: {},
        create: { name: 'Circuit Analysis', code: 'ECE210', type: 'MANDATORY', credits: 4, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE320' },
        update: {},
        create: { name: 'Digital Systems', code: 'ECE320', type: 'MANDATORY', credits: 3, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ECE410' },
        update: {},
        create: { name: 'Signal Processing', code: 'ECE410', type: 'ELECTIVE', credits: 3, departmentId: eceDept.id },
      }),
      prisma.course.upsert({
        where: { code: 'ME210' },
        update: {},
        create: { name: 'Mechanics of Materials', code: 'ME210', type: 'MANDATORY', credits: 4, departmentId: meDept.id },
      }),
    ])
  console.log('✓ Seeded 9 courses (5 CSE, 3 ECE, 1 ME)')

  // ── CourseTeacher assignments ───────────────────────────────────────────
  const ctPairs = [
    { courseId: cse210.id, userId: tch1.id },
    { courseId: cse210.id, userId: tch2.id },
    { courseId: cse320.id, userId: tch1.id },
    { courseId: cse340.id, userId: tch1.id },
    { courseId: cse340.id, userId: tch4.id },
    { courseId: cse410.id, userId: tch2.id },
    { courseId: cse420.id, userId: tch2.id },
    { courseId: ece210.id, userId: tch3.id },
    { courseId: ece320.id, userId: tch3.id },
    { courseId: ece410.id, userId: tch6.id },
    { courseId: me210.id, userId: tch5.id },
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
  console.log('✓ Seeded 11 course-teacher assignments')

  // ── Enrollments ────────────────────────────────────────────────────────
  const enrollDefs = [
    { userId: stu1.id, courseId: cse210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu1.id, courseId: cse320.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu1.id, courseId: cse340.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu1.id, courseId: cse410.id, enrolledAt: new Date('2026-01-20') },
    { userId: stu1.id, courseId: cse420.id, enrolledAt: new Date('2026-01-20') },
    { userId: stu2.id, courseId: cse210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu2.id, courseId: cse320.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu2.id, courseId: cse340.id, enrolledAt: new Date('2026-01-20') },
    { userId: stu3pj.id, courseId: cse210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu3pj.id, courseId: cse410.id, enrolledAt: new Date('2026-01-20') },
    { userId: stu4.id, courseId: ece210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu4.id, courseId: ece320.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu4.id, courseId: ece410.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu5.id, courseId: ece210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu5.id, courseId: ece320.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu6.id, courseId: me210.id, enrolledAt: new Date('2026-01-20') },
    { userId: stu7.id, courseId: me210.id, enrolledAt: new Date('2026-01-15') },
    { userId: stu7.id, courseId: cse410.id, enrolledAt: new Date('2026-02-05') },
    { userId: stu8.id, courseId: cse210.id, enrolledAt: new Date('2026-01-20') },
  ]

  const enrollMap = {}
  for (const def of enrollDefs) {
    const enr = await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: def.userId, courseId: def.courseId } },
      update: {},
      create: { userId: def.userId, courseId: def.courseId, enrolledAt: def.enrolledAt },
    })
    enrollMap[`${def.userId}-${def.courseId}`] = enr
  }
  const E = (uid, cid) => enrollMap[`${uid}-${cid}`]
  console.log('✓ Seeded 19 enrollments')

  // ── Attendance ─────────────────────────────────────────────────────────
  const dates = [
    new Date('2026-02-10'),
    new Date('2026-02-17'),
    new Date('2026-02-24'),
    new Date('2026-03-03'),
    new Date('2026-03-10'),
    new Date('2026-03-17'),
    new Date('2026-03-24'),
  ]

  // Aseem 95% — 5 courses × 7 = 35, ~2 absent total
  await seedAttendance(E(stu1.id, cse210.id).id, dates, [2])
  await seedAttendance(E(stu1.id, cse320.id).id, dates, [5])
  await seedAttendance(E(stu1.id, cse340.id).id, dates, [])
  await seedAttendance(E(stu1.id, cse410.id).id, dates, [])
  await seedAttendance(E(stu1.id, cse420.id).id, dates, [])

  // Rohan 85% — 3 courses × 7 = 21, ~3 absent
  await seedAttendance(E(stu2.id, cse210.id).id, dates, [1, 4])
  await seedAttendance(E(stu2.id, cse320.id).id, dates, [3])
  await seedAttendance(E(stu2.id, cse340.id).id, dates, [])

  // Priya Jain 90% — 2 courses × 7 = 14, ~1 absent
  await seedAttendance(E(stu3pj.id, cse210.id).id, dates, [6])
  await seedAttendance(E(stu3pj.id, cse410.id).id, dates, [])

  // Kavya 100% — all present
  await seedAttendance(E(stu4.id, ece210.id).id, dates, [])
  await seedAttendance(E(stu4.id, ece320.id).id, dates, [])
  await seedAttendance(E(stu4.id, ece410.id).id, dates, [])

  // Aditya 60% — 2 courses × 7 = 14, ~6 absent
  await seedAttendance(E(stu5.id, ece210.id).id, dates, [0, 2, 4, 6])
  await seedAttendance(E(stu5.id, ece320.id).id, dates, [1, 3])

  // Disha 75% — 1 course × 7 = 7, ~2 absent
  await seedAttendance(E(stu6.id, me210.id).id, dates, [2, 5])

  // Arjun 88% — 2 courses × 7 = 14, ~2 absent
  await seedAttendance(E(stu7.id, me210.id).id, dates, [3])
  await seedAttendance(E(stu7.id, cse410.id).id, dates, [6])

  // Zara 92% — 1 course × 7 = 7, ~1 absent
  await seedAttendance(E(stu8.id, cse210.id).id, dates, [4])

  console.log('✓ Seeded 133 attendance records')

  // ── Grades ─────────────────────────────────────────────────────────────
  const aseemGrades = [
    { courseId: cse210.id, scores: [85, 87, 90] },
    { courseId: cse320.id, scores: [88, 89, 92] },
    { courseId: cse340.id, scores: [80, 82, 85] },
    { courseId: cse410.id, scores: [78, 80, 83] },
    { courseId: cse420.id, scores: [82, 84, 87] },
  ]
  for (const { courseId, scores } of aseemGrades) {
    const enr = E(stu1.id, courseId)
    await upsertGrade(enr.id, 'INTERNAL', scores[0])
    await upsertGrade(enr.id, 'MID_TERM', scores[1])
    await upsertGrade(enr.id, 'FINAL', scores[2])
  }

  const rohanGrades = [
    { courseId: cse210.id, scores: [72, 74, 76] },
    { courseId: cse320.id, scores: [68, 70, 72] },
    { courseId: cse340.id, scores: [75, 77, 79] },
  ]
  for (const { courseId, scores } of rohanGrades) {
    const enr = E(stu2.id, courseId)
    await upsertGrade(enr.id, 'INTERNAL', scores[0])
    await upsertGrade(enr.id, 'MID_TERM', scores[1])
    await upsertGrade(enr.id, 'FINAL', scores[2])
  }
  console.log('✓ Seeded 24 grade entries')

  // ── Timetable (28 entries, no teacher conflicts) ────────────────────────
  const S = '2026-EVEN'
  const ttEntries = [
    // CSE210 — tch1 MON/WED/THU, tch2 FRI
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'WED', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    { courseId: cse210.id, teacherId: tch1.id, dayOfWeek: 'THU', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    { courseId: cse210.id, teacherId: tch2.id, dayOfWeek: 'FRI', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-1', semester: S },
    // CSE320 — tch1 TUE/THU/FRI
    { courseId: cse320.id, teacherId: tch1.id, dayOfWeek: 'TUE', startTime: '11:00', endTime: '12:00', room: 'DB-Lab', semester: S },
    { courseId: cse320.id, teacherId: tch1.id, dayOfWeek: 'THU', startTime: '11:00', endTime: '12:00', room: 'DB-Lab', semester: S },
    { courseId: cse320.id, teacherId: tch1.id, dayOfWeek: 'FRI', startTime: '11:00', endTime: '12:00', room: 'DB-Lab', semester: S },
    // CSE340 — tch4 MON/FRI, tch1 WED
    { courseId: cse340.id, teacherId: tch4.id, dayOfWeek: 'MON', startTime: '14:00', endTime: '15:00', room: 'LAB-1', semester: S },
    { courseId: cse340.id, teacherId: tch1.id, dayOfWeek: 'WED', startTime: '14:00', endTime: '15:00', room: 'LAB-1', semester: S },
    { courseId: cse340.id, teacherId: tch4.id, dayOfWeek: 'FRI', startTime: '16:00', endTime: '17:00', room: 'LAB-1', semester: S },
    // CSE410 — tch2 MON/TUE/THU
    { courseId: cse410.id, teacherId: tch2.id, dayOfWeek: 'MON', startTime: '09:00', endTime: '10:00', room: 'CSE-LH-2', semester: S },
    { courseId: cse410.id, teacherId: tch2.id, dayOfWeek: 'TUE', startTime: '14:00', endTime: '15:00', room: 'CSE-LH-2', semester: S },
    { courseId: cse410.id, teacherId: tch2.id, dayOfWeek: 'THU', startTime: '14:00', endTime: '15:00', room: 'CSE-LH-2', semester: S },
    // CSE420 — tch2 MON/WED/FRI
    { courseId: cse420.id, teacherId: tch2.id, dayOfWeek: 'MON', startTime: '16:00', endTime: '17:00', room: 'CSE-LH-2', semester: S },
    { courseId: cse420.id, teacherId: tch2.id, dayOfWeek: 'WED', startTime: '11:00', endTime: '12:00', room: 'CSE-LH-2', semester: S },
    { courseId: cse420.id, teacherId: tch2.id, dayOfWeek: 'FRI', startTime: '16:00', endTime: '17:00', room: 'CSE-LH-2', semester: S },
    // ECE210 — tch3 TUE/WED/FRI
    { courseId: ece210.id, teacherId: tch3.id, dayOfWeek: 'TUE', startTime: '09:00', endTime: '10:00', room: 'ECE-101', semester: S },
    { courseId: ece210.id, teacherId: tch3.id, dayOfWeek: 'WED', startTime: '11:00', endTime: '12:00', room: 'ECE-101', semester: S },
    { courseId: ece210.id, teacherId: tch3.id, dayOfWeek: 'FRI', startTime: '11:00', endTime: '12:00', room: 'ECE-101', semester: S },
    // ECE320 — tch3 MON/WED/THU
    { courseId: ece320.id, teacherId: tch3.id, dayOfWeek: 'MON', startTime: '11:00', endTime: '12:00', room: 'ECE-201', semester: S },
    { courseId: ece320.id, teacherId: tch3.id, dayOfWeek: 'WED', startTime: '14:00', endTime: '15:00', room: 'ECE-201', semester: S },
    { courseId: ece320.id, teacherId: tch3.id, dayOfWeek: 'THU', startTime: '09:00', endTime: '10:00', room: 'ECE-201', semester: S },
    // ECE410 — tch6 TUE/WED/FRI
    { courseId: ece410.id, teacherId: tch6.id, dayOfWeek: 'TUE', startTime: '16:00', endTime: '17:00', room: 'ECE-201', semester: S },
    { courseId: ece410.id, teacherId: tch6.id, dayOfWeek: 'WED', startTime: '16:00', endTime: '17:00', room: 'ECE-201', semester: S },
    { courseId: ece410.id, teacherId: tch6.id, dayOfWeek: 'FRI', startTime: '14:00', endTime: '15:00', room: 'ECE-201', semester: S },
    // ME210 — tch5 MON/WED/FRI
    { courseId: me210.id, teacherId: tch5.id, dayOfWeek: 'MON', startTime: '14:00', endTime: '15:00', room: 'ME-Workshop', semester: S },
    { courseId: me210.id, teacherId: tch5.id, dayOfWeek: 'WED', startTime: '09:00', endTime: '10:00', room: 'ME-Workshop', semester: S },
    { courseId: me210.id, teacherId: tch5.id, dayOfWeek: 'FRI', startTime: '09:00', endTime: '10:00', room: 'ME-Workshop', semester: S },
  ]
  for (const entry of ttEntries) {
    await ensureTimetableEntry(entry)
  }
  console.log('✓ Seeded 28 timetable entries')

  // ── Announcements ──────────────────────────────────────────────────────
  const announcements = [
    {
      title: 'System Maintenance Notice',
      body: 'Scheduled database maintenance on 2026-03-15 from 10 PM to 12 AM IST. All services will be unavailable during this window. Plan accordingly.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    {
      title: 'Department Fee Settlement Deadline',
      body: 'All pending department fees must be cleared by 2026-03-10. Contact the accounts office for outstanding dues.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    {
      title: 'New Academic Policies — Read Carefully',
      body: 'Effective 2026-04-01: Updated attendance policy (minimum 80% threshold), revised grading rubric for INTERNAL components, and new late-submission penalties. Full document available at the admin portal.',
      targetRole: 'ADMIN',
      authorId: adminPav.id,
    },
    {
      title: 'Assessment Calendar — Spring 2026',
      body: 'INTERNAL exams: 2026-02-20 to 2026-02-24 | MID_TERM: 2026-03-10 to 2026-03-14 | FINAL: 2026-04-15 to 2026-04-28. Submit question papers one week in advance.',
      targetRole: 'TEACHER',
      authorId: tch1.id,
    },
    {
      title: 'Attendance Sync Required',
      body: 'Please upload attendance records for all your assigned courses by end of day every Friday. Incomplete records will be flagged for review.',
      targetRole: 'TEACHER',
      authorId: tch1.id,
    },
    {
      title: 'Grade Submission Deadline',
      body: 'INTERNAL grades due: 2026-02-28. MID_TERM grades due: 2026-03-24. FINAL grades due: 2026-05-05. Late submissions require HOD approval.',
      targetRole: 'TEACHER',
      authorId: tch1.id,
    },
    {
      title: 'Semester Registration Now Open',
      body: 'Online course registration for Spring 2026 is live until 2026-02-05. Log in to the portal and plan your schedule carefully. Elective seats are limited.',
      targetRole: 'STUDENT',
      authorId: adminPav.id,
    },
    {
      title: 'Attendance Warning System Active',
      body: 'If your cumulative attendance in any course falls below 80%, you will receive an automated warning. Students below 75% may be barred from appearing in finals.',
      targetRole: 'STUDENT',
      authorId: adminPav.id,
    },
    {
      title: 'Grade Publication Schedule',
      body: 'INTERNAL results: 2026-02-28 | MID_TERM results: 2026-03-24 | FINAL results: 2026-05-10. Raise grade disputes within 48 hours of publication.',
      targetRole: 'STUDENT',
      authorId: adminPav.id,
    },
    {
      title: 'Welcome to Spring 2026 Semester',
      body: 'All systems are now live for the Spring 2026 semester. Report any technical issues to support@uni.com. Academic calendar and timetable are available on the portal.',
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
    {
      title: 'Holiday Notice — No Classes on 2026-03-08',
      body: "International Women's Day (2026-03-08): The institution will remain closed. All classes, labs, and administrative offices are closed for the day.",
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
    {
      title: 'Campus Wi-Fi Upgrade — Scheduled Downtime',
      body: 'Campus Wi-Fi will be upgraded on 2026-03-22 (Sunday) from 6 AM to 2 PM. Plan offline study accordingly.',
      targetRole: 'ALL',
      authorId: adminPav.id,
    },
  ]
  for (const ann of announcements) {
    await ensureAnnouncement(ann)
  }
  console.log('✓ Seeded 12 announcements')

  console.log('\n─────────────────────────────────────────')
  console.log('✓ Seeded 3 departments')
  console.log('✓ Seeded 18 users (2 admin, 7 teachers, 9 students) + 2 legacy accounts')
  console.log('✓ Seeded 9 courses (5 CSE, 3 ECE, 1 ME)')
  console.log('✓ Seeded 11 course-teacher assignments')
  console.log('✓ Seeded 19 enrollments')
  console.log('✓ Seeded 133 attendance records')
  console.log('✓ Seeded 24 grade entries')
  console.log('✓ Seeded 28 timetable entries')
  console.log('✓ Seeded 12 announcements')
  console.log('─────────────────────────────────────────')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
