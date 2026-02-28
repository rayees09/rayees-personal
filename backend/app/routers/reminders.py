from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, cast, String
from sqlalchemy.dialects.postgresql import JSONB
from typing import List, Optional
from datetime import date, datetime, time, timedelta
from pydantic import BaseModel

from app.database import get_db
from app.models.user import User
from app.models.assistant import FamilyReminder, QuickTask, AppSettings, Note
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
    notes_previous: Optional[str] = None  # For undo functionality
    is_today: bool = False
    sort_order: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# ============== NOTES SCHEMAS ==============

class NoteCreate(BaseModel):
    title: str
    content: Optional[str] = None
    category: str = "personal"  # personal, office, family, business, finance
    shared_with: Optional[List[int]] = None  # List of user IDs to share with


class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    shared_with: Optional[List[int]] = None  # List of user IDs to share with


class NoteResponse(BaseModel):
    id: int
    user_id: int
    title: str
    content: Optional[str]
    content_previous: Optional[str]
    category: str
    is_pinned: bool
    is_archived: bool
    shared_with: Optional[List[int]] = None
    owner_name: Optional[str] = None  # Name of note owner (for shared notes)
    is_owner: bool = True  # Whether current user owns this note
    updated_at: datetime
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
        family_id=current_user.family_id,
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
    # Filter by family first
    query = db.query(FamilyReminder).filter(
        FamilyReminder.family_id == current_user.family_id
    )

    # Filter by user (reminders for all OR specifically for this user)
    # Use text cast to check if user ID is in the JSON array
    query = query.filter(
        or_(
            FamilyReminder.for_users == None,
            cast(FamilyReminder.for_users, String).like(f'%{current_user.id}%')
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
        FamilyReminder.family_id == current_user.family_id,
        FamilyReminder.is_completed == False,
        FamilyReminder.remind_at >= now,
        FamilyReminder.remind_at <= end_date,
        or_(
            FamilyReminder.for_users == None,
            cast(FamilyReminder.for_users, String).like(f'%{current_user.id}%')
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
    reminder = db.query(FamilyReminder).filter(
        FamilyReminder.id == reminder_id,
        FamilyReminder.family_id == current_user.family_id
    ).first()
    if not reminder:
        raise HTTPException(status_code=404, detail="Reminder not found")

    reminder.is_completed = True
    reminder.completed_at = datetime.utcnow()

    # If recurring, create next occurrence
    if reminder.is_recurring and reminder.recurrence_pattern:
        next_remind_at = _get_next_occurrence(reminder.remind_at, reminder.recurrence_pattern)
        new_reminder = FamilyReminder(
            family_id=reminder.family_id,
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
    reminder = db.query(FamilyReminder).filter(
        FamilyReminder.id == reminder_id,
        FamilyReminder.family_id == current_user.family_id
    ).first()
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

    # Sort: today's tasks first, then by sort_order, then by priority
    tasks = query.order_by(
        QuickTask.is_today.desc(),
        QuickTask.sort_order.asc(),
        QuickTask.priority.desc(),
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
    """Update a quick task. Saves previous notes for undo."""
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
    if notes is not None and notes != task.notes:
        # Save previous notes for undo (only if notes actually changed)
        task.notes_previous = task.notes
        task.notes = notes

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "title": task.title,
        "category": task.category,
        "priority": task.priority,
        "due_date": task.due_date.isoformat() if task.due_date else None,
        "notes": task.notes,
        "notes_previous": task.notes_previous,
        "is_today": task.is_today,
        "sort_order": task.sort_order
    }


@router.post("/quick-tasks/{task_id}/undo-notes")
async def undo_task_notes(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Undo the last notes edit by restoring previous notes."""
    task = db.query(QuickTask).filter(
        QuickTask.id == task_id,
        QuickTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if not task.notes_previous:
        raise HTTPException(status_code=400, detail="No previous notes available")

    # Swap current and previous notes
    current_notes = task.notes
    task.notes = task.notes_previous
    task.notes_previous = current_notes

    db.commit()
    db.refresh(task)

    return {
        "id": task.id,
        "notes": task.notes,
        "notes_previous": task.notes_previous
    }


@router.put("/quick-tasks/{task_id}/toggle-today")
async def toggle_task_today(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a task's 'today' status."""
    task = db.query(QuickTask).filter(
        QuickTask.id == task_id,
        QuickTask.user_id == current_user.id
    ).first()

    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.is_today = not task.is_today
    db.commit()

    return {"id": task.id, "is_today": task.is_today}


class ReorderRequest(BaseModel):
    task_ids: List[int]


@router.put("/quick-tasks/reorder")
async def reorder_tasks(
    request: ReorderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reorder tasks by setting sort_order based on the task_ids list order."""
    for index, task_id in enumerate(request.task_ids):
        task = db.query(QuickTask).filter(
            QuickTask.id == task_id,
            QuickTask.user_id == current_user.id
        ).first()
        if task:
            task.sort_order = index

    db.commit()
    return {"message": "Tasks reordered"}


# ============== NOTES ==============

def parse_shared_with(shared_with_str: Optional[str]) -> List[int]:
    """Convert comma-separated string to list of user IDs."""
    if not shared_with_str:
        return []
    return [int(x) for x in shared_with_str.split(',') if x.strip()]

def serialize_shared_with(shared_with_list: Optional[List[int]]) -> Optional[str]:
    """Convert list of user IDs to comma-separated string."""
    if not shared_with_list:
        return None
    return ','.join(str(x) for x in shared_with_list)

def note_to_response(note: Note, current_user: User, db: Session) -> dict:
    """Convert Note model to response dict with computed fields."""
    shared_with_list = parse_shared_with(note.shared_with)
    is_owner = note.user_id == current_user.id
    owner_name = None
    if not is_owner:
        owner = db.query(User).filter(User.id == note.user_id).first()
        owner_name = owner.name if owner else "Unknown"

    return {
        "id": note.id,
        "user_id": note.user_id,
        "title": note.title,
        "content": note.content,
        "content_previous": note.content_previous,
        "category": note.category,
        "is_pinned": note.is_pinned,
        "is_archived": note.is_archived,
        "shared_with": shared_with_list if shared_with_list else None,
        "owner_name": owner_name,
        "is_owner": is_owner,
        "updated_at": note.updated_at,
        "created_at": note.created_at,
    }

@router.post("/notes")
async def create_note(
    note_data: NoteCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new note."""
    note = Note(
        user_id=current_user.id,
        title=note_data.title,
        content=note_data.content,
        category=note_data.category,
        shared_with=serialize_shared_with(note_data.shared_with)
    )
    db.add(note)
    db.commit()
    db.refresh(note)
    return note_to_response(note, current_user, db)


@router.get("/notes")
async def get_notes(
    category: Optional[str] = None,
    include_archived: bool = False,
    include_shared: bool = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all notes for the current user including notes shared with them."""
    # Get user's own notes
    own_query = db.query(Note).filter(Note.user_id == current_user.id)

    if category:
        own_query = own_query.filter(Note.category == category)

    if not include_archived:
        own_query = own_query.filter(Note.is_archived == False)

    own_notes = own_query.order_by(
        Note.is_pinned.desc(),
        Note.updated_at.desc()
    ).all()

    # Get notes shared with user
    shared_notes = []
    if include_shared:
        all_notes = db.query(Note).filter(
            Note.user_id != current_user.id,
            Note.shared_with.isnot(None),
            Note.is_archived == False
        ).all()

        # Filter notes that are shared with current user
        user_id_str = str(current_user.id)
        for note in all_notes:
            if note.shared_with:
                shared_ids = [x.strip() for x in note.shared_with.split(',')]
                if user_id_str in shared_ids:
                    if not category or note.category == category:
                        shared_notes.append(note)

    # Combine and return
    all_notes_response = [note_to_response(n, current_user, db) for n in own_notes]
    all_notes_response.extend([note_to_response(n, current_user, db) for n in shared_notes])

    # Sort: own notes first, then shared, both by updated_at
    all_notes_response.sort(key=lambda x: (not x['is_owner'], not x['is_pinned'], x['updated_at']), reverse=True)

    return all_notes_response


@router.get("/notes/{note_id}")
async def get_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single note by ID (if owner or shared with user)."""
    note = db.query(Note).filter(Note.id == note_id).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    # Check if user owns note or it's shared with them
    is_owner = note.user_id == current_user.id
    is_shared_with_user = False
    if note.shared_with:
        shared_ids = [x.strip() for x in note.shared_with.split(',')]
        is_shared_with_user = str(current_user.id) in shared_ids

    if not is_owner and not is_shared_with_user:
        raise HTTPException(status_code=404, detail="Note not found")

    return note_to_response(note, current_user, db)


@router.put("/notes/{note_id}")
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a note. Saves previous content for undo. Only owner can update."""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id  # Only owner can update
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found or you don't have permission to edit")

    # Save current content as previous before updating (for undo)
    if note_data.content is not None and note_data.content != note.content:
        note.content_previous = note.content
        note.content = note_data.content

    if note_data.title is not None:
        note.title = note_data.title
    if note_data.category is not None:
        note.category = note_data.category
    if note_data.shared_with is not None:
        note.shared_with = serialize_shared_with(note_data.shared_with)

    db.commit()
    db.refresh(note)
    return note_to_response(note, current_user, db)


@router.delete("/notes/{note_id}")
async def delete_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a note."""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    db.delete(note)
    db.commit()
    return {"message": "Note deleted"}


@router.post("/notes/{note_id}/undo", response_model=NoteResponse)
async def undo_note(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Undo the last edit by restoring previous content."""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    if not note.content_previous:
        raise HTTPException(status_code=400, detail="No previous version available")

    # Swap current and previous content
    current_content = note.content
    note.content = note.content_previous
    note.content_previous = current_content

    db.commit()
    db.refresh(note)
    return note_to_response(note, current_user, db)


@router.put("/notes/{note_id}/pin")
async def toggle_note_pin(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a note's pinned status."""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_pinned = not note.is_pinned
    db.commit()

    return {"id": note.id, "is_pinned": note.is_pinned}


@router.put("/notes/{note_id}/archive")
async def toggle_note_archive(
    note_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle a note's archived status."""
    note = db.query(Note).filter(
        Note.id == note_id,
        Note.user_id == current_user.id
    ).first()

    if not note:
        raise HTTPException(status_code=404, detail="Note not found")

    note.is_archived = not note.is_archived
    db.commit()

    return {"id": note.id, "is_archived": note.is_archived}


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
