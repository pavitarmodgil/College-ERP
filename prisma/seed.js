const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')

const prisma = new PrismaClient()
const SALT_ROUNDS = 12

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

  console.log('Seeded: 1 dept, 4 users (pavitarmodgil001, TCH001, TCH002, STU003)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
