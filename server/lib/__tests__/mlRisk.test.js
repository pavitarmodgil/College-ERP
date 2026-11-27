// Unit tests for the ML at-risk scorer. Run with `npm test` (node --test).
//
// Two oracles:
//  1. Notebook section 23 ("Example predictions on real ERP students"): the
//     printed risk_probability (3 dp) for seeded ERP rows. Only the feature
//     values are copied here, with no identifiers.
//  2. fixtures/mlRiskExpected.json: full-precision sklearn predict_proba for
//     hand-made rows that hit each preprocessing branch, written by
//     ai/scripts/export_at_risk_model.py from the same saved pipeline.

const { test } = require('node:test')
const assert = require('node:assert/strict')

const {
  loadModel,
  validateModel,
  isMlRiskEnabled,
  modelAttendanceBand,
  buildFeatureRow,
  encodeRow,
  scoreAtRisk,
  scoreEnrollment,
  bandFor,
  modelInfo,
  DISCLAIMER,
} = require('../mlRisk')
const expected = require('./fixtures/mlRiskExpected.json')

const model = loadModel()

// ---- Parity with the notebook -------------------------------------------

// attendance %, INTERNAL, MID_TERM -> notebook risk_probability (CSE, MANDATORY)
const NOTEBOOK_SECTION_23 = [
  { attendancePercentage: 94.12, internalMarks: 75, midtermMarks: 78, probability: 0.047 },
  { attendancePercentage: 87.5, internalMarks: 68, midtermMarks: 72, probability: 0.084 },
  { attendancePercentage: 100, internalMarks: 82, midtermMarks: 88, probability: 0.031 },
  { attendancePercentage: 75, internalMarks: 72, midtermMarks: 74, probability: 0.17 },
  { attendancePercentage: 85.71, internalMarks: 68, midtermMarks: 70, probability: 0.095 },
]

for (const row of NOTEBOOK_SECTION_23) {
  test(`scoreAtRisk matches notebook section 23: ${row.attendancePercentage}% / ${row.internalMarks} / ${row.midtermMarks}`, () => {
    const { probability } = scoreAtRisk(model, { ...row, department: 'CSE', courseType: 'MANDATORY' })
    assert.equal(Math.round(probability * 1000) / 1000, row.probability)
  })
}

for (const row of expected.rows) {
  test(`scoreAtRisk matches sklearn predict_proba: ${JSON.stringify(row.input)}`, () => {
    const i = row.input
    const result = scoreAtRisk(model, {
      attendancePercentage: i.attendance_percentage,
      internalMarks: i.internal_marks,
      midtermMarks: i.midterm_marks,
      department: i.department,
      courseType: i.course_type,
    })
    assert.ok(Math.abs(result.probability - row.probability) < 1e-6,
      `got ${result.probability}, sklearn ${row.probability}`)
    assert.equal(buildFeatureRow({
      attendancePercentage: i.attendance_percentage, internalMarks: i.internal_marks, midtermMarks: i.midterm_marks,
    }).attendance_band, row.attendanceBand)
  })
}

// ---- Explanation ----------------------------------------------------------

test('contributions decompose the probability exactly (baseline + sum = probability)', () => {
  for (const row of expected.rows) {
    const i = row.input
    const r = scoreAtRisk(model, {
      attendancePercentage: i.attendance_percentage, internalMarks: i.internal_marks,
      midtermMarks: i.midterm_marks, department: i.department, courseType: i.course_type,
    })
    const total = r.baseline + Object.values(r.contributions).reduce((s, c) => s + c, 0)
    assert.ok(Math.abs(total - r.probability) < 1e-9)
  }
})

test('factors are the top 3 by absolute contribution, labelled, with a direction', () => {
  const r = scoreAtRisk(model, {
    attendancePercentage: 58.33, internalMarks: 48, midtermMarks: 31, department: 'CSE', courseType: 'MANDATORY',
  })
  assert.equal(r.factors.length, 3)
  for (let k = 1; k < r.factors.length; k++) {
    assert.ok(Math.abs(r.factors[k - 1].contribution) >= Math.abs(r.factors[k].contribution))
  }
  for (const f of r.factors) {
    assert.ok(f.label && f.value !== undefined)
    assert.equal(f.direction, f.contribution > 0 ? 'raises' : 'lowers')
  }
  // A struggling student: the strongest factor pushes risk up.
  assert.equal(r.factors[0].direction, 'raises')
})

// ---- Preprocessing ----------------------------------------------------------

test('modelAttendanceBand is right-inclusive like pd.cut (75 -> WARNING, 65 -> CRITICAL)', () => {
  assert.equal(modelAttendanceBand(75.01), 'SAFE')
  assert.equal(modelAttendanceBand(75), 'WARNING')
  assert.equal(modelAttendanceBand(65.01), 'WARNING')
  assert.equal(modelAttendanceBand(65), 'CRITICAL')
  assert.equal(modelAttendanceBand(0), 'CRITICAL')
})

test('engineered features: average and trend', () => {
  const row = buildFeatureRow({ attendancePercentage: 80, internalMarks: 60, midtermMarks: 70 })
  assert.equal(row.internal_midterm_average, 65)
  assert.equal(row.performance_trend, 10)
})

test('an unseen department one-hot encodes as all zeros (handle_unknown=ignore)', () => {
  const row = buildFeatureRow({ attendancePercentage: 80, internalMarks: 60, midtermMarks: 70, department: 'ME', courseType: 'ELECTIVE' })
  const { vector } = encodeRow(model, row)
  const deptStart = model.numeric.length
  const deptCols = vector.slice(deptStart, deptStart + model.categories[0].length)
  assert.deepEqual(deptCols, deptCols.map(() => 0))
  assert.equal(vector.length, model.featureNames.length)
})

test('invalid marks throw instead of producing a number', () => {
  assert.throws(() => buildFeatureRow({ attendancePercentage: 80, internalMarks: 120, midtermMarks: 70 }), TypeError)
  assert.throws(() => buildFeatureRow({ attendancePercentage: NaN, internalMarks: 60, midtermMarks: 70 }), TypeError)
  assert.throws(() => buildFeatureRow({ attendancePercentage: 80, internalMarks: '60', midtermMarks: 70 }), TypeError)
})

test('bandFor: 0.5 is the notebook decision threshold', () => {
  assert.equal(bandFor(0.0), 'LOW')
  assert.equal(bandFor(0.249), 'LOW')
  assert.equal(bandFor(0.25), 'MODERATE')
  assert.equal(bandFor(0.499), 'MODERATE')
  assert.equal(bandFor(0.5), 'HIGH')
})

// ---- ERP adapter ------------------------------------------------------------

const course = { type: 'MANDATORY', department: { code: 'CSE' } }

test('scoreEnrollment: scores from attendance counts and grade components', () => {
  // 16 of 17 sessions = 94.12% (rounded to 2 dp like the training export)
  const r = scoreEnrollment(model, {
    attended: 16, total: 17, course,
    gradeMap: { INTERNAL: { marks: 75 }, MID_TERM: { marks: 78 }, FINAL: { marks: 82 } },
  })
  assert.equal(r.status, 'OK')
  assert.equal(r.probability, 0.047)
  assert.equal(r.band, 'LOW')
  assert.equal(r.finalGraded, true)
  assert.ok(r.factors.length > 0)
})

test('scoreEnrollment: missing MID_TERM or attendance -> INSUFFICIENT_DATA, no guess', () => {
  const noMid = scoreEnrollment(model, { attended: 10, total: 12, course, gradeMap: { INTERNAL: { marks: 70 } } })
  assert.deepEqual(noMid, { status: 'INSUFFICIENT_DATA', missing: ['MID_TERM marks'] })

  const noAttendance = scoreEnrollment(model, {
    attended: 0, total: 0, course, gradeMap: { INTERNAL: { marks: 70 }, MID_TERM: { marks: 72 } },
  })
  assert.deepEqual(noAttendance, { status: 'INSUFFICIENT_DATA', missing: ['attendance'] })
})

// ---- Flag, model file, metadata ---------------------------------------------

test('isMlRiskEnabled defaults off', () => {
  assert.equal(isMlRiskEnabled({}), false)
  assert.equal(isMlRiskEnabled({ ML_RISK_ENABLED: 'false' }), false)
  assert.equal(isMlRiskEnabled({ ML_RISK_ENABLED: 'yes' }), false)
  assert.equal(isMlRiskEnabled({ ML_RISK_ENABLED: 'true' }), true)
  assert.equal(isMlRiskEnabled({ ML_RISK_ENABLED: ' TRUE ' }), true)
  assert.equal(isMlRiskEnabled({ ML_RISK_ENABLED: '1' }), true)
})

test('validateModel rejects malformed exports', () => {
  assert.throws(() => validateModel(null))
  assert.throws(() => validateModel({ format: 'other' }))
  assert.throws(() => validateModel({ ...model, trees: [] }))
  assert.throws(() => validateModel({ ...model, featureNames: model.featureNames.slice(1) }))
})

test('loadModel throws on a missing file (caller falls back to rule-based only)', () => {
  assert.throws(() => loadModel('/nonexistent/atRiskModel.json'))
})

test('modelInfo carries the disclaimer', () => {
  const info = modelInfo(model)
  assert.equal(info.disclaimer, DISCLAIMER)
  assert.match(info.disclaimer, /not a grade/)
  assert.equal(info.decisionThreshold, 0.5)
})
