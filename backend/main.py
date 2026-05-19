"""
InsightForge Backend — FastAPI Main Entry Point
Handles CORS, mounts all routers, and initializes the uploads directory.
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from routers import upload, process, results, auth, portfolio
from database import init_db

# ── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="InsightForge API",
    description="Automatic data preprocessing, analysis, and insight generation",
    version="1.0.0",
)

@app.on_event("startup")
def on_startup():
    init_db()

# ── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Ensure uploads directory exists ──────────────────────────────────────────
UPLOADS_DIR = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

RESULTS_DIR = os.path.join(os.path.dirname(__file__), "results_cache")
os.makedirs(RESULTS_DIR, exist_ok=True)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix="/api", tags=["Auth"])
app.include_router(portfolio.router, prefix="/api", tags=["Portfolio"])
app.include_router(upload.router, prefix="/api", tags=["Upload"])
app.include_router(process.router, prefix="/api", tags=["Process"])
app.include_router(results.router, prefix="/api", tags=["Results"])


@app.get("/")
def root():
    return {"message": "InsightForge API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
