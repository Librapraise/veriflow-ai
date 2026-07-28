"""
Database Initialization Script for VeriFlow AI
Creates all SQLAlchemy tables matching PRD Section 6
"""

from app.models import Base
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv

load_dotenv()

db_url = os.getenv("DATABASE_URL")
print(f"Connecting to database: {db_url}")

engine = create_engine(db_url)
Base.metadata.create_all(engine)

print("Database schema initialized successfully!")
print("Created tables: users, documents, verifications, organizations, api_logs")
