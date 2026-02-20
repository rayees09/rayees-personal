from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, ForeignKey, JSON, Date, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Family(Base):
    """Family entity - each registered family gets one."""
    __tablename__ = "families"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    owner_email = Column(String(255), nullable=False)
    country = Column(String(100), nullable=True)

    # Verification
    is_verified = Column(Boolean, default=False)
    verification_token = Column(String(255), nullable=True)
    verification_sent_at = Column(DateTime(timezone=True), nullable=True)
    verified_at = Column(DateTime(timezone=True), nullable=True)

    # Status
    is_active = Column(Boolean, default=True)
    subscription_plan = Column(String(50), default="free")  # free, basic, premium

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    members = relationship("User", back_populates="family")
    features = relationship("FamilyFeature", back_populates="family")
    ai_limit = relationship("FamilyAiLimit", back_populates="family", uselist=False)
    token_usage = relationship("AiTokenUsage", back_populates="family")


class FamilyFeature(Base):
    """Feature flags per family - controls which features are enabled."""
    __tablename__ = "family_features"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=False)
    feature_key = Column(String(50), nullable=False)  # prayers, ramadan, quran, learning, etc.
    is_enabled = Column(Boolean, default=True)
    config_json = Column(JSON, nullable=True)  # Additional configuration per feature
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    family = relationship("Family", back_populates="features")


class FamilyAiLimit(Base):
    """Monthly AI token/cost limits per family."""
    __tablename__ = "family_ai_limits"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), unique=True, nullable=False)
    monthly_token_limit = Column(Integer, default=100000)  # Default 100k tokens/month
    current_month_usage = Column(Integer, default=0)
    # Cost-based limits (default $0.20 = 20 cents)
    monthly_cost_limit_usd = Column(Float, default=0.20)
    current_month_cost_usd = Column(Float, default=0.0)
    reset_date = Column(Date, nullable=True)  # When to reset the counter

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    family = relationship("Family", back_populates="ai_limit")


# List of all available features
AVAILABLE_FEATURES = [
    {"key": "prayers", "name": "Prayer Tracking", "description": "Track daily prayers for family members"},
    {"key": "ramadan", "name": "Ramadan Features", "description": "Fasting logs, taraweeh tracking"},
    {"key": "quran", "name": "Quran Memorization", "description": "Track Quran memorization progress"},
    {"key": "learning", "name": "Learning Center", "description": "Homework analysis and worksheets"},
    {"key": "tasks", "name": "Family Tasks", "description": "Assign tasks to family members"},
    {"key": "my_tasks", "name": "Personal Tasks", "description": "Personal task management for parents"},
    {"key": "points", "name": "Points & Rewards", "description": "Point system and rewards shop"},
    {"key": "expenses", "name": "Expense Tracking", "description": "Track family expenses"},
    {"key": "zakat", "name": "Zakat Calculator", "description": "Zakat calculation and tracking"},
    {"key": "reminders", "name": "Reminders", "description": "Family reminders and notifications"},
    {"key": "chatgpt_ai", "name": "AI Features", "description": "ChatGPT-powered homework analysis and worksheets"},
]
