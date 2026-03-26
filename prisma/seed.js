const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()
const SALT = 12

async function main() {

  // ── Departments ────────────────────────────────────────────
  const cse = await prisma.department.upsert({
    where: { code: 'CSE' },
    update: {},
    create: { name: 'Computer Science & Engineering', code: 'CSE' },
  })
  const ece = await prisma.department.upsert({
    where: { code: 'ECE' },
    update: {},
    create: { name: 'Electronics & Communication Engineering', code: 'ECE' },
  })
  const mba = await prisma.department.upsert({
    where: { code: 'MBA' },
    update: {},
    create: { name: 'Master of Business Administration', code: 'MBA' },
  })

  console.log('✅ Departments: CSE, ECE, MBA')

  // ── Admin ──────────────────────────────────────────────────
  await prisma.user.upsert({
    where: { email: 'admin@uni.com' },
    update: {},
    create: {
      email: 'admin@uni.com',
      firstName: 'Pavitar', lastName: 'Modgil', title: 'Mr',
      password: await bcrypt.hash('admin123', SALT),
      role: 'ADMIN',
    },
  })

  // ── Teachers ───────────────────────────────────────────────
  const teacherData = [
    { email: 'aman.kumar@uni.com',     firstName: 'Aman',    lastName: 'Kumar',    title: 'Dr',   teacherId: 'TCH001', deptId: cse.id },
    { email: 'harveen.kaur@uni.com',   firstName: 'Harveen', lastName: 'Kaur',     title: 'Ms',   teacherId: 'TCH002', deptId: cse.id, mustReset: true },
    { email: 'rajesh.sharma@uni.com',  firstName: 'Rajesh',  lastName: 'Sharma',   title: 'Prof', teacherId: 'TCH003', deptId: cse.id },
    { email: 'priya.nair@uni.com',     firstName: 'Priya',   lastName: 'Nair',     title: 'Dr',   teacherId: 'TCH004', deptId: cse.id },
    { email: 'suresh.menon@uni.com',   firstName: 'Suresh',  lastName: 'Menon',    title: 'Dr',   teacherId: 'TCH005', deptId: ece.id },
    { email: 'anita.verma@uni.com',    firstName: 'Anita',   lastName: 'Verma',    title: 'Mrs',  teacherId: 'TCH006', deptId: ece.id },
    { email: 'vikram.das@uni.com',     firstName: 'Vikram',  lastName: 'Das',      title: 'Prof', teacherId: 'TCH007', deptId: ece.id },
    { email: 'meera.pillai@uni.com',   firstName: 'Meera',   lastName: 'Pillai',   title: 'Dr',   teacherId: 'TCH008', deptId: mba.id },
    { email: 'rohan.gupta@uni.com',    firstName: 'Rohan',   lastName: 'Gupta',    title: 'Mr',   teacherId: 'TCH009', deptId: mba.id },
    { email: 'shalini.reddy@uni.com',  firstName: 'Shalini', lastName: 'Reddy',    title: 'Dr',   teacherId: 'TCH010', deptId: mba.id },
    { email: 'arun.mehta@uni.com',     firstName: 'Arun',    lastName: 'Mehta',    title: 'Prof', teacherId: 'TCH011', deptId: cse.id },
    { email: 'divya.krishnan@uni.com', firstName: 'Divya',   lastName: 'Krishnan', title: 'Ms',   teacherId: 'TCH012', deptId: ece.id },
  ]

  const teachers = {}
  for (const t of teacherData) {
    const teacher = await prisma.user.upsert({
      where: { teacherId: t.teacherId },
      update: {},
      create: {
        email: t.email,
        firstName: t.firstName, lastName: t.lastName, title: t.title,
        password: await bcrypt.hash('teacher123', SALT),
        role: 'TEACHER',
        teacherId: t.teacherId,
        departmentId: t.deptId,
        mustResetPassword: t.mustReset || false,
      },
    })
    teachers[t.teacherId] = teacher
  }
  console.log('✅ Teachers: TCH001–TCH012')

  // ── Students ───────────────────────────────────────────────
  const firstNames = [
    'Aseem','Priya','Rahul','Neha','Arjun','Simran','Karan','Pooja','Aditya','Meghna',
    'Rohan','Anjali','Vivek','Deepika','Saurabh','Tanya','Manish','Riya','Gaurav','Ishita',
    'Nikhil','Shreya','Akash','Kavya','Yash','Nisha','Harsh','Divya','Aayush','Kritika',
    'Piyush','Sonam','Varun','Pallavi','Akhil','Swati','Ankit','Roshni','Shivam','Sneha',
    'Mohit','Tanvi','Rajat','Kirti','Abhinav','Aparna','Vikash','Smriti','Tarun','Bhavna',
  ]
  const lastNames = [
    'Kamra','Singh','Sharma','Gupta','Verma','Nair','Reddy','Patel','Das','Mehta',
    'Joshi','Kumar','Pillai','Chauhan','Malhotra','Bose','Khanna','Saxena','Iyer','Chopra',
    'Rao','Mishra','Agarwal','Sinha','Pandey','Bajaj','Kapoor','Tiwari','Choudhary','Shah',
  ]
  const deptPool = [cse.id, cse.id, cse.id, ece.id, ece.id, mba.id]

  const students = []
  for (let i = 1; i <= 50; i++) {
    const firstName = firstNames[i - 1] || `Student${i}`
    const lastName  = lastNames[i % lastNames.length]
    const studentId = `STU${String(i).padStart(3, '0')}`
    const deptId    = deptPool[i % deptPool.length]
    const email     = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@uni.com`

    const student = await prisma.user.upsert({
      where: { studentId },
      update: {},
      create: {
        email,
        firstName, lastName,
        title: i % 5 === 0 ? 'Ms' : i % 3 === 0 ? 'Mr' : null,
        password: await bcrypt.hash('student123', SALT),
        role: 'STUDENT',
        studentId,
        departmentId: deptId,
      },
    })
    students.push(student)
  }
  console.log('✅ Students: STU001–STU050')

  // ── Courses ────────────────────────────────────────────────
  const courseData = [
    { name: 'Data Structures & Algorithms',  code: 'CS301', type: 'MANDATORY', credits: 4, deptId: cse.id, teacherIds: ['TCH001', 'TCH003'] },
    { name: 'Database Management Systems',   code: 'CS302', type: 'MANDATORY', credits: 4, deptId: cse.id, teacherIds: ['TCH004'] },
    { name: 'Operating Systems',             code: 'CS303', type: 'MANDATORY', credits: 3, deptId: cse.id, teacherIds: ['TCH001'] },
    { name: 'Machine Learning Fundamentals', code: 'CS401', type: 'ELECTIVE',  credits: 3, deptId: cse.id, teacherIds: ['TCH011'] },
    { name: 'Computer Networks',             code: 'CS304', type: 'MANDATORY', credits: 3, deptId: cse.id, teacherIds: ['TCH003'] },
    { name: 'Digital Signal Processing',     code: 'EC301', type: 'MANDATORY', credits: 4, deptId: ece.id, teacherIds: ['TCH005'] },
    { name: 'VLSI Design',                   code: 'EC302', type: 'ELECTIVE',  credits: 3, deptId: ece.id, teacherIds: ['TCH006', 'TCH012'] },
    { name: 'Embedded Systems',              code: 'EC401', type: 'MANDATORY', credits: 4, deptId: ece.id, teacherIds: ['TCH007'] },
    { name: 'Marketing Management',          code: 'MB301', type: 'MANDATORY', credits: 3, deptId: mba.id, teacherIds: ['TCH008'] },
    { name: 'Financial Accounting',          code: 'MB302', type: 'MANDATORY', credits: 3, deptId: mba.id, teacherIds: ['TCH009', 'TCH010'] },
  ]

  const courses = {}
  for (const c of courseData) {
    const course = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: {
        name: c.name, code: c.code,
        type: c.type, credits: c.credits,
        departmentId: c.deptId,
      },
    })
    courses[c.code] = course

    for (const tId of c.teacherIds) {
      const teacher = teachers[tId]
      if (!teacher) continue
      await prisma.courseTeacher.upsert({
        where: { courseId_userId: { courseId: course.id, userId: teacher.id } },
        update: {},
        create: { courseId: course.id, userId: teacher.id },
      })
    }
  }
  console.log('✅ Courses: 10 courses with teachers assigned')

  // ── Enrollments ────────────────────────────────────────────
  const enrollments = {}

  for (const student of students) {
    let targetCodes = []
    if (student.departmentId === cse.id) targetCodes = ['CS301','CS302','CS303','CS304']
    else if (student.departmentId === ece.id) targetCodes = ['EC301','EC302','EC401']
    else targetCodes = ['MB301','MB302']

    const idx = students.indexOf(student)
    if (idx % 5 === 0) targetCodes.push('CS401')

    for (const code of targetCodes) {
      const course = courses[code]
      if (!course) continue
      const existing = await prisma.enrollment.findUnique({
        where: { userId_courseId: { userId: student.id, courseId: course.id } },
      })
      if (existing) {
        enrollments[`${student.id}-${course.id}`] = existing
        continue
      }
      const enrollment = await prisma.enrollment.create({
        data: { userId: student.id, courseId: course.id },
      })
      enrollments[`${student.id}-${course.id}`] = enrollment
    }
  }
  console.log(`✅ Enrollments: ${Object.keys(enrollments).length} student-course pairs`)

  // ── Attendance (20 sessions per enrollment) ────────────────
  let attendanceCount = 0
  for (const enrollment of Object.values(enrollments)) {
    for (let day = 1; day <= 20; day++) {
      const date = new Date(Date.UTC(2024, 6, day))
      const present = Math.random() > 0.2
      await prisma.attendance.upsert({
        where: { enrollmentId_date: { enrollmentId: enrollment.id, date } },
        update: {},
        create: { enrollmentId: enrollment.id, date, present },
      })
      attendanceCount++
    }
  }
  console.log(`✅ Attendance: ${attendanceCount} records`)

  // ── Grades ─────────────────────────────────────────────────
  function letterGrade(marks) {
    if (marks >= 80) return 'O'
    if (marks >= 70) return 'A+'
    if (marks >= 65) return 'A'
    if (marks >= 61) return 'B+'
    if (marks >= 50) return 'B'
    if (marks >= 40) return 'C'
    if (marks >= 35) return 'P'
    return 'F'
  }

  let gradeCount = 0
  for (const enrollment of Object.values(enrollments)) {
    for (const component of ['INTERNAL', 'MID_TERM', 'FINAL']) {
      if (component === 'FINAL' && Math.random() < 0.15) continue
      const marks = Math.round(45 + Math.random() * 50)
      await prisma.grade.upsert({
        where: { enrollmentId_component: { enrollmentId: enrollment.id, component } },
        update: {},
        create: { enrollmentId: enrollment.id, component, marks, letterGrade: letterGrade(marks) },
      })
      gradeCount++
    }
  }
  console.log(`✅ Grades: ${gradeCount} grade records`)

  // ── Timetable Entries ──────────────────────────────────────
  const timetableEntries = [
    { code: 'CS301', teacherId: 'TCH001', day: 'MON', start: '09:00', end: '10:00', room: 'Room 301' },
    { code: 'CS301', teacherId: 'TCH001', day: 'WED', start: '09:00', end: '10:00', room: 'Room 301' },
    { code: 'CS301', teacherId: 'TCH001', day: 'FRI', start: '09:00', end: '10:00', room: 'Room 301' },
    { code: 'CS302', teacherId: 'TCH004', day: 'TUE', start: '10:00', end: '11:00', room: 'Room 204' },
    { code: 'CS302', teacherId: 'TCH004', day: 'THU', start: '10:00', end: '11:00', room: 'Room 204' },
    { code: 'CS303', teacherId: 'TCH001', day: 'MON', start: '11:00', end: '12:00', room: 'Room 305' },
    { code: 'CS303', teacherId: 'TCH001', day: 'WED', start: '11:00', end: '12:00', room: 'Room 305' },
    { code: 'CS304', teacherId: 'TCH003', day: 'TUE', start: '14:00', end: '15:00', room: 'Room 102' },
    { code: 'CS401', teacherId: 'TCH011', day: 'FRI', start: '14:00', end: '15:00', room: 'Lab 1' },
    { code: 'EC301', teacherId: 'TCH005', day: 'MON', start: '09:00', end: '10:00', room: 'Room 401' },
    { code: 'EC301', teacherId: 'TCH005', day: 'WED', start: '09:00', end: '10:00', room: 'Room 401' },
    { code: 'EC302', teacherId: 'TCH006', day: 'TUE', start: '11:00', end: '12:00', room: 'Lab 2' },
    { code: 'EC401', teacherId: 'TCH007', day: 'THU', start: '09:00', end: '10:00', room: 'Room 403' },
    { code: 'EC401', teacherId: 'TCH007', day: 'FRI', start: '09:00', end: '10:00', room: 'Room 403' },
    { code: 'MB301', teacherId: 'TCH008', day: 'MON', start: '14:00', end: '15:00', room: 'Room 501' },
    { code: 'MB301', teacherId: 'TCH008', day: 'WED', start: '14:00', end: '15:00', room: 'Room 501' },
    { code: 'MB302', teacherId: 'TCH009', day: 'TUE', start: '09:00', end: '10:00', room: 'Room 502' },
    { code: 'MB302', teacherId: 'TCH009', day: 'THU', start: '09:00', end: '10:00', room: 'Room 502' },
  ]

  for (const entry of timetableEntries) {
    const course = courses[entry.code]
    const teacher = teachers[entry.teacherId]
    if (!course || !teacher) continue
    await prisma.timetableEntry.create({
      data: {
        courseId: course.id,
        teacherId: teacher.id,
        dayOfWeek: entry.day,
        startTime: entry.start,
        endTime: entry.end,
        room: entry.room,
        semester: '2024-ODD',
      },
    })
  }
  console.log('✅ Timetable: 18 entries for 2024-ODD semester')

  console.log('\n🎓 Seed complete!')
  console.log('Admin:    admin@uni.com / admin123')
  console.log('Teachers: aman.kumar@uni.com / teacher123 (TCH001)')
  console.log('Students: aseem.kamra@uni.com / student123 (STU001)')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
