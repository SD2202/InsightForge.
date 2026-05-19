"""
Process Router — POST /api/process
Reads the uploaded file by job_id, runs the full pipeline:
  1. Preprocessing
  2. Analysis
  3. Insight generation
Stores results in results_cache/ for later retrieval.
"""
import os
import json
import time
import traceback
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user
from engine.preprocessor import preprocess
from engine.analyzer import analyze
from engine.insight_generator import generate_insights

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
RESULTS_DIR = os.path.join(os.path.dirname(__file__), "..", "results_cache")


class ProcessRequest(BaseModel):
    job_id: str
    original_filename: str = ""


@router.post("/process")
async def process_dataset(
    req: ProcessRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Run the full analysis pipeline on a previously uploaded file.
    Returns: preprocessing report, insights, chart suggestions, preview rows.
    """
    job_id = req.job_id
    # ── Verify Job Ownership ─────────────────────────────────────────────────
    job_record = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job_record or job_record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Job not found or access denied")

    # ── Locate file ───────────────────────────────────────────────────────────
    file_path = None
    for ext in [".csv", ".xlsx", ".xls"]:
        candidate = os.path.join(UPLOADS_DIR, f"{job_id}{ext}")
        if os.path.exists(candidate):
            file_path = candidate
            break

    if file_path is None:
        raise HTTPException(
            status_code=404,
            detail=f"No uploaded file found for job_id={job_id}. Please upload first.",
        )

    start_time = time.time()

    try:
        # ── Step 1: Preprocess ────────────────────────────────────────────────
        preprocess_result = preprocess(file_path)
        cleaned_df = preprocess_result["cleaned_df"]
        preprocess_report = preprocess_result["report"]

        from engine.preprocessor import load_dataframe
        df_raw = load_dataframe(file_path)

        # ── Step 2: Analyze & Fully Process ──────────────────────────────────
        analysis_result, fully_cleaned_df = analyze(cleaned_df, df_raw=df_raw)

        # ── Step 3: Generate insights ─────────────────────────────────────────
        insights = generate_insights(preprocess_report, analysis_result, fully_cleaned_df)

        # ── Build response payload ────────────────────────────────────────────
        # Preview: first 10 rows of cleaned data as list of dicts
        preview_rows = fully_cleaned_df.head(10).fillna("").to_dict(orient="records")

        # Chart suggestions based on column types
        chart_suggestions = _build_chart_suggestions(analysis_result, fully_cleaned_df)

        processing_time = round(time.time() - start_time, 2)

        payload = {
            "job_id": job_id,
            "processing_time_seconds": processing_time,
            "metadata": {
                "original_rows": preprocess_report["original_rows"],
                "original_cols": preprocess_report["original_cols"],
                "cleaned_rows": len(fully_cleaned_df),
                "cleaned_cols": len(fully_cleaned_df.columns),
                "duplicates_removed": preprocess_report["duplicates_removed"],
                "columns_info": analysis_result["columns_info"],
            },
            "insights": insights,
            "chart_suggestions": chart_suggestions,
            "preview": preview_rows,
            "summary_stats": analysis_result.get("summary_stats", {}),
            "correlation": analysis_result.get("correlation", {}),
            "preprocessing_status_analysis": analysis_result.get("preprocessing_status_analysis", {}),
        }

        # ── Cache result ──────────────────────────────────────────────────────
        os.makedirs(RESULTS_DIR, exist_ok=True)
        cache_path = os.path.join(RESULTS_DIR, f"{job_id}.json")
        with open(cache_path, "w", encoding="utf-8") as f:
            json.dump(payload, f, default=str)

        # ── Save Cleaned CSV ──────────────────────────────────────────────────
        csv_path = os.path.join(RESULTS_DIR, f"{job_id}_cleaned.csv")
        fully_cleaned_df.to_csv(csv_path, index=False)

        # ── Update DB Status ──────────────────────────────────────────────────
        job_record.status = "PROCESSED"
        db.commit()

        return JSONResponse(status_code=200, content=payload)

    except Exception as exc:
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Processing failed: {str(exc)}\n\nTraceback:\n{tb}",
        )


def _build_chart_suggestions(analysis_result: dict, df) -> list:
    """
    Generate chart type suggestions per column based on detected types.
    """
    suggestions = []
    col_info = analysis_result.get("columns_info", {})

    numeric_cols = [c for c, t in col_info.items() if t == "numerical"]
    categorical_cols = [c for c, t in col_info.items() if t == "categorical"]
    correlated_pairs = analysis_result.get("top_correlations", [])

    # Histograms for numeric columns (top 5)
    for col in numeric_cols[:5]:
        suggestions.append({
            "type": "histogram",
            "title": f"Distribution of {col}",
            "column": col,
            "description": f"Shows how values in '{col}' are distributed.",
        })

    # Bar charts for categorical columns (top 3)
    for col in categorical_cols[:3]:
        suggestions.append({
            "type": "bar",
            "title": f"Frequency of {col}",
            "column": col,
            "description": f"Shows the count of each category in '{col}'.",
        })

    # Scatter plots for correlated pairs (top 3)
    for pair in correlated_pairs[:3]:
        suggestions.append({
            "type": "scatter",
            "title": f"{pair['col1']} vs {pair['col2']}",
            "x_column": pair["col1"],
            "y_column": pair["col2"],
            "correlation": pair["value"],
            "description": (
                f"Correlation of {pair['value']:.2f} detected between "
                f"'{pair['col1']}' and '{pair['col2']}'."
            ),
        })

    return suggestions
