"""
Export the tuned Random Forest at-risk classifier to JSON so the ERP can score
it in Node (server/lib/mlRisk.js) without a Python service.

Input : ai/models/at_risk_classifier.joblib   (written by the notebook, section 24)
Output: server/lib/ml/atRiskModel.json         (committed; model parameters only)
        server/lib/__tests__/fixtures/mlRiskExpected.json
                                               (synthetic feature rows + the
                                                sklearn predict_proba for each,
                                                used as the JS scorer's oracle)

The JSON holds the fitted preprocessing (imputer medians/modes, one-hot
categories, feature order) and every tree as flat arrays:

    f[i]  feature index split on at node i, or -1 for a leaf
    t[i]  split threshold  (go LEFT when float32(x) <= t)
    r[i]  index of the right child (the left child is always i + 1 in
          scikit-learn's depth-first node layout; asserted below)
    v[i]  P(at_risk = 1) at node i, normalised from tree_.value

No training rows, student identifiers or CSV data are written. The fixture rows
are hand-made feature combinations, not records from any dataset.

Usage:  python ai/scripts/export_at_risk_model.py
"""
import json
import os
from datetime import datetime, timezone

import joblib
import numpy as np
import pandas as pd
import sklearn

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MODEL_IN = os.path.join(ROOT, "ai", "models", "at_risk_classifier.joblib")
META_IN = os.path.join(ROOT, "ai", "models", "model_metadata.json")
MODEL_OUT = os.path.join(ROOT, "server", "lib", "ml", "atRiskModel.json")
FIXTURE_OUT = os.path.join(ROOT, "server", "lib", "__tests__", "fixtures", "mlRiskExpected.json")

NUMERIC = ["attendance_percentage", "internal_marks", "midterm_marks",
           "internal_midterm_average", "performance_trend"]
CATEGORICAL = ["department", "course_type", "attendance_band"]


def engineer(frame):
    # Identical to the notebook's engineer() (section 8).
    out = frame.copy()
    out["internal_midterm_average"] = out[["internal_marks", "midterm_marks"]].mean(axis=1)
    out["performance_trend"] = out["midterm_marks"] - out["internal_marks"]
    out["attendance_band"] = pd.cut(
        out["attendance_percentage"], bins=[-np.inf, 65, 75, np.inf],
        labels=["CRITICAL", "WARNING", "SAFE"],
    ).astype(object)
    return out


def export_tree(est):
    tree = est.tree_
    n = tree.node_count
    left, right = tree.children_left, tree.children_right
    for i in range(n):
        if left[i] != -1:
            assert left[i] == i + 1, "unexpected node layout"
    value = tree.value[:, 0, :]
    p1 = value[:, 1] / value.sum(axis=1)
    feature = np.where(left == -1, -1, tree.feature)
    return {
        "f": [int(x) for x in feature],
        "t": [float(tree.threshold[i]) if left[i] != -1 else 0 for i in range(n)],
        "r": [int(right[i]) if left[i] != -1 else -1 for i in range(n)],
        "v": [round(float(x), 10) for x in p1],
    }


def main():
    pipe = joblib.load(MODEL_IN)
    with open(META_IN, encoding="utf-8") as fh:
        meta = json.load(fh)

    prep, model = pipe.named_steps["prep"], pipe.named_steps["model"]
    num = prep.named_transformers_["num"]
    cat = prep.named_transformers_["cat"]
    assert list(model.classes_) == [0, 1]

    names = [n.split("__", 1)[1] for n in prep.get_feature_names_out()]
    out = {
        "format": "erp-rf-v1",
        "exportedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "sklearnVersion": sklearn.__version__,
        "model": meta["classifier"]["model"],
        "trainingSources": meta["training_data"]["sources"],
        "cvF2": meta["classifier"]["cv_f2"],
        "testMetrics": meta["classifier"]["test_metrics"],
        "decisionThreshold": 0.5,
        "atRiskFinalMarksBelow": meta["targets"]["at_risk_threshold"],
        "numeric": NUMERIC,
        "numericMedians": [float(x) for x in num.statistics_],
        "categorical": CATEGORICAL,
        "categoricalModes": [str(x) for x in cat.named_steps["impute"].statistics_],
        "categories": [[str(c) for c in cs] for cs in cat.named_steps["encode"].categories_],
        "featureNames": names,
        "trees": [export_tree(est) for est in model.estimators_],
    }

    os.makedirs(os.path.dirname(MODEL_OUT), exist_ok=True)
    with open(MODEL_OUT, "w", encoding="utf-8") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print(f"Wrote {MODEL_OUT}  ({os.path.getsize(MODEL_OUT) / 1024:.0f} KB, "
          f"{len(out['trees'])} trees, {sum(len(t['f']) for t in out['trees'])} nodes)")

    # Oracle rows: hand-made, chosen to cover each branch of the preprocessing.
    rows = pd.DataFrame([
        # strong student, SAFE attendance, known dept
        dict(attendance_percentage=94.12, internal_marks=75, midterm_marks=78, department="CSE", course_type="MANDATORY"),
        # exactly 75% -> WARNING in the model (pd.cut is right-inclusive)
        dict(attendance_percentage=75.0, internal_marks=72, midterm_marks=74, department="CSE", course_type="MANDATORY"),
        # struggling student, CRITICAL attendance, falling marks
        dict(attendance_percentage=58.33, internal_marks=48, midterm_marks=31, department="CSE", course_type="MANDATORY"),
        # department never seen in training -> one-hot all zeros
        dict(attendance_percentage=70.0, internal_marks=42, midterm_marks=45, department="ME", course_type="ELECTIVE"),
        # exactly 65% -> CRITICAL, ECE elective, mid-range marks
        dict(attendance_percentage=65.0, internal_marks=60, midterm_marks=52, department="ECE", course_type="ELECTIVE"),
    ])
    X = engineer(rows)[NUMERIC + CATEGORICAL]
    proba = pipe.predict_proba(X)[:, 1]
    fixture = {
        "note": "Generated by ai/scripts/export_at_risk_model.py from the notebook's saved pipeline. Synthetic rows; no student data.",
        "rows": [
            {"input": r, "attendanceBand": b, "probability": float(p)}
            for r, b, p in zip(rows.to_dict("records"), X["attendance_band"], proba)
        ],
    }
    os.makedirs(os.path.dirname(FIXTURE_OUT), exist_ok=True)
    with open(FIXTURE_OUT, "w", encoding="utf-8") as fh:
        json.dump(fixture, fh, indent=2)
        fh.write("\n")
    print(f"Wrote {FIXTURE_OUT}")
    for r in fixture["rows"]:
        print(f"  {r['probability']:.6f}  {r['attendanceBand']:8}  {r['input']}")


if __name__ == "__main__":
    main()
