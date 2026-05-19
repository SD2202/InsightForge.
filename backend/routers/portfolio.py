import os
import json
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter()

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "..", "results_cache")

@router.get("/portfolio")
def get_portfolio(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    """
    Returns a list of all jobs processed by the current user,
    including a brief extracted from the cached results.
    """
    jobs = db.query(models.Job).filter(models.Job.user_id == current_user.id).order_by(models.Job.created_at.desc()).all()
    
    portfolio_items = []
    
    for job in jobs:
        # Construct the basic job info
        item = {
            "job_id": job.job_id,
            "original_filename": job.original_filename,
            "file_size_mb": job.file_size_mb,
            "created_at": job.created_at,
            "status": job.status,
            "brief": None
        }
        
        # If processed, load the cached JSON to extract the brief (metadata and top insight)
        if job.status == "PROCESSED":
            cache_path = os.path.join(RESULTS_DIR, f"{job.job_id}.json")
            if os.path.exists(cache_path):
                try:
                    with open(cache_path, "r", encoding="utf-8") as f:
                        data = json.load(f)
                        
                    # Extract brief data to display on the portfolio card
                    metadata = data.get("metadata", {})
                    insights = data.get("insights", [])
                    
                    # Try to find a data quality score, otherwise just take the first insight
                    top_insight = None
                    for i in insights:
                        if i.get("category") == "Data Quality Score":
                            top_insight = i.get("text")
                            break
                    if not top_insight and insights:
                        top_insight = insights[0].get("text")
                        
                    item["brief"] = {
                        "rows": metadata.get("cleaned_rows", 0),
                        "cols": metadata.get("cleaned_cols", 0),
                        "top_insight": top_insight
                    }
                except Exception as e:
                    # Ignore parsing errors for the brief, UI can handle missing brief
                    print(f"Error loading cache for {job.job_id}: {e}")
                    
        portfolio_items.append(item)
        
    return portfolio_items


@router.delete("/portfolio/{job_id}")
def delete_job(
    job_id: str, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends(get_current_user)
):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    # 1. Delete physical files
    UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
    for ext in [".csv", ".xlsx", ".xls"]:
         path = os.path.join(UPLOADS_DIR, f"{job_id}{ext}")
         if os.path.exists(path):
             os.remove(path)
    
    # 2. Delete cache files
    for suffix in [".json", "_cleaned.csv"]:
        path = os.path.join(RESULTS_DIR, f"{job_id}{suffix}")
        if os.path.exists(path):
            os.remove(path)

    # 3. Delete DB record
    db.delete(job)
    db.commit()
    return {"message": "Job deleted successfully"}


@router.patch("/portfolio/{job_id}")
def rename_job(
    job_id: str,
    new_name: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    job = db.query(models.Job).filter(models.Job.job_id == job_id).first()
    if not job or job.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Job not found")

    # Ensure it keeps extension or adds .csv if missing
    if not any(new_name.lower().endswith(ext) for ext in [".csv", ".xlsx", ".xls"]):
        # Keep original extension if possible
        _, ext = os.path.splitext(job.original_filename)
        new_name = f"{new_name}{ext if ext else '.csv'}"

    job.original_filename = new_name
    db.commit()
    return {"message": "Job renamed successfully", "new_name": new_name}
