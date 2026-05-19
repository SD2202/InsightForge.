import os
import uuid
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session

from database import get_db
import models
from routers.auth import get_current_user

router = APIRouter()

UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "..", "uploads")
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB
ALLOWED_EXTENSIONS = {".csv", ".xlsx", ".xls"}


@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...), 
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Upload a CSV or Excel dataset.
    Returns: job_id, filename, file_path, file_size
    """
    # ── Validate extension ────────────────────────────────────────────────────
    _, ext = os.path.splitext(file.filename)
    if ext.lower() not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{ext}'. Please upload CSV or Excel files.",
        )

    # ── Read & validate size ──────────────────────────────────────────────────
    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File exceeds 50 MB limit. Please upload a smaller dataset.",
        )

    # ── Generate unique job ID and save file ─────────────────────────────────
    job_id = str(uuid.uuid4())
    safe_name = f"{job_id}{ext.lower()}"
    save_path = os.path.join(UPLOADS_DIR, safe_name)

    os.makedirs(UPLOADS_DIR, exist_ok=True)
    with open(save_path, "wb") as f:
        f.write(content)
        
    # ── Save Job to DB ────────────────────────────────────────────────────────
    new_job = models.Job(
        job_id=job_id,
        user_id=current_user.id,
        original_filename=file.filename,
        file_size_mb=round(len(content) / (1024 * 1024), 2),
        status="UPLOADED"
    )
    db.add(new_job)
    db.commit()

    return JSONResponse(
        status_code=200,
        content={
            "job_id": job_id,
            "original_filename": file.filename,
            "stored_filename": safe_name,
            "file_size_bytes": len(content),
            "file_size_mb": new_job.file_size_mb,
            "message": "File uploaded successfully. Call POST /api/process to analyze.",
        },
    )
