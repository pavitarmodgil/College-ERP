# AI/ML Module — Student Performance & At-Risk Prediction

**Phase 7 of the University Management System.** A machine-learning layer built on the ERP's academic data, for Continuous Evaluation 1 and 2 of Artificial Intelligence & Machine Learning (24CSE0316).

**Status: CE-2 implementation complete.** The notebook runs end to end with no errors, on real data, and the saved outputs in it come from an actual run. The CE-1 submission is preserved at git tag `ce1-submission`.

The original requirements are in [`IMPLEMENTATION_SPEC.md`](IMPLEMENTATION_SPEC.md). This README documents what was built and why.

---

## 1. What this module does

| Task | Type | Target | Question |
|---|---|---|---|
| Student performance prediction | Regression | `final_marks` | What final score is this student heading toward? |
| At-risk detection | Binary classification | `at_risk` | Is this student likely to end up below a passing outcome? |
| Student profiling *(CE-2)* | Clustering (unsupervised) | — | Without labels, do students fall into natural groups that line up with risk? |

Predictions are made **before the final exam is graded**, using only information available at that point. This is decision support for early intervention — **not** an authoritative grade.

---

## 2. Notebook map — CE-2 presentation sections

[`notebooks/student_performance_at_risk.ipynb`](notebooks/student_performance_at_risk.ipynb) — 98 cells, 26 sections.

| PPT section (CE-2 guidelines) | Notebook section |
|---|---|
| Overview, problem statement, objectives | top |
| Dataset description | 2 Data collection · 3 Data integration |
| Data preprocessing | 4 Cleaning · 5 Missing values · 7 Transformation · 11 Scaling · 12 Train/test |
| Exploratory data analysis | 6 (incl. per-source comparison) |
| Feature selection / engineering | 8 Engineering · 9 Selection · 10 PCA |
| Selected algorithm and methodology | 13 Classification · 14 Regression · 19 Tuning & selection |
| Model implementation | 12-14, 19 |
| Model evaluation and metrics | 15 Comparison · 16 vs ERP rule · 17 Cross-validation · 18 Bias-variance |
| Results and discussion | 19 Final models · 20 Clustering · 21 Feature importance · 22 Fairness & ethics · 23 ERP demo |
| Conclusion and future scope | 25 Limitations · 26 Conclusion |

### CE-2 syllabus coverage

| Syllabus topic | Where |
|---|---|
| Linear, Multiple Linear, Polynomial Regression | 14, 18(c) |
| MAE, MSE, RMSE, R² | 14, 17 |
| Logistic Regression, KNN, Decision Tree, Random Forest, Naive Bayes, SVM | 13 |
| Train-test split, cross-validation | 12, 17 |
| Overfitting / underfitting, bias-variance trade-off | 17, 18 |
| Confusion matrix, accuracy, precision, recall, F1 | 13, 16 |
| K-Means, hierarchical clustering, DBSCAN, silhouette score | 20 |
| PCA / dimensionality reduction | 10 |
| Ethical considerations | 22 |
| Association rules, recommendation systems | 26 (future work) |

---

## 3. Data sources — three, all real

```
PostgreSQL (ERP)          UCI Student Performance        Open University (OULAD)
      │ read-only Prisma          │ download + map               │ download + map
      ▼                           ▼                              ▼
export_student_academic_   prepare_uci_dataset.py     prepare_oulad_dataset.py
data.js                           │                              │
      └───────────────┬───────────┴──────────────────────────────┘
                      ▼   one canonical schema, one row per student-course
               ai/data/raw/*.csv  ──▶  notebook  ──▶  ai/models/ + ai/reports/
```

| Source | Rows | At risk | What it is |
|---|---|---|---|
| **ERP** | 30 | 0 (0%) | this system's own database — demo and pipeline proof |
| **UCI Student Performance** | 1,044 | 100 (9.6%) | Portuguese secondary schools, grades `G1 → G2 → G3` |
| **OULAD** *(added in CE-2)* | 4,959 | 567 (11.4%) | UK Open University, modules CCC and DDD, 2013-2014 |
| **Total** | **6,033** | **667 (11.1%)** | |

> Cortez, P. (2008). *Student Performance* [Dataset]. UCI ML Repository. https://doi.org/10.24432/C5TG7T — CC BY 4.0
>
> Kuzilek, J., Hlosta, M. & Zdrahal, Z. (2017). Open University Learning Analytics dataset. *Scientific Data* 4, 170171. https://doi.org/10.24432/C5KK69 — CC BY 4.0

### Why external data is needed

The ERP has 30 gradeable enrolments and **zero** at-risk students — a classifier cannot be trained on one class.

### Why OULAD was added for CE-2

- **University data** with a real final **exam** score on 0-100 (UCI is secondary school).
- **~5× larger** than UCI — the Random Forest learning curve (section 18) shows it is still improving with more data.
- **The OU's exam pass mark is 40**, identical to this project's at-risk threshold.
- Only modules CCC and DDD publish exam scores, so only they are used.

### The sources behave differently — and that matters

| | UCI | OULAD |
|---|---|---|
| corr(midterm, final) | 0.91 | 0.48 |
| corr(attendance, final) | 0.05 | 0.23 |

In UCI the final grade is almost a copy of the midterm, so the CE-1 task was easy (R² 0.88). OULAD's final is an independent exam, so the combined task is harder and more realistic. **CE-2 metrics are lower than CE-1 because the problem is harder, not because the models are worse.**

---

## 4. Dataset schema

Grain: **one row = one student enrolled in one course.**

| Column | ERP | UCI | OULAD | Role |
|---|---|---|---|---|
| `source` | `ERP` | `UCI` | `OULAD` | provenance |
| `student_id` | `User.studentId` | synthetic | `OU<id_student>` | identifier |
| `course_code` | `Course.code` | `MAT101`/`POR101` | `CCC-2014B` etc. | identifier |
| `department` | `Department.code` | `MAT`/`POR` | `CCC`/`DDD` | feature |
| `course_type` | `Course.type` | `MANDATORY` | *not recorded* → `NOT_RECORDED` | feature |
| `attendance_percentage` | register % | `100 × (1 − absences/60)` | % of weeks active online | feature |
| `internal_marks` | `Grade` INTERNAL | `G1 × 5` | 1st half of coursework (weighted) | feature |
| `midterm_marks` | `Grade` MID_TERM | `G2 × 5` | 2nd half of coursework (weighted) | feature |
| `past_failures` | *n/a* | `failures` | `num_of_prev_attempts` | dropped |
| `study_time` | *n/a* | `studytime` | *n/a* | dropped |
| `credits` | `Course.credits` | `3` | *n/a* | dropped |
| `final_marks` | `Grade` FINAL | `G3 × 5` | exam score | **regression target** |
| `at_risk` | derived | derived | derived | **classification target** |

**Engineered features:** `internal_midterm_average`, `performance_trend` (midterm − internal), `attendance_band` (the ERP's 75 / 65% bands).

**OULAD mapping notes:** non-exam assessments of each module presentation are sorted by date and split in half; a missing submission counts as 0. Attendance is the share of course weeks with at least one VLE interaction — a distance university has no register, so online engagement is the proxy.

---

## 5. Prediction target and leakage

- `at_risk = 1` when `final_marks < 40`. This reproduces the ERP's own risk rule (`gradeRisk` treats `F` and `P` — below 40 — as at risk) and matches the OU pass mark.
- `final_marks`, `at_risk`, letter grade, GPA and `predictFinalGrade` output are never features.
- Every imputer, scaler and encoder lives inside a scikit-learn `Pipeline`, fitted on training folds only.
- Rows with no final grade are dropped, never imputed.

---

## 6. Models and results

Training set 4,826 rows, held-out test set 1,207 rows (133 at risk), stratified, `random_state=42`.
Selection uses **5-fold cross-validation on the training set**; the test set is used once, for the selected model.

### Selection metric: F2

Recall matters most (a missed at-risk student is the costly error), but recall alone is gamed by flagging everyone — Naive Bayes reached recall 1.00 at accuracy 0.12. **F2** weights recall twice as heavily as precision and ranks the models sensibly.

### Classification (test set)

| Model | Accuracy | Precision | Recall | F2 | ROC-AUC | Missed (of 133) |
|---|---|---|---|---|---|---|
| *ERP rule (baseline)* | 0.861 | 0.353 | 0.316 | 0.323 | — | 91 |
| Logistic Regression | 0.728 | 0.254 | 0.759 | 0.544 | 0.819 | 32 |
| K-Nearest Neighbours | 0.891 | 0.511 | 0.173 | 0.199 | 0.805 | 110 |
| Naive Bayes | 0.115 | 0.111 | 1.000 | 0.384 | 0.788 | 0 |
| SVM (RBF) | 0.732 | 0.271 | 0.842 | 0.592 | 0.853 | 21 |
| Decision Tree | 0.732 | 0.270 | 0.842 | 0.591 | 0.841 | 21 |
| Random Forest | 0.766 | 0.299 | 0.835 | 0.615 | 0.875 | 22 |
| **Random Forest (tuned) — selected** | 0.753 | 0.291 | **0.865** | **0.620** | **0.876** | **18** |

### Regression (test set)

| Model | MAE | RMSE | R² |
|---|---|---|---|
| *ERP rule (baseline)* | 13.73 | 19.48 | 0.135 |
| Multiple Linear Regression | 13.09 | 16.89 | 0.350 |
| Polynomial Regression (deg 2) | 11.41 | 15.03 | 0.485 |
| Random Forest Regressor | 11.12 | 14.60 | 0.514 |
| **Random Forest Regressor (tuned) — selected** | **10.97** | **14.38** | **0.529** |

### Validation findings

- **Cross-validation** confirms the test-split ranking; F2 varies by only ±0.02 across folds.
- **Bias-variance:** best tree depth 6 (deeper overfits: train 0.83 vs CV 0.46 at depth 15); KNN memorises at k = 1 and collapses to the majority class at large k; polynomial degree 4 overfits (CV RMSE 25.3 vs 15.1 at degree 3).
- **Learning curves:** Logistic Regression is bias-limited (flat at 0.53); Random Forest is still improving with more data.
- **Tuning** (`GridSearchCV`, F2) chose shallower forests (`max_depth=6`); CV F2 0.592 → 0.608.

### Clustering (unsupervised)

K-Means, k = 3 (silhouette 0.395), on attendance + internal + midterm — labels never seen:

| Cluster | Students | Attendance | Midterm | At risk | Profile |
|---|---|---|---|---|---|
| 0 | 3,177 | 89% | 77 | 3.3% | engaged, strong |
| 1 | 1,271 | 59% | 49 | 18.3% | disengaging |
| 2 | 1,585 | 88% | 39 | 20.8% | attending but struggling |

Hierarchical (Ward) finds a similar structure (silhouette 0.293). DBSCAN finds one dense cluster; its 2.4% noise points have a 23.1% at-risk rate — useful as outlier detection.

### Fairness audit

Recall is even across groups (0.83-1.00), but non-at-risk OULAD students are falsely flagged ~4× as often as UCI students (30% vs 8%), and OULAD marks are predicted less accurately (MAE 12.1 vs 5.2). See notebook section 22.

---

## 7. Reproducing this

```bash
pip install -r ai/requirements.txt

# 1. Export from the ERP (needs DATABASE_URL in .env and Postgres running)
node ai/scripts/export_student_academic_data.js

# 2. Download + map the external datasets
python ai/scripts/prepare_uci_dataset.py
python ai/scripts/prepare_oulad_dataset.py          # ~45 MB download
python ai/scripts/prepare_oulad_dataset.py oulad.zip  # or use a local copy

# 3. Run the notebook from the repository root (takes ~3 minutes)
jupyter notebook ai/notebooks/student_performance_at_risk.ipynb
```

Every figure is written to `ai/reports/` when the notebook runs from the repo root. In Colab the UCI data downloads automatically; upload `oulad_student_course.csv` to include OULAD.

| Path | Contents | In git? |
|---|---|---|
| `ai/data/raw/` | `erp_…`, `uci_…`, `oulad_student_course.csv` | No — regenerate with the scripts |
| `ai/models/` | `joblib` pipelines + `model_metadata.json` | No — regenerate from the notebook |
| `ai/reports/` | 21 figures for the PPT and report | Yes |
| `ai/notebooks/` | the notebook, outputs committed | Yes |

### Figures (`ai/reports/`)

`01_eda_overview` · `02_source_comparison` · `03_correlation_with_target` · `04_feature_engineering_check` · `05_feature_selection_mutual_info` · `06_pca_variance` · `07_pca_projection` · `08_scaling_comparison` · `09_confusion_matrices` · `10_regression_actual_vs_predicted` · `11_model_comparison` · `12_rule_vs_ml_recall` · `13_cross_validation` · `14_bias_variance_curves` · `15_learning_curves` · `16_kmeans_elbow_silhouette` · `17_kmeans_clusters` · `18_dendrogram` · `19_dbscan` · `20_feature_importance` · `21_fairness_by_group`

---

### CE-2 submission files (`ai/submission/`)

| File | What it is |
|---|---|
| `AIML_CE2_Presentation.pptx` | 18-slide deck on the Chitkara template, with speaker notes |
| `AIML_CE2_Project_Report.docx` | ~62-page report in the department's format (front matter, 8 chapters, full source code appendix) |
| `figures/` | methodology workflow and system architecture diagrams used in the report |

Names, roll numbers and the guide's name are left as the template's placeholders — fill them in before printing. After editing the report in Word, right-click the table of contents → *Update Field*.

---

## 8. Limitations

- **Not trained on this university's data** — the ERP has no at-risk students; the metrics are not expected accuracy for this institution.
- **"Attendance" is three different measurements** — register, converted absence count (assumed 60 sessions), online engagement.
- **OULAD internal/midterm marks are constructed** from a chronological coursework split.
- **The sources behave differently**, so one model performs unevenly across them.
- **Association, not causation.**
- **No temporal validation** — a random split, not earlier-cohort → later-cohort.
- **Decision support only.**

## 9. Future work

- Retrain on real institutional data once enough terms accumulate — the change that would most improve the system.
- Temporal validation (OULAD 2013 → 2014).
- Group-aware decision thresholds to equalise false-positive rates.
- A serving endpoint (`GET /api/ai/student/:id/prediction`) and a staff-only dashboard showing each flagged student's cluster profile.
- Association-rule mining (Apriori / FP-Growth) on course enrolments.
