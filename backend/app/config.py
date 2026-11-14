"""
app/config.py
Owner: Girish (Module 1 - Admin & Auth)

Loads environment variables from .env using python-dotenv.
Other modules and database connections read their configuration from here.
"""

import os
from pathlib import Path
from dotenv import load_dotenv

# Look exclusively for backend/.env file (one level above this app/ folder)
backend_dir = Path(__file__).resolve().parent.parent
env_path = backend_dir / ".env"

# Load environment variables only from backend/.env if it exists
if env_path.is_file():
    load_dotenv(dotenv_path=env_path)


class Config:
    """Central configuration class for the Flask backend."""

    # Supabase PostgreSQL session pooler connection string (port 5432)
    DATABASE_URL = os.getenv("DATABASE_URL", "")

    # Supabase API credentials
    SUPABASE_URL = os.getenv("SUPABASE_URL", "").rstrip("/")
    SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "")
    SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

    # Flask settings
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_SECRET_KEY = os.getenv("FLASK_SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = FLASK_ENV == "development"
