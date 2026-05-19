"""
Results Router — GET /api/results/{job_id}
Returns cached analysis results for a given job_id.
"""
import os
import json
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse, FileResponse
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter()

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "..", "results_cache")


@router.get("/results/{job_id}")
def get_results(job_id: str):
    """
    Retrieve previously computed results by job_id.
    """
    cache_path = os.path.join(RESULTS_DIR, f"{job_id}.json")

    if not os.path.exists(cache_path):
        raise HTTPException(
            status_code=404,
            detail=f"Results not found for job_id={job_id}. Run POST /api/process first.",
        )

    with open(cache_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    return JSONResponse(status_code=200, content=payload)


@router.get("/results/{job_id}/download")
def download_results(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Download the cleaned CSV dataset.
    """
    # ── Verify Job Ownership ─────────────────────────────────────────────────
    job_record = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job_record or job_record.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Job not found or access denied")

    csv_path = os.path.join(RESULTS_DIR, f"{job_id}_cleaned.csv")
    if not os.path.exists(csv_path):
        raise HTTPException(
            status_code=404,
            detail="Cleaned CSV not found. Please re-run the processing pipeline."
        )

    # Determine a good download filename by appending "_cleaned" to original name
    original_name = job_record.original_filename
    name_base, name_ext = os.path.splitext(original_name)
    download_name = f"{name_base}_cleaned.csv"

    return FileResponse(
        path=csv_path,
        media_type="text/csv",
        filename=download_name
    )
