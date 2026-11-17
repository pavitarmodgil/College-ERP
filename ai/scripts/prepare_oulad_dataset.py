"""
OULAD (Open University Learning Analytics Dataset) -> canonical ML dataset.

Third data source, added for CE-2. Maps real UK university records onto the
SAME schema the ERP export and the UCI script emit, so all three sources
concatenate into one frame.

Source : Kuzilek, J., Hlosta, M. & Zdrahal, Z. (2017). Open University
         Learning Analytics dataset. Scientific Data 4, 170171.
         UCI Machine Learning Repository. https://doi.org/10.24432/C5KK69
License: CC BY 4.0

Why this dataset
----------------
* It is UNIVERSITY data. UCI is secondary-school data; the ERP is a university.
* It carries a real final EXAM score on 0-100 - the same scale as the ERP.
* The Open University's pass mark is 40, the same as this project's at_risk
  threshold, so the label means the same thing in both systems.
* It records continuous assessment (TMA / CMA) before the exam, which maps
  naturally onto internal + midterm marks.

Only modules CCC and DDD have exam scores in the published data (6 module
presentations, 2013-2014). Every other module is excluded because it has no
final-exam outcome to learn from.

Mapping (one row = one student x one module presentation)
---------------------------------------------------------
final_marks           exam score (0-100)
internal_marks        weight-averaged score of the FIRST half of the
                      presentation's non-exam assessments, in date order
midterm_marks         the same for the SECOND half
                      (a missing submission counts as 0 - it earns no marks)
attendance_percentage % of course weeks with at least one VLE (online
                      learning environment) interaction. The OU is a distance
                      university, so online engagement is the closest
                      equivalent of attendance. This is a PROXY, not a register.
past_failures         num_of_prev_attempts on this module
study_time, credits,  not available -> left blank (handled as missing values
course_type           in the notebook)

Usage:  python ai/scripts/prepare_oulad_dataset.py [path/to/oulad.zip]
        With no argument the archive is downloaded (~45 MB).
"""

import io
import os
import sys
import zipfile
import urllib.request

import numpy as np
import pandas as pd

OULAD_URL = ("https://archive.ics.uci.edu/static/public/349/"
             "open+university+learning+analytics+dataset.zip")

HERE = os.path.dirname(os.path.abspath(__file__))
RAW_DIR = os.path.join(HERE, "..", "data", "raw")
OUT_FILE = os.path.join(RAW_DIR, "oulad_student_course.csv")

AT_RISK_THRESHOLD = 40          # same threshold as the ERP and UCI sources
EXAM_MODULES = ["CCC", "DDD"]   # the only modules with published exam scores

COLUMNS = [
    "source", "student_id", "course_code", "department", "course_type",
    "credits", "attendance_percentage", "classes_held", "internal_marks",
    "midterm_marks", "past_failures", "study_time", "final_marks", "at_risk",
]
KEY = ["code_module", "code_presentation", "id_student"]


def open_archive(path):
    if path:
        print(f"Using local archive {path}")
        return zipfile.ZipFile(path)
    print(f"Downloading {OULAD_URL}  (~45 MB)")
    try:
        with urllib.request.urlopen(OULAD_URL, timeout=300) as resp:
            return zipfile.ZipFile(io.BytesIO(resp.read()))
    except Exception as exc:
        print(f"\nDownload FAILED: {exc}")
        sys.exit(1)


def read(zf, name, **kw):
    with zf.open(name) as fh:
        return pd.read_csv(fh, na_values="?", **kw)


def coursework_marks(assessments, student_assessment, registered):
    """Split non-exam assessments chronologically into internal / midterm."""
    cw = assessments[assessments["assessment_type"] != "Exam"].copy()
    cw = cw.sort_values(["code_module", "code_presentation", "date", "id_assessment"])
    # first half of each presentation's assessments -> internal, rest -> midterm
    cw["rank"] = cw.groupby(["code_module", "code_presentation"]).cumcount()
    cw["n"] = cw.groupby(["code_module", "code_presentation"])["id_assessment"].transform("count")
    cw["part"] = np.where(cw["rank"] < np.ceil(cw["n"] / 2), "internal_marks", "midterm_marks")

    # every registered student x every coursework assessment of their presentation
    grid = registered[KEY].merge(
        cw[["code_module", "code_presentation", "id_assessment", "weight", "part"]],
        on=["code_module", "code_presentation"])
    grid = grid.merge(student_assessment[["id_assessment", "id_student", "score"]],
                      on=["id_assessment", "id_student"], how="left")
    grid["score"] = grid["score"].fillna(0.0)      # not submitted -> no marks earned

    # weight-averaged; fall back to equal weights where a block's weights sum to 0
    grid["w"] = grid["weight"].astype(float)
    grid["ws"] = grid["w"] * grid["score"]
    agg = grid.groupby(KEY + ["part"]).agg(ws=("ws", "sum"), w=("w", "sum"),
                                           mean=("score", "mean"))
    agg["mark"] = np.where(agg["w"] > 0, agg["ws"] / agg["w"].replace(0, np.nan), agg["mean"])
    return agg["mark"].unstack("part").reset_index()


def vle_engagement(zf, courses):
    """% of course weeks with at least one VLE interaction, per student."""
    print("Streaming studentVle.csv (~450 MB uncompressed, filtered to CCC/DDD)...")
    weeks = set()
    with zf.open("studentVle.csv") as fh:
        for chunk in pd.read_csv(fh, usecols=["code_module", "code_presentation",
                                              "id_student", "date"],
                                 chunksize=2_000_000):
            chunk = chunk[chunk["code_module"].isin(EXAM_MODULES) & (chunk["date"] >= 0)]
            chunk["week"] = chunk["date"] // 7
            weeks.update(map(tuple, chunk[KEY + ["week"]].drop_duplicates().to_numpy()))
    active = pd.DataFrame(list(weeks), columns=KEY + ["week"])
    active = active.groupby(KEY).size().rename("active_weeks").reset_index()

    lengths = courses.copy()
    lengths["classes_held"] = np.ceil(lengths["module_presentation_length"] / 7).astype(int)
    active = active.merge(lengths[["code_module", "code_presentation", "classes_held"]],
                          on=["code_module", "code_presentation"])
    active["attendance_percentage"] = (100 * active["active_weeks"] / active["classes_held"]).clip(0, 100).round(2)
    return active[KEY + ["attendance_percentage", "classes_held"]]


def main():
    zf = open_archive(sys.argv[1] if len(sys.argv) > 1 else None)

    assessments = read(zf, "assessments.csv")
    student_assessment = read(zf, "studentAssessment.csv")
    info = read(zf, "studentInfo.csv")
    courses = read(zf, "courses.csv")

    assessments = assessments[assessments["code_module"].isin(EXAM_MODULES)]
    info = info[info["code_module"].isin(EXAM_MODULES)]
    courses = courses[courses["code_module"].isin(EXAM_MODULES)]

    # --- final exam score (the label) ---------------------------------------
    exams = assessments[assessments["assessment_type"] == "Exam"][
        ["code_module", "code_presentation", "id_assessment"]]
    exam = (student_assessment.merge(exams, on="id_assessment")
            .dropna(subset=["score"])
            .sort_values("date_submitted")
            .drop_duplicates(subset=KEY, keep="first"))   # one exam result per student
    exam = exam[KEY + ["score"]].rename(columns={"score": "final_marks"})
    print(f"  students with an exam score: {len(exam)}")

    marks = coursework_marks(assessments, student_assessment, exam)
    vle = vle_engagement(zf, courses)

    df = (exam.merge(marks, on=KEY, how="left")
              .merge(vle, on=KEY, how="left")
              .merge(info[KEY + ["num_of_prev_attempts"]], on=KEY, how="left"))
    # a student with zero VLE activity in the window has 0% engagement, not unknown
    df["classes_held"] = df["classes_held"].fillna(
        df.groupby(["code_module", "code_presentation"])["classes_held"].transform("max"))
    df["attendance_percentage"] = df["attendance_percentage"].fillna(0.0)

    out = pd.DataFrame({
        "source": "OULAD",
        "student_id": "OU" + df["id_student"].astype(str),
        "course_code": df["code_module"] + "-" + df["code_presentation"],
        "department": df["code_module"],
        "course_type": np.nan,          # not recorded by the OU
        "credits": np.nan,              # module credit value not published
        "attendance_percentage": df["attendance_percentage"],
        "classes_held": df["classes_held"].astype(int),
        "internal_marks": df["internal_marks"].round(2),
        "midterm_marks": df["midterm_marks"].round(2),
        "past_failures": df["num_of_prev_attempts"],
        "study_time": np.nan,           # not recorded by the OU
        "final_marks": df["final_marks"].astype(float),
    })
    out["at_risk"] = (out["final_marks"] < AT_RISK_THRESHOLD).astype(int)
    out = out[COLUMNS]

    os.makedirs(RAW_DIR, exist_ok=True)
    out.to_csv(OUT_FILE, index=False)

    n, k = len(out), int(out["at_risk"].sum())
    print(f"\nCanonical rows written: {n}")
    print(f"  at_risk = 1: {k} ({100 * k / n:.1f}%)")
    print(f"  final_marks range: {out['final_marks'].min()}-{out['final_marks'].max()}")
    print(out.groupby("course_code").size().to_string())
    print(f"\nWritten to: {os.path.relpath(OUT_FILE, os.getcwd())}")


if __name__ == "__main__":
    main()
