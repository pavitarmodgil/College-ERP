// Unit tests for the pure insight helpers. Run with `npm test` (node --test).
// These functions are DB-free; importing the module only instantiates a lazy
// PrismaClient, which never connects unless a query runs.

const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  getAttendanceRisk,
  timesOverlap,
  predictFinalGrade,
} = require('../timetableInsights')

// ---- getAttendanceRisk ----------------------------------------------------

test('getAttendanceRisk: >= 75% is SAFE with no classes needed', () => {
  const r = getAttendanceRisk(75, 100)
  assert.equal(r.riskLevel, 'SAFE')
  assert.equal(r.currentAttendance, 75)
  assert.equal(r.classesNeeded, 0)
})

test('getAttendanceRisk: 65-74% is WARNING', () => {
  assert.equal(getAttendanceRisk(74, 100).riskLevel, 'WARNING')
  assert.equal(getAttendanceRisk(65, 100).riskLevel, 'WARNING')
})

test('getAttendanceRisk: < 65% is CRITICAL', () => {
  assert.equal(getAttendanceRisk(64, 100).riskLevel, 'CRITICAL')
})

test('getAttendanceRisk: classesNeeded solves (a+x)/(t+x) >= 0.75', () => {
  // 74/100 -> need 4 (78/104 = 0.75)
  const r = getAttendanceRisk(74, 100)
  assert.equal(r.classesNeeded, 4)
  // verify the boundary actually clears 75%
  assert.ok((74 + r.classesNeeded) / (100 + r.classesNeeded) >= 0.75)
})

test('getAttendanceRisk: zero sessions is SAFE, not a divide-by-zero', () => {
  const r = getAttendanceRisk(0, 0)
  assert.equal(r.riskLevel, 'SAFE')
  assert.equal(r.currentAttendance, 0)
  assert.equal(r.classesNeeded, 0)
})

// ---- timesOverlap ---------------------------------------------------------

test('timesOverlap: touching edges do not overlap', () => {
  assert.equal(timesOverlap('10:00', '11:00', '11:00', '12:00'), false)
})

test('timesOverlap: partial overlap is detected', () => {
  assert.equal(timesOverlap('10:00', '11:00', '10:30', '11:30'), true)
})

test('timesOverlap: disjoint intervals do not overlap', () => {
  assert.equal(timesOverlap('09:00', '10:00', '11:00', '12:00'), false)
})

test('timesOverlap: fully contained interval overlaps', () => {
  assert.equal(timesOverlap('10:00', '12:00', '11:00', '11:30'), true)
})

// ---- predictFinalGrade ----------------------------------------------------

test('predictFinalGrade: with FINAL uses weighted actual standing', () => {
  const r = predictFinalGrade({
    INTERNAL: { marks: 70 },
    MID_TERM: { marks: 60 },
    FINAL: { marks: 50 },
  })
  // 70*.2 + 60*.3 + 50*.5 = 57
  assert.equal(r.hasFinal, true)
  assert.equal(r.projectedPercentage, 57)
  assert.equal(r.projectedGrade, 'B')
  assert.equal(r.marksNeededInFinal, null)
})

test('predictFinalGrade: without FINAL projects from current average + marks needed', () => {
  const r = predictFinalGrade({
    INTERNAL: { marks: 60 },
    MID_TERM: { marks: 70 },
  })
  // avg = 65; projected = .2*60 + .3*70 + .5*65 = 65.5 -> 66 -> 'A'
  assert.equal(r.hasFinal, false)
  assert.equal(r.projectedGrade, 'A')
  // to hold 'A' (>=65): fixed = .2*60 + .3*70 = 33; need ceil((65-33)/.5) = 64
  assert.equal(r.marksNeededInFinal, 64)
})

test('predictFinalGrade: no grades entered returns nulls', () => {
  const r = predictFinalGrade({})
  assert.equal(r.hasFinal, false)
  assert.equal(r.projectedGrade, null)
  assert.equal(r.projectedPercentage, null)
})
