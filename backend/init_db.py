"""
Database Initialization Script for VeriFlow AI
Creates all SQLAlchemy tables matching database schema
"""

from app.models import Base
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL", "sqlite:///./veriflow.db")
print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}")

if db_url.startswith("postgres"):
    engine = create_engine(db_url, pool_pre_ping=True)
else:
    engine = create_engine(db_url, connect_args={"check_same_thread": False})

Base.metadata.create_all(engine)

print("Database schema initialized successfully!")
print("Created tables: users, documents, verifications, organizations, api_logs")
