from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import List, Optional
from datetime import date, datetime, time, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.assistant import FamilyReminder, QuickTask, AppSettings
from app.services.auth import get_current_user

router = APIRouter(prefix="/api", tags=["Reminders & Tasks"])


# ============== SCHEMAS ==============

class ReminderCreate(BaseModel):
    title: str
    description: Optional[str] = None
    remind_at: datetime
    reminder_type: str = "general"  # general, appointment, bill, school, islamic
    priority: str = "medium"  # low, medium, high, urgent
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None  # daily, weekly, monthly
    for_users: Optional[List[int]] = None  # null = all family


class ReminderResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    remind_at: datetime
    reminder_type: str
    priority: str
    is_recurring: bool
    recurrence_pattern: Optional[str]
    for_users: Optional[List[int]]
    is_completed: bool
    created_by: Optional[int]

    class Config:
        from_attributes = True


class QuickTaskCreate(BaseModel):
    title: str
    category: str = "personal"  # personal, office, family, health, finance
    priority: str = "medium"
    due_date: Optional[date] = None
    due_time: Optional[time] = None
    notes: Optional[str] = None


class QuickTaskResponse(BaseModel):
    id: int
    title: str
    category: str
    priority: str
    due_date: Optional[date]
    due_time: Optional[time]
    is_completed: bool
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


# ============== FAMILY REMINDERS ==============

@router.post("/reminders", response_model=ReminderResponse)
async def create_reminder(
    reminder_data: ReminderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a family reminder."""
    reminder = FamilyReminder(
        title=reminder_data.title,
        description=reminder_data.description,
        remind_at=reminder_data.remind_at,
        reminder_type=reminder_data.reminder_type,
        priority=reminder_data.priority,
        is_recurring=reminder_data.is_recurring,
        recurrence_pattern=reminder_data.recurrence_pattern,
        for_users=reminder_data.for_users,
        created_by=current_user.id
    )
    db.add(reminder)
    db.commit()
    db.refresh(reminder)

    return reminder


@router.get("/reminders", response_model=List[ReminderResponse])
async def get_reminders(
    include_completed: bool = False,
    reminder_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reminders visible to the current user."""
    query = db.query(FamilyReminder)

    # Filter by user (reminders for all OR specifically for this user)
    query = query.filter(
        or_(
            FamilyReminder.for_users == None,
            FamilyReminder.for_users.contains([current_user.id])
        )
    )

    if not include_completed:
        query = query.filter(FamilyReminder.is_completed == False)

    if reminder_type:
        query = query.filter(FamilyReminder.reminder_type == reminder_type)

    reminders = query.order_by(FamilyReminder.remind_at.asc()).all()

    return reminders


@router.get("/reminders/upcoming", response_model=List[ReminderResponse])
async def get_upcoming_reminders(
    days: int = 7,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get upcoming reminders for the next X days."""
    now = datetime.utcnow()
    end_date = now + timedelta(days=days)

    reminders = db.query(FamilyReminder).filter(
        FamilyReminder.is_completed == False,
        FamilyReminder.remind_at >= now,
        FamilyReminder.remind_at <= end_date,
        or_(
            FamilyReminder.for_users == None,
            FamilyReminder.for_users.contains([current_user.id])
        )
    ).order_by(FamilyReminder.remind_at.asc()).all()

    return reminders


@router.put("/reminders/{reminder_id}/complete")
async def complete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a reminder as completed."""
    reminder = db.query(FamilyReminder).filter(FamilyReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_completed = True
    reminder.completed_at = datetime.utcnow()

    # If recurring, create next occurrence
    if reminder.is_recurring and reminder.recurrence_pattern:
        next_remind_at = _get_next_occurrence(reminder.remind_at, reminder.recurrence_pattern)
        new_reminder = FamilyReminder(
            title=reminder.title,
            description=reminder.description,
            remind_at=next_remind_at,
            reminder_type=reminder.reminder_type,
            priority=reminder.priority,
            is_recurring=True,
            recurrence_pattern=reminder.recurrence_pattern,
            for_users=reminder.for_users,
            created_by=reminder.created_by
        )
        db.add(new_reminder)

    db.commit()

    return {"message": "Reminder completed"}


@router.delete("/reminders/{reminder_id}")
async def delete_reminder(
    reminder_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a reminder."""
    reminder = db.query(FamilyReminder).filter(FamilyReminder.id == reminder_id).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    db.delete(reminder)
    db.commit()

    return {"message": "Reminder deleted"}


# ============== QUICK TASKS (for Rayees) ==============

@router.post("/quick-tasks", response_model=QuickTaskResponse)
async def create_quick_task(
    task_data: QuickTaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a quick personal/office task."""
    task = QuickTask(
        user_id=current_user.id,
        title=task_data.title,
        category=task_data.category,
        priority=task_data.priority,
        due_date=task_data.due_date,
        due_time=task_data.due_time,
        notes=task_data.notes
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    return task


@router.get("/quick-tasks", response_model=List[QuickTaskResponse])
async def get_quick_tasks(
    category: Optional[str] = None,
    include_completed: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quick tasks for the current user."""
    query = db.query(QuickTask).filter(QuickTask.user_id == current_user.id)

    if category:
        query = query.filter(QuickTask.category == category)

    if not include_completed:
        query = query.filter(QuickTask.is_completed == False)

    tasks = query.order_by(
        QuickTask.priority.desc(),
        QuickTask.due_date.asc().nullsfirst(),
        QuickTask.created_at.desc()
    ).all()

    return tasks


@router.get("/quick-tasks/by-category")
async def get_tasks_by_category(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get quick tasks grouped by category."""
    tasks = db.query(QuickTask).filter(
        QuickTask.user_id == current_user.id,
        QuickTask.is_completed == False
    ).all()

    grouped = {}
    for task in tasks:
        if task.category not in grouped:
            grouped[task.category] = []
        grouped[task.category].append({
            "id": task.id,
            "title": task.title,
            "priority": task.priority,
            "due_date": task.due_date.isoformat() if task.due_date else None,
            "due_time": task.due_time.isoformat() if task.due_time else None
        })

    return grouped


@router.put("/quick-tasks/{task_id}/complete")
async def complete_quick_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a quick task as completed."""
    task = db.query(QuickTask).filter(
        QuickTask.id == task_id,
        QuickTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_completed = True
    task.completed_at = datetime.utcnow()
    db.commit()

    return {"message": "Task completed"}


@router.delete("/quick-tasks/{task_id}")
async def delete_quick_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a quick task."""
    task = db.query(QuickTask).filter(
        QuickTask.id == task_id,
        QuickTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted"}


@router.put("/quick-tasks/{task_id}")
async def update_quick_task(
    task_id: int,
    title: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    due_date: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a quick task."""
    task = db.query(QuickTask).filter(
        QuickTask.id == task_id,
        QuickTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if title is not None:
        task.title = title
    if category is not None:
        task.category = category
    if priority is not None:
        task.priority = priority
    if due_date is not None:
        task.due_date = datetime.strptime(due_date, "%Y-%m-%d").date() if due_date else None
    if notes is not None:
        task.notes = notes

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "category": task.category,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "notes": task.notes
    }


# ============== APP SETTINGS ==============

@router.get("/settings/{key}")
async def get_setting(
    key: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get an app setting by key."""
    setting = db.query(AppSettings).filter(AppSettings.key == key).first()
    if not setting:
        return {"key": key, "value": None}
    return {"key": setting.key, "value": setting.value}


@router.put("/settings/{key}")
async def set_setting(
    key: str,
    value: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set an app setting."""
    from app.models.user import UserRole
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can change settings")

    setting = db.query(AppSettings).filter(AppSettings.key == key).first()
    if setting:
        setting.value = value
    else:
        setting = AppSettings(key=key, value=value)
        db.add(setting)

    db.commit()
    return {"key": key, "value": value, "message": "Setting saved"}


@router.get("/settings")
async def get_all_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all app settings."""
    settings = db.query(AppSettings).all()
    return {s.key: s.value for s in settings}


# ============== HELPER FUNCTIONS ==============

def _get_next_occurrence(current: datetime, pattern: str) -> datetime:
    """Calculate the next occurrence based on recurrence pattern."""
    if pattern == "daily":
        return current + timedelta(days=1)
    elif pattern == "weekly":
        return current + timedelta(weeks=1)
    elif pattern == "monthly":
        # Add roughly one month
        return current + timedelta(days=30)
    else:
        return current + timedelta(days=1)
