from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class GoogleSheetsConfig(Base):
    """Configuration for Google Drive sync with OAuth tokens"""
    __tablename__ = "google_sheets_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)

    # OAuth tokens
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expiry = Column(DateTime(timezone=True), nullable=True)

    # Google account info
    google_email = Column(String(255), nullable=True)

    # Sync folder (optional - user can set after connecting)
    folder_id = Column(String(100), nullable=True)
    folder_name = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User")


class SyncLog(Base):
    """Log of sync operations"""
    __tablename__ = "sync_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    feature = Column(String(50), nullable=False)  # zakat, expenses, etc.
    year = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False)  # success, failed
    rows_synced = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
