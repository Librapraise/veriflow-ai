"""
SQLAlchemy Database Models matching PRD Section 6 Schema
"""

from datetime import datetime
import uuid
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, Float, Text
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'

    id = Column(String, primary_key=True, default=lambda: f"user_{uuid.uuid4().hex[:10]}")
    wallet = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    documents = relationship("Document", back_populates="user")
    verifications = relationship("Verification", back_populates="user")

class Document(Base):
    __tablename__ = 'documents'

    id = Column(String, primary_key=True, default=lambda: f"doc_{uuid.uuid4().hex[:10]}")
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    type = Column(String, nullable=False) # passport, drivers_license, payslip, etc.
    encrypted_path = Column(String, nullable=False) # Cloudflare R2 blob URL
    status = Column(String, default="encrypted_pending")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="documents")
    verifications = relationship("Verification", back_populates="document")

class Verification(Base):
    __tablename__ = 'verifications'

    id = Column(String, primary_key=True, default=lambda: f"ver_{uuid.uuid4().hex[:10]}")
    user_id = Column(String, ForeignKey('users.id'), nullable=False)
    document_id = Column(String, ForeignKey('documents.id'), nullable=False)
    type = Column(String, nullable=False) # claim type, e.g. age_above_18
    result = Column(Boolean, nullable=False)
    verified_at = Column(DateTime, default=datetime.utcnow)
    hash = Column(String, nullable=False)
    signature = Column(String, nullable=False)
    attestation_id = Column(String, nullable=False)

    user = relationship("User", back_populates="verifications")
    document = relationship("Document", back_populates="verifications")
    api_logs = relationship("ApiLog", back_populates="verification")

class Organization(Base):
    __tablename__ = 'organizations'

    id = Column(String, primary_key=True, default=lambda: f"org_{uuid.uuid4().hex[:10]}")
    name = Column(String, nullable=False)
    api_key = Column(String, unique=True, nullable=False, index=True)
    webhook_url = Column(String, nullable=True)

    api_logs = relationship("ApiLog", back_populates="organization")

class ApiLog(Base):
    __tablename__ = 'api_logs'

    id = Column(String, primary_key=True, default=lambda: f"log_{uuid.uuid4().hex[:10]}")
    organization_id = Column(String, ForeignKey('organizations.id'), nullable=False)
    verification_id = Column(String, ForeignKey('verifications.id'), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    status_code = Column(Integer, default=200)

    organization = relationship("Organization", back_populates="api_logs")
    verification = relationship("Verification", back_populates="api_logs")
