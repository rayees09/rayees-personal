from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class EmailProvider(str, enum.Enum):
    SMTP = "smtp"
    GMAIL = "gmail"
    ZOHO = "zoho"
    CUSTOM = "custom"


class Admin(Base):
    """Super Admin model for system-wide management."""
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    last_login = Column(DateTime(timezone=True), nullable=True)


class EmailConfig(Base):
    """Email configuration for the system (admin-managed)."""
    __tablename__ = "email_config"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(Enum(EmailProvider), default=EmailProvider.SMTP)
    smtp_host = Column(String(255), nullable=True)
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)  # Encrypted in production
    from_email = Column(String(255), nullable=True)
    from_name = Column(String(100), default="Family Hub")

    # Gmail/OAuth specific
    oauth_client_id = Column(String(255), nullable=True)
    oauth_client_secret = Column(String(255), nullable=True)
    oauth_refresh_token = Column(Text, nullable=True)

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
