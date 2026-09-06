# Claude Code Master Instructions — AI-Powered University Management System

## Mission

You are working inside an existing College ERP application. Extend the existing system with an **AI/ML Student Performance and At-Risk Prediction module**.

This is the **current CE/assessment scope only**. Do not turn this into a full AI-powered university platform yet.

The current academic requirement is centered on:

- Google Colab / Python
- NumPy
- Pandas
- Scikit-learn
- Matplotlib
- Data collection / integration
- Data cleaning
- Missing-value handling
- Data transformation
- Feature engineering
- Feature selection / extraction
- Feature scaling using normalization and/or standardization
- Preparation of training and testing datasets
- Machine-learning model training and evaluation

Assessment context from the university notice:

- Course: Artificial Intelligence & Machine Learning
- Programme: B.E. CSE, 5th Semester
- Current CE: 20 marks total
- Viva: 7 marks
- PPT: 7 marks
- Project idea: 3 marks
- Team performance: 3 marks
- Current syllabus scope: Python + NumPy/Pandas/Scikit-learn/Matplotlib + preprocessing + feature engineering/selection + train/test preparation

The student is working alone and has limited time. Prioritize a **complete, clean, demonstrable ML pipeline** over unnecessary product features.

---

# 1. Non-Negotiable Project Scope

## Current objective

Build this:

> **AI-Powered University Management System — Student Performance and At-Risk Prediction**

The existing ERP is the application/data platform. The new work is the ML layer built on top of the ERP's academic data.

### Current ML tasks

1. **Student performance prediction** — regression
   - Predict a student's expected final marks from information available before the final exam.

2. **At-risk student prediction** — binary classification
   - Predict whether a student is likely to be academically at risk.

### Future work — DO NOT IMPLEMENT NOW

Keep these only as documented future extensions:

- Attendance prediction
- Course recommendation
- Early intervention recommendations
- More predictive analytics
- LLM/chatbot functionality
- Deep learning
- Computer vision
- Blockchain
- Mobile application
- Microservices/Kubernetes
- Large AI dashboard

Do not spend implementation time on any of those unless they become strictly necessary for the current pipeline.

---

# 2. First Rule: Inspect Before Editing

Before changing anything:

1. Identify the repository root.
2. Read the project README(s).
3. Inspect `package.json` files.
4. Inspect the Prisma schema.
5. Inspect database-related code.
6. Inspect attendance controllers/routes/services.
7. Inspect grade controllers/routes/services.
8. Inspect assessment-related models/controllers/routes.
9. Inspect existing dashboard/student data flows.
10. Determine how the project currently starts locally.
11. Determine how the database is connected.
12. Identify existing tests and run them before making changes where practical.
13. Check the current git status.
14. Do NOT destroy, reset, rebase, or overwrite unrelated existing work.

The repository already contains substantial ERP functionality. Preserve it.

---

# 3. Security Rule

The repository may contain `.env` / local configuration files.

- Never print secrets, passwords, tokens, or database credentials into terminal output unnecessarily.
- Never commit secrets.
- Never copy real secrets into notebooks, CSVs, documentation, examples, or source control.
- If an environment file is needed to run the existing application locally, use it only as runtime configuration.
- Add or update `.gitignore` rules for generated datasets, model binaries, local environment files, and other sensitive/local artifacts as appropriate.

---

# 4. Architectural Principle

The architecture should be:

```text
Existing College ERP
        |
        | academic data
        v
PostgreSQL / Prisma
        |
        | extraction / aggregation
        v
ML Dataset
        |
        v
Google Colab / Python
        |
        +--> Data Cleaning
        +--> EDA
        +--> Feature Engineering
        +--> Feature Selection
        +--> Scaling
        +--> Train/Test Split
        |
        +--> Classification Models
        |       +--> Logistic Regression
        |       +--> Decision Tree
        |       +--> Random Forest
        |
        +--> Regression Model
                +--> Random Forest Regressor
        |
        v
Evaluation + Saved Model Artifacts + Documentation
```

The existing ERP remains intact.

For the current CE, the primary deliverable is the ML pipeline and its reproducibility. **Do not build a production inference microservice or frontend AI dashboard unless the existing project makes a tiny, low-risk integration necessary.**

---

# 5. Inspect the Existing Data Model Carefully

The current ERP is expected to contain concepts such as:

- students/users
- departments
- courses
- enrollments
- attendance records
- grades
- assessments

Do not assume exact field names. Read the actual Prisma schema and source code first.

Map the real schema to the ML dataset.

The preferred grain is:

> **One row = one student enrolled in one course/academic unit.**

Do NOT create one row per attendance event.
Do NOT create one row per individual grade component unless that is genuinely the natural grain of the chosen prediction problem.

---

# 6. Define the Canonical ML Dataset

Create a canonical dataset with one row per student-course record.

Prefer the following logical fields, adapting names to the real schema:

```text
student_id
course_id / course_code
department
attendance_percentage
internal_marks
midterm_marks
assessment_average
previous_performance  (only if genuinely available without leakage)
final_marks
at_risk
```

Potential additional features may be added only when they are:

- available in the existing ERP,
- meaningful for the problem,
- available before the prediction point,
- not leaked from the target/outcome.

Do not add arbitrary features simply to increase feature count.

---

# 7. Define the Prediction Point and Prevent Leakage

This is a critical requirement.

The model must simulate prediction **before the final result is known**.

### Regression target

```text
final_marks
```

### Classification target

```text
at_risk
```

The preferred current definition is:

```text
at_risk = 1 when final_marks < 40
at_risk = 0 otherwise
```

However, inspect the actual grade rules in the repository before hard-coding this threshold. If the application defines pass/fail differently, use the actual domain rule and document it.

### Leakage rule

Do NOT use any feature that contains or directly reveals the final result.

For example, if `final_marks` is the target, it cannot also be an input feature.

Similarly, do not derive a feature from final marks, final letter grade, or post-final information and feed it into the model.

Document the prediction point and leakage prevention in the notebook and README.

---

# 8. Data Extraction Layer

Create a reproducible extraction/aggregation script inside an `ai/` or similarly named directory, using the repository's existing backend stack rather than creating a second unrelated database layer.

Preferred project structure:

```text
ai/
├── data/
│   ├── raw/
│   └── processed/
├── notebooks/
│   └── student_performance_at_risk.ipynb
├── scripts/
│   └── export_student_academic_data.js
├── models/
├── reports/
└── README.md
```

Use an equivalent structure only when a better existing convention is already present.

The extraction script must:

1. Connect using the existing Prisma/backend database configuration.
2. Query the actual ERP data.
3. Aggregate attendance into attendance percentage at the student-course level.
4. Aggregate grade components into the chosen academic features.
5. Preserve stable identifiers required for joining/debugging, while excluding sensitive information from ML features.
6. Export a CSV or equivalent tabular dataset to the AI data directory.
7. Be rerunnable.
8. Fail clearly if the required database is unavailable.
9. Never overwrite the production database.

Use a safe read-only query path.

---

# 9. Dataset Size Reality Check

Inspect how much real academic data currently exists.

The seeded/demo dataset may be too small for meaningful machine learning.

### If the real ERP database contains enough records

Use the real ERP-derived data.

### If the ERP dataset is too small

Create a **separate reproducible development dataset** only for model development/testing.

Preferred approach:

- Use the same schema as the ERP-derived dataset.
- Generate realistic synthetic academic records with sensible statistical relationships.
- Make the synthetic-data generator deterministic using a fixed random seed.
- Clearly label synthetic data as synthetic.
- Never insert synthetic records into the production ERP database just to inflate counts.
- Never claim synthetic-data model metrics are real-world ERP performance.

The notebook must state exactly which dataset was used.

If synthetic data is necessary, implement the generator under something like:

```text
ai/scripts/generate_demo_dataset.py
```

and produce a dataset large enough to demonstrate train/test splitting and model comparison, e.g. several hundred to a few thousand student-course rows.

Do not fabricate real institutional outcomes.

---

# 10. Google Colab Notebook

Create a polished Jupyter notebook that opens directly in Google Colab.

File:

```text
ai/notebooks/student_performance_at_risk.ipynb
```

The notebook MUST follow this structure:

## Section 1 — Problem Definition

Explain:

- Why student performance prediction matters.
- What the prediction point is.
- What data is available before the final outcome.
- Why early at-risk identification is useful.

## Section 2 — Import Libraries

Use, at minimum where appropriate:

```python
numpy
pandas
matplotlib
scikit-learn
```

Do not add libraries without a reason.

## Section 3 — Load Dataset

Load the canonical CSV.

Show:

```python
df.head()
df.shape
df.info()
df.describe()
```

## Section 4 — Data Understanding / EDA

Inspect:

- data types
- missing values
- duplicates
- feature distributions
- target distribution
- basic correlations where appropriate

Create useful visualizations using Matplotlib.

At minimum include:

1. Attendance vs final marks
2. Internal/midterm performance vs final marks
3. At-risk distribution
4. Model comparison visualization

Do not create dozens of meaningless plots.

## Section 5 — Data Cleaning

Handle:

- missing numerical values
- duplicate records
- invalid ranges
- malformed categorical values
- impossible attendance percentages
- impossible marks

Document every material decision.

Do not silently drop large portions of data.

## Section 6 — Feature Engineering

Create meaningful features, for example:

```text
attendance_percentage
assessment_average
internal_midterm_average
performance_trend
```

Only create features that make sense for the actual ERP data.

Avoid leakage.

## Section 7 — Feature Selection / Extraction

Demonstrate feature selection using a sensible and explainable method.

Possible methods:

- correlation inspection for regression
- mutual information
- model feature importance
- SelectKBest when appropriate

Do not overcomplicate the project with dimensionality reduction unless useful.

If PCA is not genuinely useful for this dataset, do not force PCA into the project.

## Section 8 — Feature Scaling

Demonstrate normalization and/or standardization appropriately.

Preferred baseline:

```python
StandardScaler
```

Use scaling where the chosen algorithm benefits from it.

Do not blindly scale tree models and then claim it was required.

## Section 9 — Train/Test Split

Use a reproducible split.

For classification, stratify by the target when the target distribution makes this appropriate.

Example:

```python
train_test_split(..., test_size=0.2, random_state=42, stratify=y)
```

For very small datasets, explain limitations rather than pretending the test estimate is highly reliable.

## Section 10 — Classification: At-Risk Prediction

Train at least:

1. Logistic Regression
2. Decision Tree Classifier
3. Random Forest Classifier

Use pipelines where appropriate so preprocessing is clean and reproducible.

Evaluate with:

- accuracy
- precision
- recall
- F1-score
- confusion matrix

Emphasize **recall** for at-risk detection because false negatives can mean failing to identify a student who needs support.

Do not select a model based on accuracy alone.

## Section 11 — Regression: Student Performance Prediction

Train at least one strong regression model.

Preferred:

```text
RandomForestRegressor
```

Optionally compare with a simple baseline such as Linear Regression when it adds educational value.

Evaluate using:

- MAE
- MSE
- RMSE
- R²

## Section 12 — Model Comparison

Create a clean comparison table.

For classification:

```text
Model | Accuracy | Precision | Recall | F1
```

For regression:

```text
Model | MAE | RMSE | R²
```

Explain why the selected model is preferred.

## Section 13 — Example Predictions

Create a few example predictions from held-out/test-like records.

Show:

```text
student/course
attendance
internal
midterm
assessment average
predicted final marks
risk probability / risk class
```

Do not use private student information in the report.

## Section 14 — Feature Importance / Interpretation

For tree-based models, show feature importance.

Explain what appears to influence predictions.

Do not claim causal relationships from feature importance.

Say "associated with prediction" rather than "causes".

## Section 15 — Limitations

Explicitly document:

- dataset size
- synthetic-data limitation if applicable
- model generalization limitations
- possibility of bias
- the fact that predictions are decision-support, not final academic judgments

## Section 16 — Conclusion and Future Work

Current result:

- performance prediction
- at-risk detection
- preprocessing and feature engineering pipeline

Future:

- attendance prediction
- course recommendation
- intervention recommendations
- richer historical data
- deployment/inference integration

Do not implement those future items now.

---

# 11. Data Preprocessing Must Be Reproducible

Do not perform important transformations manually in random notebook cells with no reusable logic.

Where practical, build preprocessing using scikit-learn pipelines / transformers.

For example:

```text
Raw data
   -> validation/cleaning
   -> feature engineering
   -> train/test split
   -> preprocessing pipeline
   -> model
```

Fit preprocessing only on the training data where appropriate.

Never compute global statistics using the full dataset before the split if doing so causes leakage.

---

# 12. Model Selection Rules

Prefer simple, explainable models that fit the CE scope.

### Classification

Baseline:

```text
Logistic Regression
```

Interpretable nonlinear model:

```text
Decision Tree
```

Strong ensemble:

```text
Random Forest
```

### Regression

Baseline:

```text
Linear Regression
```

Strong model:

```text
Random Forest Regressor
```

Do not jump to neural networks unless the data and educational objective clearly justify them. They are unnecessary for the current CE.

---

# 13. Handle Class Imbalance Properly

Inspect the at-risk class distribution.

If the classes are imbalanced:

- report the imbalance,
- use stratified splitting where appropriate,
- consider `class_weight='balanced'` for compatible models,
- evaluate recall/F1/confusion matrix,
- do not fabricate or blindly oversample data.

If SMOTE is used, apply it only to training data and only when appropriate. Do not apply SMOTE before train/test splitting.

---

# 14. Model Artifact Strategy

After the notebook works, save the selected trained model and preprocessing object in a reproducible form, e.g. using `joblib`.

Store artifacts under:

```text
ai/models/
```

Include:

- model
- scaler/preprocessor if separate
- feature list / metadata

Use deterministic settings/random seeds where possible.

If large model artifacts are not appropriate for git, add suitable ignore rules and document how to regenerate them.

---

# 15. Optional Minimal ERP Integration — ONLY If Safe and Small

The current CE scope does NOT require a production AI frontend.

Only after the ML pipeline is complete may you consider a minimal integration point.

If implemented, it should be small and clearly separated from existing ERP behavior.

A possible future interface is:

```text
GET /api/ai/student/:studentId/prediction
```

returning something conceptually like:

```json
{
  "studentId": "...",
  "courseId": "...",
  "predictedFinalMarks": 71.3,
  "riskClass": "LOW",
  "riskProbability": 0.18
}
```

However, do NOT build this if it materially increases project complexity or requires unsafe changes. The notebook + reproducible pipeline are the priority.

Do not expose model predictions to students as authoritative grades.

---

# 16. Testing Requirements

Before declaring completion:

### Existing ERP

Run the existing test/build commands you discover from the repository.

Confirm existing functionality still works.

### ML pipeline

The ML code must:

- run from a clean environment or documented environment,
- load the expected dataset,
- finish preprocessing,
- train models,
- output metrics,
- produce plots without errors,
- save artifacts successfully.

Add lightweight automated tests for important data transformations if the repository structure allows it.

At minimum test things such as:

- attendance percentage calculation,
- marks aggregation,
- target construction,
- invalid-value handling,
- feature columns matching the model's expected schema.

---

# 17. Documentation Requirements

Create:

```text
ai/README.md
```

It must explain:

1. What the ML module does.
2. How it connects to the ERP.
3. Dataset schema.
4. Prediction target.
5. Leakage prevention.
6. Preprocessing pipeline.
7. Features.
8. Models.
9. Evaluation metrics.
10. How to reproduce the experiment.
11. Where outputs/models are stored.
12. Limitations.
13. Future work.

Also create a concise top-level note only if the existing project documentation structure makes this useful.

---

# 18. CE/Viva Readiness

The implementation must make the following questions easy to answer:

### Why this problem?

Because academic data already exists in the ERP and early prediction can help identify students needing attention before final outcomes are known.

### Why machine learning?

Because the project is explicitly about learning patterns from historical/representative academic data rather than using only manually written rules.

### Is this classification or regression?

- Final marks prediction = regression
- At-risk prediction = classification

### Why train/test split?

To evaluate how the model performs on unseen data.

### Why standardization?

To place numerical features on comparable scales for algorithms that are sensitive to feature magnitude.

### Why not use final marks as an input?

Because that would leak the answer into the model.

### Why recall for at-risk detection?

Because missing a genuinely at-risk student is potentially more harmful than flagging an additional student for review.

### Why Random Forest?

It can model nonlinear relationships, handles mixed feature behavior reasonably well, and is easy to compare against simpler baselines while remaining within the scikit-learn/CE scope.

### Is the model perfect?

No. Predictions depend on data quality, dataset size, feature availability, and model assumptions. The system is decision support, not an unquestionable academic authority.

---

# 19. PPT-Ready Outputs

The implementation should make it easy to create a CE PPT with approximately these slides:

1. Title
2. Problem Statement
3. Existing ERP + Proposed AI/ML Layer
4. Objectives
5. Dataset / ERP Data Sources
6. Data Preprocessing
7. Feature Engineering
8. Model Architecture / Algorithms
9. Results / Model Comparison
10. Example Student Prediction
11. Limitations
12. Future Scope
13. Conclusion

Generate clean tables/figures that can be reused in slides.

Do not create a PPT automatically unless explicitly requested.

---

# 20. Quality Bar

The finished implementation must be:

- technically correct,
- reproducible,
- understandable to a B.E. CSE student,
- aligned with the current CE syllabus,
- based on the existing ERP rather than an unrelated standalone project,
- conservative about claims,
- free of data leakage,
- easy to demonstrate in a viva,
- small enough for a solo student to maintain.

Do not optimize for feature count.
Optimize for a clean story:

> **ERP data → preprocessing → engineered features → ML → evaluation → student performance + risk prediction.**

---

# 21. Execution Strategy for Claude Code

Do the work in this order and do not skip ahead:

### Phase A — Repository discovery

- inspect repo
- inspect schema
- inspect data flows
- inspect scripts/tests
- establish baseline

### Phase B — ML architecture

- create `ai/` structure
- define canonical dataset schema
- define prediction point
- define targets
- document leakage rules

### Phase C — Data extraction

- implement ERP-to-dataset export
- run it safely
- validate row grain and values

### Phase D — Dataset adequacy

- quantify real data
- use real ERP data when sufficient
- otherwise generate clearly labeled synthetic development data

### Phase E — Notebook

- implement complete Colab-compatible notebook
- preprocessing
- EDA
- feature engineering
- feature selection
- scaling
- train/test split
- classification
- regression
- evaluation
- visualizations
- example predictions

### Phase F — Reproducibility

- save model artifacts
- add tests
- add documentation
- add setup/run instructions

### Phase G — Validation

- run the ERP checks/build/tests
- run the ML pipeline end to end
- fix errors
- verify no unrelated functionality was broken

### Phase H — Final review

Confirm all CE requirements are represented:

```text
[ ] NumPy
[ ] Pandas
[ ] Scikit-learn
[ ] Matplotlib
[ ] Data collection/integration
[ ] Data cleaning
[ ] Missing values
[ ] Data transformation
[ ] Feature engineering
[ ] Feature selection/extraction
[ ] Feature scaling
[ ] Training dataset
[ ] Testing dataset
[ ] Classification
[ ] Regression
[ ] Evaluation
[ ] Documentation
[ ] Reproducible execution
```

---

# 22. Important Behavioral Rules for This Task

1. **Do not ask unnecessary confirmation questions.** Inspect the repository and make reasonable implementation decisions.
2. If something is ambiguous, prefer the smallest implementation that satisfies the stated CE scope.
3. Do not rewrite unrelated ERP code.
4. Do not replace the existing framework/stack.
5. Do not introduce a new database.
6. Do not insert fake academic data into production just to train a model.
7. Do not claim model performance is meaningful when the dataset is too small.
8. Do not use target leakage.
9. Do not hard-code secrets.
10. Do not hide failures. Report them clearly and document prerequisites.
11. Use comments only where they improve understanding.
12. Keep naming consistent with the existing codebase.
13. Prefer deterministic seeds for experiments.
14. Prefer explainable ML over unnecessary complexity.
15. Keep the current implementation limited to **Student Performance + At-Risk Prediction**.

---

# 23. Definition of Done

You are done only when all of the following are true:

### Repository

- Existing ERP still builds/runs according to its current setup.
- Existing important tests still pass or any pre-existing failure is explicitly documented.

### Data

- A reproducible ERP extraction path exists.
- A canonical student-course ML dataset exists.
- Data validation/cleaning is implemented.
- Synthetic data, if needed, is clearly labeled and reproducible.

### ML

- Colab-compatible notebook exists.
- EDA exists.
- Feature engineering exists.
- Feature selection/extraction is demonstrated sensibly.
- Scaling is demonstrated appropriately.
- Train/test split is correct.
- At-risk classification models are trained/evaluated.
- Student-performance regression is trained/evaluated.
- Metrics and plots are generated.
- A final model is selected with a documented rationale.

### Reproducibility

- Model/preprocessing artifacts can be regenerated.
- README explains exact steps.
- No secrets are committed.

### Scope

- No unnecessary future AI modules are implemented.
- No needless frontend overhaul is performed.
- The project remains manageable for one student.

---

# 24. Final Output Expected From You

At the end of the implementation, provide a concise final report in the terminal/message with:

1. What files were created/modified.
2. How ERP data is converted into the ML dataset.
3. What dataset was actually used (real ERP vs synthetic development data).
4. Which features are used.
5. Which models were trained.
6. The final evaluation metrics.
7. Which model was selected and why.
8. How to open/run the Colab notebook.
9. Any limitations or unresolved issues.
10. Any small follow-up steps the student must do manually.

Do not declare success unless the implementation has actually been executed and validated as far as the environment allows.

---

# Start Now

Begin by inspecting the repository and establishing the current baseline. Then execute the phases above sequentially.

Do not build the future features.
Do not redesign the ERP.
Do not stop at a plan.

**Actually implement the complete current CE scope.**
