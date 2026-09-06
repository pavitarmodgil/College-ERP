# AI/ML Module — Student Performance & At-Risk Prediction

**Phase 7 of the University Management System.** A machine-learning layer built on the ERP's academic data, for Continuous Evaluation 1 of Artificial Intelligence & Machine Learning (24CSE0316).

**Status: implemented and executed.** The notebook runs end to end with no errors, on real data, and the saved outputs in it are from an actual run.

The governing requirements are in [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md). This README documents what was built and where it diverges, with reasons.

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

## 2. Coverage of the CE notice

The notice's examined syllabus stops at *"preparation of training and testing datasets."* It does **not** require model training or evaluation. Part A of the notebook covers the syllabus exactly; Part B goes beyond it to complete the project.

| Syllabus item | Notebook section |
|---|---|
| Google Colab + NumPy, Pandas, Scikit-Learn, Matplotlib | 1 |
| Data collection | 2 |
| Data integration | 3 |
| Data cleaning | 4 |
| Handling missing values | 5 |
| *(EDA / visualisation)* | 6 |
| Data transformation | 7 |
| Feature engineering | 8 |
| Feature selection | 9 |
| Feature extraction · data reduction | 10 |
| Feature scaling — normalization **and** standardization | 11 |
| Preparation of training and testing datasets | 12 |
| — *beyond syllabus* — Classification | 13 |
| — *beyond syllabus* — Regression | 14 |
| — *beyond syllabus* — Model comparison | 15 |
| — *beyond syllabus* — Baseline comparison vs the ERP's own rule | 16 |
| — *beyond syllabus* — Feature importance | 17 |
| — *beyond syllabus* — Predictions on real ERP students | 18 |
| — *beyond syllabus* — Artifacts, limitations, conclusion | 19–21 |

---

## 3. How it connects to the ERP

```
PostgreSQL (existing ERP)        UCI Student Performance
    │                                     │
    │ read-only Prisma                    │ download + map
    ▼                                     ▼
export_student_academic_data.js   prepare_uci_dataset.py
    │                                     │
    └──────────────┬──────────────────────┘
                   ▼   one canonical schema
        ai/data/raw/*.csv
                   ▼
  ai/notebooks/student_performance_at_risk.ipynb
                   ▼
        ai/models/  (joblib + metadata)
```

**The ERP is not modified.** No new database, no new tables, no changes to existing controllers or routes. The extraction script reuses `server/lib/prisma.js` and only reads.

There is no inference endpoint. `GET /api/ai/...` is deliberately out of scope — see [§11](#11-future-work).

---

## 4. Data sources

Both sources are **real**. No synthetic data is used anywhere.

### Source 1 — the ERP (30 rows)

`ai/scripts/export_student_academic_data.js` aggregates the live database to one row per student-course enrolment. Of 45 enrolments, 15 have no FINAL grade and are dropped, leaving 30.

### Source 2 — UCI Student Performance (1,044 rows)

> Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T — **CC BY 4.0**

Real records from two Portuguese secondary schools, mapped onto the same schema by `ai/scripts/prepare_uci_dataset.py`.

### Why a second source was necessary

The ERP database contains:

| | |
|---|---|
| Enrolments with a FINAL grade | **30** |
| Students below the at-risk threshold | **0** |
| FINAL marks range | 45–98 (27 of 30 are A+ or O) |

**A binary classifier cannot be trained on a single class.** There are no failing students in the ERP to learn from, and 30 rows would not support a meaningful train/test split even if there were.

The UCI data has a genuine, naturally imbalanced positive class — 100 at-risk students out of 1,044 (9.6%). It is used for training; the ERP data proves the extraction pipeline and provides the real-student demonstration in notebook §18.

> This replaced an earlier plan to generate synthetic data. Real published data with real relationships is strictly better: the metrics mean something, and combining two sources demonstrates *data collection* and *data integration* authentically rather than by assertion.

---

## 5. Dataset schema

Grain: **one row = one student enrolled in one course.**

| Column | ERP source | UCI source | Role |
|---|---|---|---|
| `source` | `"ERP"` | `"UCI"` | provenance |
| `student_id` | `User.studentId` | synthetic stable id | identifier — not a feature |
| `course_code` | `Course.code` | `MAT101` / `POR101` | identifier — not a feature |
| `department` | `Department.code` | `MAT` / `POR` | feature |
| `course_type` | `Course.type` | `MANDATORY` | feature |
| `credits` | `Course.credits` | `3` | dropped — near-constant |
| `attendance_percentage` | `COUNT(present)/COUNT(*)` | `100 × (1 − absences/60)` | feature |
| `classes_held` | count of `Attendance` | `60` | not a feature |
| `internal_marks` | `Grade` `INTERNAL` | `G1 × 5` | feature |
| `midterm_marks` | `Grade` `MID_TERM` | `G2 × 5` | feature |
| `past_failures` | *not available* | `failures` | **dropped** — see below |
| `study_time` | *not available* | `studytime` | **dropped** — see below |
| `final_marks` | `Grade` `FINAL` | `G3 × 5` | **regression target** |
| `at_risk` | derived | derived | **classification target** |

### Two scale alignments

- **Grades.** UCI uses the Portuguese 0–20 scale, the ERP uses 0–100. UCI grades are multiplied by 5.
- **Attendance.** UCI records raw absence *counts*, not a percentage. Converting them assumes 60 sessions per course. This is an explicit modelling assumption, not a measurement, and is flagged in the notebook wherever the feature is used.

### Engineered features

| Feature | Definition | Why |
|---|---|---|
| `internal_midterm_average` | mean of internal and midterm | single summary of standing; smooths one bad paper |
| `performance_trend` | `midterm − internal` | direction of travel — 40→60 and 80→60 are not the same student |
| `attendance_band` | SAFE / WARNING / CRITICAL | applies the ERP's own 75% / 65% thresholds |

### What is deliberately excluded

| Excluded | Why |
|---|---|
| `Assessment` rows | **Carries no marks.** It is a scheduled item (title, dueDate, type), so the spec's `assessment_average` is not derivable from it. |
| `past_failures`, `study_time` | Missing for **100%** of ERP rows. They carry real signal (measured in §9, not assumed) but a model depending on them could not score a single real ERP student. |
| `letterGrade`, GPA | Derived from `final_marks` — direct leakage. |
| Anything from `timetableInsights` | Consumes `FINAL` when present. |
| `email`, names | Personally identifying and not academically meaningful. |

---

## 6. Prediction target and the at-risk threshold

**Prediction point:** immediately before the FINAL component is graded.

**Regression target:** `final_marks` (0–100).

**Classification target:** `at_risk = 1` when `final_marks < 40`.

### Why 40 and not 35

The ERP's grade scale (`server/lib/gradeUtils.js`) makes `F` the only failing grade at `< 35`; `P` (35–39) is a bare pass. But the ERP's *own* definition of academic risk is broader — `timetableInsights.js` sets:

```js
const gradeRisk = ['F', 'P'].includes(prediction.projectedGrade)
```

The application already treats a bare pass as a student needing attention. `P` ends at 39, so `final_marks < 40` reproduces the existing domain rule exactly. The threshold comes from the codebase, not from convenience.

---

## 7. Leakage rules

Every one of these is a way to score well and learn nothing.

| Rule | Rationale |
|---|---|
| `final_marks` is never an input feature | It is the regression target. |
| `at_risk` is never an input feature | Derived from the target. |
| `letterGrade` is never a feature | Computed from `final_marks`. |
| No output of `predictFinalGrade` is a feature | It reads `FINAL` when present. |
| GPA is never a feature | Computed from the FINAL component only. |
| Imputers, scalers and encoders are fit on **training folds only** | Enforced structurally by scikit-learn `Pipeline` / `ColumnTransformer`, not by remembering. |

**Rows with no FINAL grade are excluded, not imputed.** A missing final is a missing *outcome*, not a missing feature — imputing it would mean inventing the label.

---

## 8. Pipeline

| Stage | What happens |
|---|---|
| Cleaning | exact duplicates; duplicate identity keys; marks outside 0–100; attendance outside 0–100; rows with no FINAL dropped |
| Missing values | median (numeric) / most-frequent (categorical) imputation **inside** the pipeline |
| Transformation | one-hot encoding for `department`, `course_type`, `attendance_band` — nominal categories, so label-encoding would invent a false ordering |
| Feature engineering | the three features in §5 |
| Feature selection | Pearson correlation + mutual information + `SelectKBest` |
| Feature extraction | **PCA is demonstrated but not used in the final model** — see below |
| Scaling | `StandardScaler` for linear models; **trees are not scaled**, because splits are invariant to monotonic rescaling |
| Split | `train_test_split(test_size=0.2, random_state=42, stratify=y)` → 859 train / 215 test |

### On PCA

The notice lists *data reduction* and *feature extraction* as syllabus items, so PCA is implemented and analysed in §10 — explained variance, cumulative variance, and a 2-component projection showing the at-risk students occupying a distinct region.

It is **not** used in the final pipeline. With only five numeric features there is nothing meaningful to compress, and a principal component is a blend of all five inputs — "PC1 is high" cannot be explained to a student, whereas "attendance is 58% and the midterm dropped 20 marks" can. For a system whose purpose is prompting human intervention, an actionable explanation beats a marginal accuracy gain.

Knowing when *not* to apply a technique is part of using it correctly.

---

## 9. Models and results

Trained on 859 rows, evaluated on a held-out, stratified 215-row test set.

### Classification — at-risk detection

| Model | Accuracy | Precision | **Recall** | F1 | ROC-AUC |
|---|---|---|---|---|---|
| *ERP rule (baseline)* | 0.953 | 0.692 | 0.900 | 0.783 | — |
| **Logistic Regression** | 0.921 | 0.541 | **1.000** | 0.702 | 0.988 |
| Decision Tree | 0.926 | 0.562 | 0.900 | 0.692 | 0.932 |
| Random Forest | 0.963 | 0.750 | 0.900 | 0.818 | 0.983 |

**Selected: Logistic Regression** — the only model that identifies **every** at-risk student in the test set (20/20). Random Forest has better accuracy and F1, but misses two.

Selection is on **recall**, not accuracy, because the errors are asymmetric: a false negative means a struggling student gets no support and fails; a false positive means a teacher spends a few minutes checking on someone who is fine. With ~9% positives, a model predicting "safe" for everyone would score ~91% accuracy and be useless.

### Regression — final marks prediction

| Model | MAE | MSE | RMSE | R² |
|---|---|---|---|---|
| *ERP rule (baseline)* | 4.909 | 62.661 | 7.916 | 0.821 |
| Linear Regression | 4.360 | 47.812 | 6.915 | 0.863 |
| **Random Forest Regressor** | **4.274** | **41.925** | **6.475** | **0.880** |

**Selected: Random Forest Regressor** — best on every metric.

### Does ML actually beat the existing rule?

Yes, and the notebook demonstrates it rather than assuming it (§16). The ERP already predicts grades via `timetableInsights.predictFinalGrade`. With no FINAL entered, its weights reduce to a fixed linear rule:

```
projected = 0.2·I + 0.3·M + 0.5·((I + M)/2)  =  0.45·I + 0.55·M
```

It ignores attendance entirely. Evaluated on the **same test set**:

- Regression: RMSE improves 7.92 → 6.48, R² 0.821 → 0.880
- Classification: the rule misses **2** at-risk students; Logistic Regression misses **0**

That is the concrete justification for using ML over the existing hand-written rule.

---

## 10. Reproducing this

```bash
# 1. Export from the ERP (needs DATABASE_URL in .env and Postgres running)
node ai/scripts/export_student_academic_data.js

# 2. Download + map the UCI dataset
python ai/scripts/prepare_uci_dataset.py

# 3. Run the notebook
jupyter notebook ai/notebooks/student_performance_at_risk.ipynb
```

**In Google Colab:** upload the notebook and `Runtime → Run all`. The UCI dataset downloads automatically, so it runs end to end with no setup. The ERP CSV is optional — without it the notebook continues on UCI data alone and says so.

Requires `numpy pandas scikit-learn matplotlib joblib`. `random_state=42` throughout.

### Where things land

| Path | Contents | In git? |
|---|---|---|
| `ai/data/raw/` | `erp_student_course.csv`, `uci_student_course.csv` | No — regenerate via the scripts |
| `ai/data/processed/` | intermediates | No |
| `ai/models/` | `joblib` pipelines + `model_metadata.json` | No — regenerate from the notebook |
| `ai/reports/` | figures for the PPT | Yes |
| `ai/notebooks/` | the notebook, outputs committed | Yes |

Data and model binaries are gitignored; the scripts and notebook that produce them are committed, which is what makes this reproducible. The ERP export also contains real student records and must not reach source control.

**No secrets in this directory.** The extraction script reads `DATABASE_URL` from the existing `.env` at runtime; connection strings are never written into CSVs, notebooks or committed output.

---

## 11. Limitations

- **The models are not trained on this university's data.** The ERP has 30 gradeable rows and zero at-risk students, so training on it is impossible. The reported metrics come from Portuguese secondary-school data and **should not be read as expected accuracy for this institution.**
- **The attendance mapping is an assumption.** UCI stores absence counts; converting to a percentage assumed 60 sessions per course. Mark-based features are unaffected; the attendance feature is not.
- **Association, not causation.** Feature importance shows what the model keys on. Attendance may proxy for motivation, health, or circumstances the ERP never records.
- **Bias risk is real and unaudited.** `department` is a feature; if departments differ systematically in grading severity the model learns that and applies it to individuals.
- **No temporal validation.** One snapshot, one cohort. No evidence of transfer to a future intake.
- **Decision support only.** A prediction is a prompt for a human to look closer — never a grade, never the sole basis for an academic decision.

---

## 12. Future work

Deliberately **not** implemented, to keep this the size one student can defend:

- Attendance prediction
- Course recommendation
- Automated intervention recommendations
- A serving endpoint (`GET /api/ai/student/:id/prediction`)
- A frontend AI dashboard
- Retraining on real institutional data once enough terms have accumulated — the single change that would most improve this system

---

### Reference

Cortez, P. (2008). *Student Performance* [Dataset]. UCI Machine Learning Repository. https://doi.org/10.24432/C5TG7T — CC BY 4.0
