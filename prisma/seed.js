// ─────────────────────────────────────────────────────────────
//  prisma/seed.js
//  Initial seed: CSE department + 4 users (admin, 2 teachers, 1 student)
//
//  Run: npx prisma db seed
//  Safe to re-run — uses upsert so existing rows are updated, not duplicated.
// ─────────────────────────────────────────────────────────────

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcrypt");

const prisma = new PrismaClient();
const SALT_ROUNDS = 12; // project convention

async function main() {
  console.log("🌱  Seeding database...\n");

  // ── 1. Department ──────────────────────────────────────────
  const cse = await prisma.department.upsert({
    where:  { code: "CSE" },
    update: {},
    create: { name: "Computer Science & Engineering", code: "CSE" },
  });
  console.log(`[DEPT]    ${cse.name} (id: ${cse.id})`);

  // ── 2. Admin ───────────────────────────────────────────────
  // Admin has no department, no studentId/teacherId
  const adminPassword = await bcrypt.hash("admin123", SALT_ROUNDS);
  const admin = await prisma.user.upsert({
    where:  { email: "admin@uni.com" },
    update: {},
    create: {
      email:             "admin@uni.com",
      password:          adminPassword,
      role:              "ADMIN",
      mustResetPassword: false,
      isActive:          true,
    },
  });
  console.log(`[ADMIN]   ${admin.email} (id: ${admin.id})`);

  // ── 3. Teacher — Dr. Aman Kumar ────────────────────────────
  const amanPassword = await bcrypt.hash("aman1234", SALT_ROUNDS);
  const aman = await prisma.user.upsert({
    where:  { email: "amankumar@gmail.com" },
    update: {},
    create: {
      email:             "amankumar@gmail.com",
      password:          amanPassword,
      role:              "TEACHER",
      teacherId:         "TCH001",
      departmentId:      cse.id,
      mustResetPassword: false,
      isActive:          true,
    },
  });
  console.log(`[TEACHER] ${aman.email} — ${aman.teacherId} (id: ${aman.id})`);

  // ── 4. Teacher — Harveen Kaur (must reset password) ────────
  const harveenPassword = await bcrypt.hash("harveen123", SALT_ROUNDS);
  const harveen = await prisma.user.upsert({
    where:  { email: "harveen@gmail.com" },
    update: {},
    create: {
      email:             "harveen@gmail.com",
      password:          harveenPassword,
      role:              "TEACHER",
      teacherId:         "TCH002",
      departmentId:      cse.id,
      mustResetPassword: true,  // first login — must reset
      isActive:          true,
    },
  });
  console.log(`[TEACHER] ${harveen.email} — ${harveen.teacherId} (mustResetPassword: true)`);

  // ── 5. Student — Aseem Kamra ───────────────────────────────
  const aseemPassword = await bcrypt.hash("aseem1234", SALT_ROUNDS);
  const aseem = await prisma.user.upsert({
    where:  { email: "aseem@gmail.com" },
    update: {},
    create: {
      email:             "aseem@gmail.com",
      password:          aseemPassword,
      role:              "STUDENT",
      studentId:         "STU003",
      departmentId:      cse.id,
      mustResetPassword: false,
      isActive:          true,
    },
  });
  console.log(`[STUDENT] ${aseem.email} — ${aseem.studentId} (id: ${aseem.id})`);

  console.log("\n✅  Seed complete.");
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
