// GET /api/timetable/insights with the ML_RISK_ENABLED flag off and on (FUT-1).
// The flag is read per request, so each test sets it before calling.

const { test, before, after, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const { setup, tokenFor } = require('./helpers/testApp')

let ctx
const student = { id: 30, email: 'student@example.edu', role: 'STUDENT' }
const teacher = { id: 20, email: 'teacher@example.edu', role: 'TEACHER' }

const mlRisk = require(path.join(__dirname, '..', 'lib', 'mlRisk'))
const realLoadModel = mlRisk.loadModel

const attendance = (present, total) =>
  Array.from({ length: total }, (_, i) => ({ present: i < present }))

const ENROLLMENTS = [
  {
    // 16/17 = 94.12%, INTERNAL 75, MID_TERM 78: notebook section 23 gives 0.047
    course: { id: 1, name: 'Operating Systems', code: 'CSE210', type: 'MANDATORY', department: { code: 'CSE' } },
    attendance: attendance(16, 17),
    grades: [
      { component: 'INTERNAL', marks: 75, letterGrade: 'A+' },
      { component: 'MID_TERM', marks: 78, letterGrade: 'A+' },
    ],
  },
  {
    // No MID_TERM yet: the model must not guess
    course: { id: 2, name: 'Databases', code: 'CSE320', type: 'MANDATORY', department: { code: 'CSE' } },
    attendance: attendance(9, 10),
    grades: [{ component: 'INTERNAL', marks: 68, letterGrade: 'A' }],
  },
]

before(async () => { ctx = await setup() })
after(() => ctx.close())

beforeEach(() => {
  ctx.prisma.enrollment.findMany = async ({ where }) => (where.userId === student.id ? ENROLLMENTS : [])
  ctx.prisma.assessment.findMany = async () => []
})

afterEach(() => {
  delete process.env.ML_RISK_ENABLED
  mlRisk.loadModel = realLoadModel
})

const getInsights = (user = student) =>
  ctx.request('GET', '/api/timetable/insights', { token: tokenFor(user) })

test('flag unset: response is the rule-based shape with no ML fields', async () => {
  const res = await getInsights()
  assert.equal(res.status, 200)
  assert.equal(res.body.mlRisk, undefined)
  assert.equal(res.body.courses.length, 2)
  for (const c of res.body.courses) {
    assert.equal(c.mlRisk, undefined)
    assert.ok(c.attendance.riskLevel)
  }
})

test('flag "false": still off', async () => {
  process.env.ML_RISK_ENABLED = 'false'
  const res = await getInsights()
  assert.equal(res.status, 200)
  assert.equal(res.body.mlRisk, undefined)
  assert.equal(res.body.courses[0].mlRisk, undefined)
})

test('flag on: each course carries an ML estimate next to the rule-based band', async () => {
  process.env.ML_RISK_ENABLED = 'true'
  const res = await getInsights()
  assert.equal(res.status, 200)

  assert.equal(res.body.mlRisk.enabled, true)
  assert.equal(res.body.mlRisk.available, true)
  assert.match(res.body.mlRisk.disclaimer, /not a grade/)

  const [os, db] = res.body.courses
  assert.equal(os.attendance.riskLevel, 'SAFE')       // rule-based band unchanged
  assert.equal(os.mlRisk.status, 'OK')
  assert.equal(os.mlRisk.probability, 0.047)
  assert.equal(os.mlRisk.band, 'LOW')
  assert.equal(os.mlRisk.finalGraded, false)
  assert.ok(os.mlRisk.factors.length > 0 && os.mlRisk.factors.length <= 3)

  assert.deepEqual(db.mlRisk, { status: 'INSUFFICIENT_DATA', missing: ['MID_TERM marks'] })
})

test('flag on, model fails to load: dashboard still gets rule-based insights', async () => {
  process.env.ML_RISK_ENABLED = 'true'
  mlRisk.loadModel = () => { throw new Error('ENOENT atRiskModel.json') }
  const res = await getInsights()
  assert.equal(res.status, 200)
  assert.equal(res.body.mlRisk.available, false)
  for (const c of res.body.courses) {
    assert.deepEqual(c.mlRisk, { status: 'UNAVAILABLE' })
    assert.ok(c.attendance.riskLevel)
    assert.ok('projectedGrade' in c.grade)
  }
})

test('flag on, bad data for one course: only that course is UNAVAILABLE', async () => {
  process.env.ML_RISK_ENABLED = 'true'
  ctx.prisma.enrollment.findMany = async () => [
    { ...ENROLLMENTS[0], grades: [{ component: 'INTERNAL', marks: 140, letterGrade: 'O' }, { component: 'MID_TERM', marks: 78, letterGrade: 'A+' }] },
    { ...ENROLLMENTS[0], course: { ...ENROLLMENTS[0].course, id: 3, code: 'CSE340' } },
  ]
  const res = await getInsights()
  assert.equal(res.status, 200)
  assert.deepEqual(res.body.courses[0].mlRisk, { status: 'UNAVAILABLE' })
  assert.equal(res.body.courses[1].mlRisk.status, 'OK')
})

test('flag on: insights stay student-only', async () => {
  process.env.ML_RISK_ENABLED = 'true'
  const res = await getInsights(teacher)
  assert.equal(res.status, 403)
})
