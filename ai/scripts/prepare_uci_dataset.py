"""
UCI Student Performance -> canonical ML dataset.

Maps the published UCI dataset onto the SAME schema the ERP extraction emits,
so both sources concatenate into one frame. This is the "data integration"
step of the CE syllabus.

Source : Cortez, P. (2008). Student Performance. UCI Machine Learning
         Repository. https://doi.org/10.24432/C5TG7T
License: CC BY 4.0

Why this dataset is used for training instead of the ERP's own data:
the ERP currently holds 30 gradeable enrollments and ZERO students below the
at-risk threshold. A binary classifier cannot be trained on a single class.
See ai/README.md section 7.

Usage:  python ai/scripts/prepare_uci_dataset.py
"""

import io
import os
import sys
import zipfile
import urllib.request

import pandas as pd

UCI_URL = "https://archive.ics.uci.edu/static/public/320/student+performance.zip"

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "..", "data", "raw")
OUT_FILE = os.path.join(RAW_DIR, "uci_student_course.csv")

# at_risk threshold on the 0-100 scale. Mirrors timetableInsights.gradeRisk
# (projected letter of F or P => below 40). See ai/README.md section 5.
AT_RISK_THRESHOLD = 40

# UCI grades are 0-20 (Portuguese scale). The ERP is 0-100.
GRADE_SCALE = 5

# UCI records raw absence COUNTS, not an attendance percentage. To align with
# the ERP's attendance_percentage we assume a nominal number of sessions per
# course and clip. This is an explicit modelling assumption, not a measurement.
NOMINAL_SESSIONS = 60

COLUMNS = [
    "source",
    "student_id",
    "course_code",
    "department",
    "course_type",
    "credits",
    "attendance_percentage",
    "classes_held",
    "internal_marks",
    "midterm_marks",
    "past_failures",
    "study_time",
    "final_marks",
    "at_risk",
]


def fetch_uci():
    """Download the UCI archive and return {filename: DataFrame}."""
    print(f"Downloading {UCI_URL}")
    try:
        with urllib.request.urlopen(UCI_URL, timeout=60) as resp:
            outer = zipfile.ZipFile(io.BytesIO(resp.read()))
    except Exception as exc:
        print(f"\nDownload FAILED: {exc}")
        print("The UCI archive is required. Check network access and retry.")
        sys.exit(1)

    # The archive nests a second zip inside the first.
    inner_name = next((n for n in outer.namelist() if n.endswith(".zip")), None)
    source = zipfile.ZipFile(io.BytesIO(outer.read(inner_name))) if inner_name else outer

    frames = {}
    for name in ("student-mat.csv", "student-por.csv"):
        with source.open(name) as fh:
            frames[name] = pd.read_csv(fh, sep=";")
        print(f"  read {name}: {len(frames[name])} rows")
    return frames


def to_canonical(df, subject_code, dept_code):
    """Map one UCI subject frame onto the canonical ERP schema."""
    out = pd.DataFrame()

    out["source"] = ["UCI"] * len(df)
    # Synthetic but stable identifiers. UCI rows are anonymous by design.
    out["student_id"] = [f"UCI{subject_code}{i:04d}" for i in range(len(df))]
    out["course_code"] = subject_code
    out["department"] = dept_code
    out["course_type"] = "MANDATORY"
    out["credits"] = 3

    # absences -> attendance_percentage (documented assumption above)
    attendance = 100.0 * (1.0 - df["absences"] / NOMINAL_SESSIONS)
    out["attendance_percentage"] = attendance.clip(lower=0.0, upper=100.0).round(2)
    out["classes_held"] = NOMINAL_SESSIONS

    # G1/G2/G3 are the three sequential assessments -> internal / midterm / final
    out["internal_marks"] = df["G1"] * GRADE_SCALE
    out["midterm_marks"] = df["G2"] * GRADE_SCALE
    out["final_marks"] = df["G3"] * GRADE_SCALE

    # UCI-only enrichment. The ERP has no equivalent, so these are blank for
    # ERP rows -- which is the missing-value case the notebook handles.
    out["past_failures"] = df["failures"]
    out["study_time"] = df["studytime"]

    out["at_risk"] = (out["final_marks"] < AT_RISK_THRESHOLD).astype(int)

    return out[COLUMNS]


def main():
    frames = fetch_uci()

    canonical = pd.concat(
        [
            to_canonical(frames["student-mat.csv"], "MAT101", "MAT"),
            to_canonical(frames["student-por.csv"], "POR101", "POR"),
        ],
        ignore_index=True,
    )

    os.makedirs(RAW_DIR, exist_ok=True)
    canonical.to_csv(OUT_FILE, index=False)

    n = len(canonical)
    at_risk = int(canonical["at_risk"].sum())
    print(f"\nCanonical rows written: {n}")
    print(f"  at_risk = 1: {at_risk} ({100 * at_risk / n:.1f}%)")
    print(f"  at_risk = 0: {n - at_risk} ({100 * (n - at_risk) / n:.1f}%)")
    print(f"  final_marks range: {canonical['final_marks'].min()}-{canonical['final_marks'].max()}")
    print(f"\nWritten to: {os.path.relpath(OUT_FILE, os.getcwd())}")


if __name__ == "__main__":
    main()
