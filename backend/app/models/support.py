from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class IssueStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IssuePriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class Issue(Base):
    """User-reported issues/feedback."""
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    subject = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    category = Column(String(50), default="general")  # bug, feature, question, other
    priority = Column(SQLEnum(IssuePriority), default=IssuePriority.MEDIUM)
    status = Column(SQLEnum(IssueStatus), default=IssueStatus.OPEN)

    # Contact info (in case user not logged in)
    contact_email = Column(String(255), nullable=True)

    # Admin response
    admin_notes = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class ActivityLog(Base):
    """User activity tracking with location."""
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)

    action = Column(String(50), nullable=False)  # login, register, logout, etc.
    details = Column(Text, nullable=True)  # Additional info

    # Location/Device info
    ip_address = Column(String(50), nullable=True)
    country = Column(String(100), nullable=True)
    city = Column(String(100), nullable=True)
    user_agent = Column(String(500), nullable=True)
    device_type = Column(String(50), nullable=True)  # mobile, desktop, tablet

    created_at = Column(DateTime(timezone=True), server_default=func.now())
