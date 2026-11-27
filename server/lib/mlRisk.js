// ML at-risk estimate (roadmap FUT-1). Experimental decision support, never a grade.
//
// Scores the tuned Random Forest from ai/notebooks/student_performance_at_risk.ipynb
// in plain JS. The model was exported to ./ml/atRiskModel.json by
// ai/scripts/export_at_risk_model.py. That file holds the fitted preprocessing and
// all 300 trees, so this reproduces sklearn's predict_proba without a Python
// service.
//
// The model was trained on UCI + OULAD records (plus 30 ERP rows) and is NOT
// calibrated on this university's data. Callers must label it as experimental.
//
// Everything except loadModel() and isMlRiskEnabled() is pure: no I/O, no DB, no env.

const fs = require('fs')
const path = require('path')

const MODEL_PATH = path.join(__dirname, 'ml', 'atRiskModel.json')

const DISCLAIMER = 'Experimental decision support, not a grade'

// Display bands. 0.5 is the notebook's decision threshold ("AT RISK");
// 0.25 is a display-only split so the band isn't binary.
const BANDS = [
  { min: 0.5, band: 'HIGH' },
  { min: 0.25, band: 'MODERATE' },
  { min: 0, band: 'LOW' },
]

const FACTOR_LABELS = {
  attendance_percentage: 'Attendance',
  internal_marks: 'Internal marks',
  midterm_marks: 'Mid-term marks',
  internal_midterm_average: 'Internal / mid-term average',
  performance_trend: 'Change from internal to mid-term',
  department: 'Department',
  course_type: 'Course type',
  attendance_band: 'Attendance band',
}

// ---- Flag + model loading (the only impure parts) --------------------------

function isMlRiskEnabled(env = process.env) {
  return ['true', '1'].includes(String(env.ML_RISK_ENABLED || '').trim().toLowerCase())
}

let cachedModel = null

// Read and validate the exported model once. Throws if it is missing or malformed.
// Callers decide what a failure means (the insights endpoint falls back to
// the rule-based band only).
function loadModel(filePath = MODEL_PATH) {
  if (cachedModel && filePath === MODEL_PATH) return cachedModel
  const model = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  validateModel(model)
  if (filePath === MODEL_PATH) cachedModel = model
  return model
}

function validateModel(model) {
  if (!model || model.format !== 'erp-rf-v1') throw new Error('ML model: unknown format')
  if (!Array.isArray(model.trees) || model.trees.length === 0) throw new Error('ML model: no trees')
  const width = model.numeric.length + model.categories.reduce((s, c) => s + c.length, 0)
  if (width !== model.featureNames.length) throw new Error('ML model: feature width mismatch')
}

// ---- Feature engineering (mirrors the notebook's engineer()) ---------------

// pd.cut(bins=[-inf, 65, 75, inf], labels=[CRITICAL, WARNING, SAFE]) is
// right-inclusive, so exactly 75% is WARNING and exactly 65% is CRITICAL.
// The rule-based getAttendanceRisk() treats 75% as SAFE. That small
// difference is inherited from the training pipeline on purpose.
function modelAttendanceBand(pct) {
  if (pct <= 65) return 'CRITICAL'
  if (pct <= 75) return 'WARNING'
  return 'SAFE'
}

function assertMark(name, value) {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new TypeError(`ML input ${name} must be a number between 0 and 100`)
  }
}

// input: { attendancePercentage, internalMarks, midtermMarks, department, courseType }
function buildFeatureRow(input) {
  const { attendancePercentage, internalMarks, midtermMarks, department, courseType } = input
  assertMark('attendancePercentage', attendancePercentage)
  assertMark('internalMarks', internalMarks)
  assertMark('midtermMarks', midtermMarks)
  return {
    attendance_percentage: attendancePercentage,
    internal_marks: internalMarks,
    midterm_marks: midtermMarks,
    internal_midterm_average: (internalMarks + midtermMarks) / 2,
    performance_trend: midtermMarks - internalMarks,
    department: department == null ? null : String(department),
    course_type: courseType == null ? null : String(courseType),
    attendance_band: modelAttendanceBand(attendancePercentage),
  }
}

// ColumnTransformer: numeric passthrough (median-imputed), then one-hot per
// categorical (mode-imputed; an unseen category encodes as all zeros, i.e.
// handle_unknown='ignore'). Returns the vector plus each column's source feature.
function encodeRow(model, row) {
  const vector = []
  const source = []
  model.numeric.forEach((name, i) => {
    const v = row[name]
    vector.push(v === null || v === undefined || Number.isNaN(v) ? model.numericMedians[i] : v)
    source.push(name)
  })
  model.categorical.forEach((name, i) => {
    const value = row[name] ?? model.categoricalModes[i]
    for (const category of model.categories[i]) {
      vector.push(value === category ? 1 : 0)
      source.push(name)
    }
  })
  return { vector, source }
}

// ---- Scoring ----------------------------------------------------------------

// sklearn trees compare float32(x) <= threshold. Math.fround reproduces that
// cast so boundary values route exactly as they do in Python.
//
// Returns the leaf probability plus a per-column contribution
// (Saabas / treeinterpreter decomposition: root value + sum of the value
// change at each split on the path == leaf value).
function walkTree(tree, x, contrib) {
  let node = 0
  while (tree.f[node] !== -1) {
    const next = Math.fround(x[tree.f[node]]) <= tree.t[node] ? node + 1 : tree.r[node]
    contrib[tree.f[node]] += tree.v[next] - tree.v[node]
    node = next
  }
  return tree.v[node]
}

function bandFor(probability) {
  return BANDS.find((b) => probability >= b.min).band
}

function formatFactorValue(feature, row) {
  const v = row[feature]
  if (feature === 'attendance_percentage') return `${v}%`
  if (feature === 'performance_trend') return `${v > 0 ? '+' : ''}${v}`
  return v === null ? 'not recorded' : String(v)
}

// Pure. Returns { probability, band, baseline, factors } where factors are the
// top `topN` features by absolute contribution, grouped back from one-hot
// columns to the original feature.
function scoreAtRisk(model, input, { topN = 3 } = {}) {
  const row = buildFeatureRow(input)
  const { vector, source } = encodeRow(model, row)

  const contrib = new Array(vector.length).fill(0)
  let sum = 0
  let baseline = 0
  for (const tree of model.trees) {
    sum += walkTree(tree, vector, contrib)
    baseline += tree.v[0]
  }
  const n = model.trees.length
  const probability = sum / n

  const byFeature = {}
  contrib.forEach((c, i) => {
    byFeature[source[i]] = (byFeature[source[i]] || 0) + c / n
  })

  const factors = Object.entries(byFeature)
    .filter(([, c]) => Math.abs(c) >= 0.001)
    .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
    .slice(0, topN)
    .map(([feature, contribution]) => ({
      feature,
      label: FACTOR_LABELS[feature] || feature,
      value: formatFactorValue(feature, row),
      contribution,
      direction: contribution > 0 ? 'raises' : 'lowers',
    }))

  return { probability, band: bandFor(probability), baseline: baseline / n, factors, contributions: byFeature }
}

// ---- ERP adapter ------------------------------------------------------------

const round3 = (x) => Math.round(x * 1000) / 1000

// Turn one enrollment's ERP data into the API's mlRisk object. Pure given `model`.
//   attended/total : attendance counts for the enrollment
//   gradeMap       : { INTERNAL?: {marks}, MID_TERM?: {marks}, FINAL?: {marks} }
//   course         : { type, department: { code } }
// The model needs attendance plus INTERNAL and MID_TERM marks. Without them it
// reports INSUFFICIENT_DATA and does not guess.
function scoreEnrollment(model, { attended, total, gradeMap, course }) {
  const internal = gradeMap.INTERNAL?.marks
  const midterm = gradeMap.MID_TERM?.marks
  const missing = []
  if (!total) missing.push('attendance')
  if (internal === undefined || internal === null) missing.push('INTERNAL marks')
  if (midterm === undefined || midterm === null) missing.push('MID_TERM marks')
  if (missing.length) return { status: 'INSUFFICIENT_DATA', missing }

  // Same 2-decimal rounding the training export used (export_student_academic_data.js).
  const attendancePercentage = Number(((attended / total) * 100).toFixed(2))
  const result = scoreAtRisk(model, {
    attendancePercentage,
    internalMarks: internal,
    midtermMarks: midterm,
    department: course?.department?.code ?? null,
    courseType: course?.type ?? null,
  })

  return {
    status: 'OK',
    probability: round3(result.probability),
    band: result.band,
    finalGraded: gradeMap.FINAL?.marks !== undefined && gradeMap.FINAL?.marks !== null,
    factors: result.factors.map((f) => ({ ...f, contribution: round3(f.contribution) })),
  }
}

// Response-level description shown next to every estimate.
function modelInfo(model) {
  return {
    model: model.model,
    // External sources only; the ~30 ERP rows were too few to calibrate on.
    trainedOn: Object.keys(model.trainingSources || {}).filter((s) => s !== 'ERP').join(' + '),
    decisionThreshold: model.decisionThreshold,
    disclaimer: DISCLAIMER,
  }
}

module.exports = {
  DISCLAIMER,
  MODEL_PATH,
  isMlRiskEnabled,
  loadModel,
  validateModel,
  modelAttendanceBand,
  buildFeatureRow,
  encodeRow,
  scoreAtRisk,
  scoreEnrollment,
  bandFor,
  modelInfo,
}
