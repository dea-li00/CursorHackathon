from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session
import os
from pathlib import Path

# Database configuration
DATABASE_URL = "sqlite:///./invoiceiq.db"
engine = create_engine(DATABASE_URL, echo=False)

def create_db_and_tables():
    """Create database tables"""
    SQLModel.metadata.create_all(engine)

def get_session():
    """Get database session"""
    with Session(engine) as session:
        yield session
