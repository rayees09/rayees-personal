from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime, timedelta
from pydantic import BaseModel
from math import ceil
import os
import uuid
import base64

from app.database import get_db
from app.models.user import User
from app.models.islamic import QuranReadingGoal, QuranReadingLog, QURAN_TOTAL_PAGES
from app.services.auth import get_current_user
from app.services.ai_service import ai_service
from app.config import settings

router = APIRouter(prefix="/api/quran-goals", tags=["Quran Reading Goals"])


# Schemas
class GoalCreate(BaseModel):
    title: str = "Complete Quran in Ramadan"
    target_days: int = 25
    start_date: date
    total_pages: int = 604  # Allow custom page target (default full Quran)


class GoalResponse(BaseModel):
    id: int
    user_id: int
    title: str
    total_pages: int
    target_days: int
    pages_per_day: int
    start_date: date
    end_date: Optional[date]
    current_page: int
    pages_read_today: int
    days_elapsed: int
    days_remaining: int
    on_track: bool
    progress_percentage: float
    is_completed: bool

    class Config:
        from_attributes = True


class ReadingLogResponse(BaseModel):
    id: int
    date: date
    pages_read: int
    start_page: Optional[int]
    end_page: Optional[int]
    surah_name: Optional[str]
    image_url: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file and return the path."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"quran_{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return filepath


@router.post("/create", response_model=GoalResponse)
async def create_goal(
    goal_data: GoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new Quran reading goal."""
    # Check if active goal exists
    existing = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == current_user.id,
        QuranReadingGoal.is_completed == False
    ).first()

    if existing:
        raise HTTPException(status_code=400, detail="You already have an active goal")

    total_pages = goal_data.total_pages or QURAN_TOTAL_PAGES
    pages_per_day = ceil(total_pages / goal_data.target_days)
    end_date = goal_data.start_date + timedelta(days=goal_data.target_days)

    goal = QuranReadingGoal(
        user_id=current_user.id,
        title=goal_data.title,
        total_pages=total_pages,
        target_days=goal_data.target_days,
        pages_per_day=pages_per_day,
        start_date=goal_data.start_date,
        end_date=end_date,
        current_page=0
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return _build_goal_response(goal, db)


@router.get("/active", response_model=Optional[GoalResponse])
async def get_active_goal(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get the active Quran reading goal."""
    target_user = user_id or current_user.id

    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == target_user,
        QuranReadingGoal.is_completed == False
    ).first()

    if not goal:
        return None

    return _build_goal_response(goal, db)


@router.put("/update/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: int,
    title: Optional[str] = None,
    target_days: Optional[int] = None,
    start_date: Optional[str] = None,
    current_page: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an existing Quran reading goal."""
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.id == goal_id,
        QuranReadingGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    if title:
        goal.title = title
    if target_days:
        goal.target_days = target_days
        goal.pages_per_day = ceil(QURAN_TOTAL_PAGES / target_days)
    if start_date:
        goal.start_date = datetime.strptime(start_date, "%Y-%m-%d").date()
    if current_page is not None:
        goal.current_page = min(max(0, current_page), QURAN_TOTAL_PAGES)
        if goal.current_page >= QURAN_TOTAL_PAGES:
            goal.is_completed = True
            goal.completed_at = datetime.utcnow()
        else:
            goal.is_completed = False
            goal.completed_at = None

    db.commit()
    db.refresh(goal)

    return _build_goal_response(goal, db)


@router.delete("/delete/{goal_id}")
async def delete_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Quran reading goal."""
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.id == goal_id,
        QuranReadingGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    # Delete associated logs
    db.query(QuranReadingLog).filter(QuranReadingLog.goal_id == goal_id).delete()
    db.delete(goal)
    db.commit()

    return {"message": "Goal deleted successfully"}


@router.post("/log")
async def log_reading(
    pages_read: int = Form(...),
    start_page: Optional[int] = Form(None),
    end_page: Optional[int] = Form(None),
    surah_name: Optional[str] = Form(None),
    notes: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log Quran reading progress. Optionally upload a page image."""
    # Get active goal
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == current_user.id,
        QuranReadingGoal.is_completed == False
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="No active goal found. Create one first.")

    today = date.today()
    image_url = None

    # Handle image upload
    if file:
        image_url = save_uploaded_file(file)

        # If pages_read not provided, try to extract from image
        if pages_read == 0:
            with open(image_url, "rb") as f:
                image_data = base64.b64encode(f.read()).decode()

            # Use AI to extract page info
            try:
                result = await ai_service.extract_quran_page_info(image_data)
                if result.get("pages_identified"):
                    pages_read = result.get("pages_count", 1)
                    start_page = result.get("start_page", start_page)
                    end_page = result.get("end_page", end_page)
                    surah_name = result.get("surah_name", surah_name)
            except:
                pass  # Continue with manual input

    # Check if log exists for today
    existing_log = db.query(QuranReadingLog).filter(
        QuranReadingLog.goal_id == goal.id,
        QuranReadingLog.date == today
    ).first()

    if existing_log:
        # Update existing
        existing_log.pages_read += pages_read
        existing_log.end_page = end_page or existing_log.end_page
        if image_url:
            existing_log.image_url = image_url
        if notes:
            existing_log.notes = notes
        log = existing_log
    else:
        # Create new log
        log = QuranReadingLog(
            goal_id=goal.id,
            user_id=current_user.id,
            date=today,
            pages_read=pages_read,
            start_page=start_page,
            end_page=end_page,
            surah_name=surah_name,
            image_url=image_url,
            notes=notes
        )
        db.add(log)

    # Update goal progress
    total_read = db.query(func.sum(QuranReadingLog.pages_read)).filter(
        QuranReadingLog.goal_id == goal.id
    ).scalar() or 0

    goal.current_page = min(total_read, QURAN_TOTAL_PAGES)

    # Check if completed
    if goal.current_page >= QURAN_TOTAL_PAGES:
        goal.is_completed = True
        goal.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(log)

    return {
        "message": "Reading logged successfully!",
        "pages_logged": pages_read,
        "total_pages_read": goal.current_page,
        "remaining_pages": QURAN_TOTAL_PAGES - goal.current_page,
        "progress_percentage": round((goal.current_page / QURAN_TOTAL_PAGES) * 100, 1),
        "is_completed": goal.is_completed
    }


@router.post("/log-image")
async def log_reading_from_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload Quran page image - AI will extract page number and log automatically."""
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == current_user.id,
        QuranReadingGoal.is_completed == False
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="No active goal found. Create one first.")

    image_url = save_uploaded_file(file)

    with open(image_url, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    # Use AI to extract page info
    result = await ai_service.extract_quran_page_info(image_data)

    pages_read = result.get("pages_count", 1)
    start_page = result.get("start_page")
    end_page = result.get("end_page")
    surah_name = result.get("surah_name")

    today = date.today()

    # Check if log exists for today
    existing_log = db.query(QuranReadingLog).filter(
        QuranReadingLog.goal_id == goal.id,
        QuranReadingLog.date == today
    ).first()

    if existing_log:
        existing_log.pages_read += pages_read
        existing_log.end_page = end_page
        existing_log.image_url = image_url
        if surah_name:
            existing_log.surah_name = surah_name
        log = existing_log
    else:
        log = QuranReadingLog(
            goal_id=goal.id,
            user_id=current_user.id,
            date=today,
            pages_read=pages_read,
            start_page=start_page,
            end_page=end_page,
            surah_name=surah_name,
            image_url=image_url
        )
        db.add(log)

    # Update goal
    total_read = db.query(func.sum(QuranReadingLog.pages_read)).filter(
        QuranReadingLog.goal_id == goal.id
    ).scalar() or 0

    goal.current_page = min(total_read, QURAN_TOTAL_PAGES)

    if goal.current_page >= QURAN_TOTAL_PAGES:
        goal.is_completed = True
        goal.completed_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Page captured and logged!",
        "ai_detected": {
            "pages_count": pages_read,
            "start_page": start_page,
            "end_page": end_page,
            "surah_name": surah_name
        },
        "total_pages_read": goal.current_page,
        "remaining_pages": QURAN_TOTAL_PAGES - goal.current_page,
        "progress_percentage": round((goal.current_page / QURAN_TOTAL_PAGES) * 100, 1)
    }


@router.get("/logs", response_model=List[ReadingLogResponse])
async def get_reading_logs(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all reading logs for the active goal."""
    target_user = user_id or current_user.id

    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == target_user,
        QuranReadingGoal.is_completed == False
    ).first()

    if not goal:
        return []

    logs = db.query(QuranReadingLog).filter(
        QuranReadingLog.goal_id == goal.id
    ).order_by(QuranReadingLog.date.desc()).all()

    return logs


@router.put("/logs/{log_id}")
async def update_reading_log(
    log_id: int,
    pages_read: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a reading log entry."""
    log = db.query(QuranReadingLog).filter(
        QuranReadingLog.id == log_id,
        QuranReadingLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    old_pages = log.pages_read
    log.pages_read = pages_read

    # Update the goal's current page
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.id == log.goal_id
    ).first()

    if goal:
        total_read = db.query(func.sum(QuranReadingLog.pages_read)).filter(
            QuranReadingLog.goal_id == goal.id
        ).scalar() or 0
        goal.current_page = min(total_read, QURAN_TOTAL_PAGES)

        if goal.current_page >= QURAN_TOTAL_PAGES:
            goal.is_completed = True
            goal.completed_at = datetime.utcnow()
        else:
            goal.is_completed = False
            goal.completed_at = None

    db.commit()

    return {"message": "Log updated", "old_pages": old_pages, "new_pages": pages_read}


@router.delete("/logs/{log_id}")
async def delete_reading_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a reading log entry."""
    log = db.query(QuranReadingLog).filter(
        QuranReadingLog.id == log_id,
        QuranReadingLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    goal_id = log.goal_id
    pages_deleted = log.pages_read

    db.delete(log)

    # Update the goal's current page
    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.id == goal_id
    ).first()

    if goal:
        total_read = db.query(func.sum(QuranReadingLog.pages_read)).filter(
            QuranReadingLog.goal_id == goal.id
        ).scalar() or 0
        goal.current_page = min(total_read, QURAN_TOTAL_PAGES)
        goal.is_completed = False
        goal.completed_at = None

    db.commit()

    return {"message": "Log deleted", "pages_removed": pages_deleted}


@router.get("/stats")
async def get_reading_stats(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get detailed reading statistics."""
    target_user = user_id or current_user.id

    goal = db.query(QuranReadingGoal).filter(
        QuranReadingGoal.user_id == target_user,
        QuranReadingGoal.is_completed == False
    ).first()

    if not goal:
        return {"message": "No active goal"}

    logs = db.query(QuranReadingLog).filter(
        QuranReadingLog.goal_id == goal.id
    ).all()

    today = date.today()
    days_elapsed = (today - goal.start_date).days + 1
    expected_pages = goal.pages_per_day * days_elapsed

    daily_reading = {log.date.isoformat(): log.pages_read for log in logs}

    return {
        "goal": {
            "title": goal.title,
            "target_days": goal.target_days,
            "pages_per_day": goal.pages_per_day,
            "start_date": goal.start_date.isoformat(),
            "end_date": goal.end_date.isoformat() if goal.end_date else None
        },
        "progress": {
            "current_page": goal.current_page,
            "total_pages": QURAN_TOTAL_PAGES,
            "remaining_pages": QURAN_TOTAL_PAGES - goal.current_page,
            "percentage": round((goal.current_page / QURAN_TOTAL_PAGES) * 100, 1)
        },
        "tracking": {
            "days_elapsed": days_elapsed,
            "days_remaining": max(0, goal.target_days - days_elapsed),
            "expected_pages_by_now": expected_pages,
            "ahead_behind": goal.current_page - expected_pages,
            "on_track": goal.current_page >= expected_pages
        },
        "daily_reading": daily_reading,
        "total_days_read": len(logs),
        "average_pages_per_day": round(goal.current_page / max(1, days_elapsed), 1)
    }


def _build_goal_response(goal: QuranReadingGoal, db: Session) -> GoalResponse:
    """Build goal response with calculated fields."""
    today = date.today()
    days_elapsed = max(0, (today - goal.start_date).days + 1)
    days_remaining = max(0, goal.target_days - days_elapsed)
    expected_pages = goal.pages_per_day * days_elapsed
    target_total = goal.total_pages or QURAN_TOTAL_PAGES

    # Always calculate current_page from actual logs to ensure sync
    total_pages_read = db.query(func.sum(QuranReadingLog.pages_read)).filter(
        QuranReadingLog.goal_id == goal.id
    ).scalar() or 0
    current_page = min(total_pages_read, target_total)

    # Get today's reading
    today_log = db.query(QuranReadingLog).filter(
        QuranReadingLog.goal_id == goal.id,
        QuranReadingLog.date == today
    ).first()

    return GoalResponse(
        id=goal.id,
        user_id=goal.user_id,
        title=goal.title,
        total_pages=target_total,
        target_days=goal.target_days,
        pages_per_day=goal.pages_per_day,
        start_date=goal.start_date,
        end_date=goal.end_date,
        current_page=current_page,
        pages_read_today=today_log.pages_read if today_log else 0,
        days_elapsed=days_elapsed,
        days_remaining=days_remaining,
        on_track=current_page >= expected_pages,
        progress_percentage=round((current_page / target_total) * 100, 1),
        is_completed=goal.is_completed
    )
