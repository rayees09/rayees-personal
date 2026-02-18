from sqlalchemy import Column, Integer, String, Date, DateTime, Enum, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class UserRole(str, enum.Enum):
    PARENT = "parent"
    CHILD = "child"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    username = Column(String(50), unique=True, index=True, nullable=True)  # For kids login
    email = Column(String(255), unique=True, index=True, nullable=True)  # Optional for kids
    password_hash = Column(String(255), nullable=True)  # Password for all users
    role = Column(Enum(UserRole), default=UserRole.CHILD)
    dob = Column(Date, nullable=True)
    avatar = Column(String(255), nullable=True)
    school = Column(String(255), nullable=True)
    grade = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    tasks_assigned = relationship("Task", back_populates="assignee", foreign_keys="Task.assigned_to")
    tasks_created = relationship("Task", back_populates="creator", foreign_keys="Task.created_by")
    points = relationship("PointsLedger", back_populates="user")
    prayers = relationship("Prayer", back_populates="user")
    quran_progress = relationship("QuranProgress", back_populates="user")
    ramadan_days = relationship("RamadanDay", back_populates="user")
    weight_logs = relationship("WeightLog", back_populates="user")
    appointments = relationship("Appointment", back_populates="user")
    homework = relationship("Homework", back_populates="user")
    habits = relationship("Habit", back_populates="user")


class FamilyMember(Base):
    __tablename__ = "family_members"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    relationship_type = Column(String(50))  # father, mother, son, daughter

    user = relationship("User")
