# AI/ML Module — Student Performance & At-Risk Prediction

**Phase 7 of the University Management System.** Adds a machine-learning layer on top of the existing ERP's academic data.

> **Status: documentation only.** This README is written *before* implementation so the design decisions — especially the leakage rules — are fixed in advance rather than rationalised afterwards. Nothing under `ai/` is implemented yet. Sections marked **PLANNED** describe intended behaviour; they are not claims about working code.

The governing requirements are in [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md). This README documents what was actually built and why it diverges where it does.

---

## 1. What this module does

Two supervised learning tasks over student-course academic records:

| Task | Type | Target | Question |
|---|---|---|---|
| Student performance prediction | Regression | `final_marks` | What final score is this student heading toward? |
| At-risk detection | Binary classification | `at_risk` | Is this student likely to end up below a passing outcome? |

Both predict **before the final exam is graded**, using only information available at that point.

This is decision support for early intervention. It is **not** an authoritative grade, and predictions are never shown to students as one.

---

## 2. How it connects to the ERP

```
PostgreSQL (existing ERP)
    │
    │  read-only Prisma queries
    ▼
ai/scripts/export_student_academic_data.js
    │
    │  one row per student-course
    ▼
ai/data/raw/student_course_dataset.csv
    │
    ▼
ai/notebooks/student_performance_at_risk.ipynb
    │
    ├── cleaning → EDA → feature engineering → selection → scaling
    ├── train/test split
    ├── classification (LogReg · Decision Tree · Random Forest)
    └── regression (Linear · Random Forest Regressor)
    │
    ▼
ai/models/  +  ai/reports/
```

**The ERP is not modified.** No new database, no new tables, no changes to existing controllers. The extraction script reuses `server/lib/prisma.js` and only reads.

There is currently **no inference endpoint**. `GET /api/ai/...` is deliberately out of scope — see [§12](#12-future-work).

---

## 3. Relationship to the existing rule-based insights

The ERP already predicts grades. `server/lib/timetableInsights.js` (`predictFinalGrade`) computes a weighted projection:

```
INTERNAL × 0.2  +  MID_TERM × 0.3  +  FINAL × 0.5
```

and flags `gradeRisk = true` when the projected letter is `F` or `P`.

**This is a hand-written rule, not a learned model.** It matters here for three reasons:

1. **It is the honest baseline.** Any ML model must be compared against it. "The model beats a weighted average" is a real result; "the model scored 0.9 R²" in isolation is not.
2. **It defines "at risk" for this codebase.** The ML target reuses that definition rather than inventing a new one — see [§5](#5-prediction-target-and-the-at-risk-threshold).
3. **It is a leakage trap.** `predictFinalGrade` consumes `FINAL` marks when present. Its outputs must therefore **never** be used as ML features. See [§6](#6-leakage-rules).

---

## 4. Dataset schema

Grain: **one row = one student enrolled in one course.**

Not one row per attendance record. Not one row per grade component.

| Column | Source | Type | Role |
|---|---|---|---|
| `student_id` | `User.studentId` | string | identifier — excluded from features |
| `course_code` | `Course.code` | string | identifier — excluded from features |
| `department` | `Department.code` | categorical | feature |
| `course_type` | `Course.type` | categorical | feature (MANDATORY/ELECTIVE) |
| `credits` | `Course.credits` | int | feature |
| `attendance_percentage` | aggregated `Attendance` | float 0–100 | feature |
| `classes_held` | count of `Attendance` | int | feature (confidence in the % above) |
| `internal_marks` | `Grade` where `component=INTERNAL` | float 0–100 | feature |
| `midterm_marks` | `Grade` where `component=MID_TERM` | float 0–100 | feature |
| `final_marks` | `Grade` where `component=FINAL` | float 0–100 | **regression target** |
| `at_risk` | derived from `final_marks` | 0/1 | **classification target** |

`attendance_percentage` is computed as `COUNT(present=true) / COUNT(*) × 100` per enrollment. The aggregation happens in JavaScript, not SQL — PostgreSQL cannot `SUM(boolean)` through Prisma's `_sum`, which is the same constraint `attendanceController` and `timetableInsights` already work around.

### What is deliberately *not* a feature

| Excluded | Why |
|---|---|
| `Assessment` rows | **Carries no marks.** It is a scheduled item (title, dueDate, type). There is no score to aggregate, so the spec's `assessment_average` is not derivable from it. |
| `letterGrade` | Derived from `final_marks` — direct leakage. |
| Anything from `timetableInsights` | Consumes `FINAL` when present — see [§6](#6-leakage-rules). |
| `email`, `firstName`, `lastName` | Personally identifying, and not academically meaningful. |
| `TimetableEntry` (room, slot) | Available, but no plausible mechanism linking room assignment to performance. Adding it would inflate the feature count without justification. |

> **Note on `assessment_average`.** The spec lists it as a preferred field. It is not implementable against this schema — `Assessment` has no marks column. Rather than fabricate it, the feature set uses `internal_marks` and `midterm_marks`, which are the real graded components. This is a documented, deliberate divergence from the spec.

---

## 5. Prediction target and the at-risk threshold

**Prediction point:** immediately before the FINAL component is graded. Everything the model sees — attendance, internal, midterm — exists at that moment.

**Regression target:** `final_marks` (0–100).

**Classification target:**

```
at_risk = 1  when final_marks < 40
at_risk = 0  otherwise
```

### Why 40 and not 35

The ERP's grade scale (`server/lib/gradeUtils.js`) makes `F` the only failing grade, at `< 35`. `P` (35–39) is a bare pass. A naive reading would put the threshold at 35.

But the ERP's *own* definition of academic risk is broader. `timetableInsights.js` sets:

```js
const gradeRisk = ['F', 'P'].includes(prediction.projectedGrade)
```

That is, the application already treats a bare pass as a student who needs attention. `P` is the boundary between 35 and 40, so `final_marks < 40` reproduces the existing domain rule exactly.

This also happens to match the spec's suggested threshold — but it is adopted because the codebase defines it that way, not because the spec suggested it.

---

## 6. Leakage rules

Non-negotiable. Every one of these is a way to accidentally score well and learn nothing.

| Rule | Rationale |
|---|---|
| `final_marks` is never an input feature | It is the regression target. |
| `at_risk` is never an input feature | It is derived from the target. |
| `letterGrade` is never a feature | Computed from `final_marks`. |
| No output of `predictFinalGrade` is a feature | It reads `FINAL` when present. |
| GPA is never a feature | `gradeUtils` computes GPA from the FINAL component only. |
| Scalers/encoders are fit on **training data only** | Fitting on the full set leaks test-set distribution into training. |
| Any resampling (e.g. SMOTE) is applied **after** the split, to training folds only | Resampling before splitting puts synthetic copies of test rows into training. |

**Rows with no FINAL grade are excluded from training,** not imputed. A missing final is missing *outcome*, not a missing feature — imputing it would mean inventing the label. Seed student STU007 (`incomplete.grades@uni.com`) is exactly this case and is correctly dropped.

---

## 7. Dataset size — the honest problem

**PLANNED — exact counts come from the extraction script.**

The current ERP database is seeded demo data, not an institutional record. Scale:

| Quantity | Count |
|---|---|
| Enrollments (upper bound on rows) | 24 |
| Grade entries across all components | 69 |
| Enrollments with a FINAL grade (usable rows) | roughly 20 |

**About twenty rows is not a machine learning dataset.** A 20% test split leaves four test rows. Any metric computed on four rows is noise — a single row flipping moves accuracy by 25 percentage points.

So the plan is:

1. **Run the extraction against the real ERP anyway.** It proves the ERP→dataset path works, and it produces the schema everything else conforms to.
2. **Generate a labelled synthetic development dataset** for actual model training, via `ai/scripts/generate_demo_dataset.py` — same schema, fixed random seed, several hundred to a few thousand rows.

### Rules for the synthetic data

- Same columns and dtypes as the ERP export, so both flow through one pipeline.
- Deterministic — fixed seed, regenerable, identical every run.
- Relationships are *plausible*, not copied: attendance and prior components correlate with the final, with realistic noise.
- Every artifact derived from it is labelled `SYNTHETIC`.
- **Never inserted into the ERP database.** Not to inflate counts, not for demos, not at all.
- **Metrics from synthetic data are never described as real-world ERP performance.** They demonstrate that the pipeline is correct, nothing more.

The notebook states which dataset produced every number it reports.

---

## 8. Pipeline stages

**PLANNED.**

| Stage | What happens |
|---|---|
| Cleaning | Duplicate rows; attendance outside 0–100; marks outside 0–100; malformed department/course codes; rows with no FINAL dropped (see §6) |
| Missing values | Numeric components median-imputed **inside** the pipeline so imputation statistics come from training folds only |
| Feature engineering | `internal_midterm_average`; `performance_trend` (midterm − internal); attendance banded to the ERP's own SAFE/WARNING/CRITICAL thresholds |
| Feature selection | Correlation inspection for regression, mutual information for classification, cross-checked against tree feature importance. **No PCA** — with roughly ten interpretable features it would destroy interpretability for no gain, and the viva depends on explaining which features matter |
| Scaling | `StandardScaler` inside a `Pipeline`, applied for Logistic Regression and Linear Regression. **Not** applied to tree models — they are scale-invariant, and pretending otherwise misrepresents why scaling exists |
| Split | `train_test_split(test_size=0.2, random_state=42, stratify=y)` for classification; unstratified for regression |

Preprocessing lives in scikit-learn `Pipeline` / `ColumnTransformer` objects, not loose notebook cells, so that fitting on training data only is structurally enforced rather than remembered.

---

## 9. Models

**PLANNED.**

**Classification** — Logistic Regression (baseline, interpretable coefficients) · Decision Tree (interpretable non-linearity) · Random Forest (ensemble).

**Regression** — Linear Regression (baseline) · Random Forest Regressor.

Class imbalance is expected: most students pass. Response is `class_weight='balanced'` on compatible models, stratified splitting, and evaluation on recall/F1/confusion matrix rather than accuracy.

### Metrics, and which one decides

Classification: accuracy, precision, **recall**, F1, confusion matrix.
Regression: MAE, MSE, RMSE, R².

**Model selection is on recall for the at-risk class, not accuracy.** The two error types are not symmetric:

- **False negative** — a genuinely at-risk student is marked safe, receives no intervention, and fails. The harm is real and lands on the student.
- **False positive** — a safe student is flagged, a teacher reviews the case, nothing is wrong. The cost is a few minutes of attention.

Optimising accuracy on an imbalanced set rewards predicting "not at risk" for everyone. That model would be accurate and useless.

---

## 10. Reproducibility

**PLANNED.**

```bash
# 1. Export from the ERP (requires DATABASE_URL in .env)
node ai/scripts/export_student_academic_data.js

# 2. Generate the synthetic development dataset
python ai/scripts/generate_demo_dataset.py

# 3. Open the notebook
#    Locally:  jupyter notebook ai/notebooks/student_performance_at_risk.ipynb
#    Colab:    upload the notebook + the CSV from ai/data/
```

`random_state=42` throughout. Same input, same output.

### Where things land

| Path | Contents | In git? |
|---|---|---|
| `ai/data/raw/` | Extracted + generated CSVs | No — regenerate via the scripts |
| `ai/data/processed/` | Cleaned/engineered intermediates | No |
| `ai/models/` | `joblib` model + preprocessor + feature metadata | No — regenerate from the notebook |
| `ai/reports/` | Figures and metric tables for the PPT | Yes |
| `ai/notebooks/` | The notebook, outputs committed | Yes |

Data and model binaries are gitignored. The notebook and scripts that produce them are committed, which is what makes the work reproducible.

**No secrets in this directory.** The extraction script reads `DATABASE_URL` from the existing `.env` at runtime. Connection strings are never written into CSVs, notebooks, or committed output.

---

## 11. Limitations

State these plainly in the viva rather than being caught by them.

- **Dataset size.** The real ERP yields roughly 20 usable rows. Model metrics come from synthetic data.
- **Synthetic data cannot validate real-world accuracy.** It shows the pipeline is correct. It says nothing about how the model would perform on real students, because the relationships in it were designed, not observed.
- **No temporal validation.** One cohort, one semester. No evidence the model transfers to a future intake.
- **Feature importance is association, not causation.** High attendance is *associated with* better predicted outcomes. The model cannot show that attending more classes *causes* better marks — attendance may proxy for motivation, health, or circumstances the ERP does not record.
- **Bias risk.** `department` is a feature. If departments differ systematically in grading, the model will learn that and apply it to individuals. Not audited.
- **Decision support only.** Predictions must never be presented to students as grades, nor used as the sole basis for an academic decision.

---

## 12. Future work

Explicitly **not** implemented, and out of scope for this CE:

- Attendance prediction
- Course recommendation
- Automated intervention recommendations
- An inference endpoint (`GET /api/ai/student/:id/prediction`)
- A frontend AI dashboard
- Richer historical data across multiple cohorts
- Deep learning, LLM/chatbot features, computer vision

The ML pipeline and its reproducibility are the deliverable. Adding a serving layer would increase surface area without demonstrating anything the notebook does not already show.

---

## 13. CE requirement coverage

Tracked against the syllabus scope. **PLANNED** until the notebook exists.

| Requirement | Where it will be demonstrated |
|---|---|
| NumPy | Numeric ops throughout |
| Pandas | Loading, cleaning, aggregation |
| Scikit-learn | Pipelines, models, metrics |
| Matplotlib | EDA + model comparison figures |
| Data collection / integration | `export_student_academic_data.js` |
| Data cleaning | Notebook §5 |
| Missing values | Pipeline imputation |
| Data transformation | Encoding + scaling |
| Feature engineering | Notebook §6 |
| Feature selection / extraction | Notebook §7 |
| Feature scaling | `StandardScaler` |
| Training / testing datasets | Stratified split |
| Classification | LogReg · Decision Tree · Random Forest |
| Regression | Linear · Random Forest Regressor |
| Evaluation | Metrics + confusion matrix + comparison table |
| Documentation | This file |
| Reproducible execution | Fixed seeds + regeneration scripts |
