import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # ── Sightengine API ──────────────────────────────────────────────────
    SIGHTENGINE_API_USER   = os.getenv("SIGHTENGINE_API_USER",   "")
    SIGHTENGINE_API_SECRET = os.getenv("SIGHTENGINE_API_SECRET", "")

    # ── OpenRouter API (text analysis via GPT-3.5) ───────────────────────
    OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
    OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions"

    # ── HuggingFace API (image analysis) ────────────────────────────────
    HUGGINGFACE_API_KEY = os.getenv("HUGGINGFACE_API_KEY", "")

    # ── File paths ───────────────────────────────────────────────────────
    UPLOAD_FOLDER = "uploads"
    REPORT_FOLDER = "reports"
    DATABASE      = "database.db"

    # ── Flask config ─────────────────────────────────────────────────────
    SECRET_KEY          = os.getenv("SECRET_KEY", "change-this-in-production")
    MAX_CONTENT_LENGTH  = 16 * 1024 * 1024   # 16 MB

    # ── CORS — add your Vercel URL here after deploying ──────────────────
    CORS_ORIGINS = [
        "http://localhost:3000",
        "http://localhost:5000",
        "http://127.0.0.1:5500",       # VS Code Live Server
        os.getenv("FRONTEND_URL", ""),  # Set this on Render after Vercel deploy
        # e.g. "https://omnidetect-ai.vercel.app"
    ]

    # ── Admin credentials ────────────────────────────────────────────────
    ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
    ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")