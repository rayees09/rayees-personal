from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Boolean, ForeignKey, JSON, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ImportantDate(Base):
    __tablename__ = "important_dates"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    date = Column(Date, nullable=False)
    date_type = Column(String(50), nullable=False)  # birthday, anniversary, holiday, etc.
    person_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    reminder_days_before = Column(Integer, default=7)
    is_recurring = Column(Boolean, default=True)  # Repeats every year
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Event(Base):
    __tablename__ = "events"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=False)
    end_date = Column(DateTime(timezone=True), nullable=True)
    all_day = Column(Boolean, default=False)
    location = Column(String(500), nullable=True)
    attendees = Column(JSON, nullable=True)  # List of user IDs
    reminder_minutes = Column(Integer, default=30)
    color = Column(String(20), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Habit(Base):
    __tablename__ = "habits"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(String(500), nullable=True)
    frequency = Column(String(20), default="daily")  # daily, weekly
    target = Column(Integer, default=1)  # Times per frequency
    current_streak = Column(Integer, default=0)
    best_streak = Column(Integer, default=0)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="habits")
    logs = relationship("HabitLog", back_populates="habit")


class HabitLog(Base):
    __tablename__ = "habit_logs"

    id = Column(Integer, primary_key=True, index=True)
    habit_id = Column(Integer, ForeignKey("habits.id"), nullable=False)
    date = Column(Date, nullable=False)
    completed = Column(Boolean, default=False)
    count = Column(Integer, default=0)  # How many times completed
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    habit = relationship("Habit", back_populates="logs")


class Meal(Base):
    __tablename__ = "meals"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    meal_type = Column(String(20), nullable=False)  # breakfast, lunch, dinner, suhoor, iftar
    name = Column(String(255), nullable=False)
    recipe_url = Column(String(500), nullable=True)
    ingredients = Column(JSON, nullable=True)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GroceryItem(Base):
    __tablename__ = "grocery_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    quantity = Column(String(50), nullable=True)
    category = Column(String(100), nullable=True)  # Produce, Dairy, Meat, etc.
    is_purchased = Column(Boolean, default=False)
    added_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SchoolSchedule(Base):
    __tablename__ = "school_schedule"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    subject = Column(String(100), nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    teacher = Column(String(255), nullable=True)
    room = Column(String(50), nullable=True)
    notes = Column(String(255), nullable=True)


class FamilyReminder(Base):
    """Family-level reminders visible to all or specific members"""
    __tablename__ = "family_reminders"

    id = Column(Integer, primary_key=True, index=True)
    family_id = Column(Integer, ForeignKey("families.id"), nullable=True)  # Multi-tenant support
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    remind_at = Column(DateTime(timezone=True), nullable=False)
    reminder_type = Column(String(50), default="general")  # general, appointment, bill, school, islamic
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)  # daily, weekly, monthly
    for_users = Column(JSON, nullable=True)  # List of user IDs, null = all family
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class QuickTask(Base):
    """Simple personal/office tasks for Rayees with minimal fields"""
    __tablename__ = "quick_tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    category = Column(String(50), default="personal")  # personal, office, family, health, finance
    priority = Column(String(20), default="medium")  # low, medium, high, urgent
    due_date = Column(Date, nullable=True)
    due_time = Column(Time, nullable=True)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(500), nullable=True)
    is_today = Column(Boolean, default=False)  # Mark task for today
    sort_order = Column(Integer, default=0)  # For manual ordering
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


class AppSettings(Base):
    """Application-wide settings"""
    __tablename__ = "app_settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(String(500), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
