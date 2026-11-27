// CRIT-5 (attendance writes scoped to the teacher's course) and
// CRIT-7 (course rosters visible only to admins and the course's teachers).

const { test, before, after, beforeEach } = require('node:test')
const assert = require('node:assert/strict')
const { setup, tokenFor } = require('./helpers/testApp')

let ctx
const teacher = { id: 20, email: 'teacher@example.edu', role: 'TEACHER' }
const otherTeacher = { id: 21, email: 'other.teacher@example.edu', role: 'TEACHER' }
const student = { id: 30, email: 'student@example.edu', role: 'STUDENT' }
const admin = { id: 1, email: 'admin@example.edu', role: 'ADMIN' }

const COURSE_ID = 5
const COURSE_ENROLLMENTS = [{ id: 100 }, { id: 101 }]

before(async () => { ctx = await setup() })
after(() => ctx.close())

beforeEach(() => {
  ctx.prisma.courseTeacher.findUnique = async ({ where }) =>
    where.courseId_userId.userId === teacher.id && where.courseId_userId.courseId === COURSE_ID
      ? { id: 1, courseId: COURSE_ID, userId: teacher.id }
      : null
  ctx.prisma.enrollment.findMany = async ({ where }) =>
    where.courseId === COURSE_ID ? COURSE_ENROLLMENTS : []
  ctx.prisma.attendance.upsert = async () => { throw new Error('attendance.upsert should not be called') }
})

// ── Attendance ────────────────────────────────────────────────────────────

test('attendance: enrollment from another course is rejected and nothing is written', async () => {
  const res = await ctx.request('POST', `/api/attendance/${COURSE_ID}/session`, {
    token: tokenFor(teacher),
    body: { students: [{ enrollmentId: 100, present: true }, { enrollmentId: 999, present: false }] },
  })
  assert.equal(res.status, 400)
  assert.match(res.body.error, /999/)
})

test('attendance: teacher not assigned to the course gets 403', async () => {
  const res = await ctx.request('POST', `/api/attendance/${COURSE_ID}/session`, {
    token: tokenFor(otherTeacher),
    body: { students: [{ enrollmentId: 100, present: true }] },
  })
  assert.equal(res.status, 403)
})

test('attendance: malformed and duplicate enrollment ids are rejected', async () => {
  for (const students of [
    [{ enrollmentId: 'abc', present: true }],
    [{ present: true }],
    [{ enrollmentId: 100, present: true }, { enrollmentId: 100, present: false }],
  ]) {
    const res = await ctx.request('POST', `/api/attendance/${COURSE_ID}/session`, {
      token: tokenFor(teacher),
      body: { students },
    })
    assert.equal(res.status, 400, `expected 400 for ${JSON.stringify(students)}`)
  }
})

test('attendance: valid session for own course is saved in one transaction', async () => {
  const upserted = []
  ctx.prisma.attendance.upsert = (args) => { upserted.push(args); return Promise.resolve(args) }
  let transactionSize = null
  ctx.prisma.$transaction = async (ops) => { transactionSize = ops.length; return Promise.all(ops) }

  const res = await ctx.request('POST', `/api/attendance/${COURSE_ID}/session`, {
    token: tokenFor(teacher),
    body: { students: [{ enrollmentId: 100, present: true }, { enrollmentId: 101, present: false }] },
  })

  assert.equal(res.status, 200)
  assert.equal(transactionSize, 2)
  assert.deepEqual(upserted.map((u) => u.create.enrollmentId), [100, 101])
  assert.equal(res.body.presentCount, 1)
  assert.equal(res.body.absentCount, 1)
})

// ── Course detail ─────────────────────────────────────────────────────────

function stubCourseLookup({ isActive = true } = {}) {
  const calls = []
  ctx.prisma.course.findUnique = async (args) => {
    calls.push(args)
    const course = {
      id: COURSE_ID, name: 'Data Structures', code: 'CSE210', isActive,
      department: { name: 'CSE', code: 'CSE' }, teachers: [], _count: { enrollments: 2 },
    }
    if (args.include.enrollments) {
      course.enrollments = [{ id: 100, user: { id: 30, email: 'student@example.edu', studentId: 'STU030' } }]
    }
    return course
  }
  return calls
}

test('course detail: student gets no roster', async () => {
  stubCourseLookup()
  const res = await ctx.request('GET', `/api/courses/${COURSE_ID}`, { token: tokenFor(student) })
  assert.equal(res.status, 200)
  assert.equal(res.body.enrollments, undefined)
  assert.equal(res.body._count.enrollments, 2)
})

test('course detail: teacher of a different course gets no roster', async () => {
  stubCourseLookup()
  const res = await ctx.request('GET', `/api/courses/${COURSE_ID}`, { token: tokenFor(otherTeacher) })
  assert.equal(res.status, 200)
  assert.equal(res.body.enrollments, undefined)
})

test('course detail: assigned teacher and admin get the roster', async () => {
  for (const user of [teacher, admin]) {
    stubCourseLookup()
    const res = await ctx.request('GET', `/api/courses/${COURSE_ID}`, { token: tokenFor(user) })
    assert.equal(res.status, 200)
    assert.equal(res.body.enrollments.length, 1, `${user.role} should see the roster`)
  }
})

test('course detail: student cannot open an inactive course they are not enrolled in', async () => {
  stubCourseLookup({ isActive: false })
  ctx.prisma.enrollment.findUnique = async () => null
  const res = await ctx.request('GET', `/api/courses/${COURSE_ID}`, { token: tokenFor(student) })
  assert.equal(res.status, 404)
})

test('course detail: non-numeric id is a 404, not a 500', async () => {
  const res = await ctx.request('GET', '/api/courses/abc', { token: tokenFor(admin) })
  assert.equal(res.status, 404)
})
