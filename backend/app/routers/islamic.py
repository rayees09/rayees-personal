from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date, datetime

from app.database import get_db
from app.models.user import User
from app.models.islamic import (
    Prayer, PrayerName, PrayerStatus, QuranProgress, RamadanDay, SurahStatus, QURAN_SURAHS,
    RamadanGoal, RamadanGoalLog, ZakatConfig, ZakatPayment
)
from app.schemas.islamic import (
    PrayerCreate, PrayerUpdate, PrayerResponse, DailyPrayersResponse,
    QuranProgressCreate, QuranProgressUpdate, QuranProgressResponse,
    RamadanDayCreate, RamadanDayUpdate, RamadanDayResponse, RamadanSummaryResponse,
    RamadanGoalCreate, RamadanGoalResponse, RamadanGoalLogCreate, RamadanGoalLogResponse,
    ZakatConfigCreate, ZakatConfigResponse, ZakatPaymentCreate, ZakatPaymentResponse
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/islamic", tags=["Islamic Practice"])


def validate_family_member(user_id: int, current_user: User, db: Session) -> User:
    """Validate that user_id belongs to the current user's family."""
    user = db.query(User).filter(
        User.id == user_id,
        User.family_id == current_user.family_id
    ).first()
    if not user:
        raise HTTPException(
            status_code=404,
            detail="User not found in your family"
        )
    return user


# Prayer endpoints
@router.get("/prayers/{user_id}/{prayer_date}", response_model=DailyPrayersResponse)
async def get_daily_prayers(
    user_id: int,
    prayer_date: date,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all prayers for a user on a specific date."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(user_id, current_user, db)

    prayers = db.query(Prayer).filter(
        Prayer.user_id == user_id,
        Prayer.date == prayer_date
    ).all()

    # Create missing prayer entries
    existing_prayers = {p.prayer_name for p in prayers}
    daily_prayers = [PrayerName.FAJR, PrayerName.DHUHR, PrayerName.ASR, PrayerName.MAGHRIB, PrayerName.ISHA]

    for prayer_name in daily_prayers:
        if prayer_name not in existing_prayers:
            new_prayer = Prayer(
                user_id=user_id,
                prayer_name=prayer_name,
                date=prayer_date,
                status=PrayerStatus.NOT_PRAYED
            )
            db.add(new_prayer)
            prayers.append(new_prayer)

    db.commit()

    completed = sum(1 for p in prayers if p.status != PrayerStatus.NOT_PRAYED and p.prayer_name != PrayerName.TARAWEEH)

    return DailyPrayersResponse(
        date=prayer_date,
        user_id=user_id,
        prayers=[PrayerResponse.from_orm(p) for p in prayers],
        completed_count=completed,
        total_count=5
    )


@router.post("/prayers", response_model=PrayerResponse)
async def log_prayer(
    prayer_data: PrayerCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a prayer."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(prayer_data.user_id, current_user, db)

    # Check if prayer already exists
    existing = db.query(Prayer).filter(
        Prayer.user_id == prayer_data.user_id,
        Prayer.prayer_name == prayer_data.prayer_name,
        Prayer.date == prayer_data.date
    ).first()

    if existing:
        # Update existing
        existing.status = prayer_data.status
        existing.time_prayed = prayer_data.time_prayed
        existing.in_masjid = prayer_data.in_masjid
        db.commit()
        db.refresh(existing)
        return existing

    # Create new
    prayer = Prayer(**prayer_data.dict())
    db.add(prayer)
    db.commit()
    db.refresh(prayer)

    return prayer


@router.put("/prayers/{prayer_id}", response_model=PrayerResponse)
async def update_prayer(
    prayer_id: int,
    prayer_data: PrayerUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a prayer status."""
    prayer = db.query(Prayer).filter(Prayer.id == prayer_id).first()
    if not prayer:
        raise HTTPException(status_code=404, detail="Prayer not found")

    # Validate prayer belongs to family (SECURITY FIX)
    validate_family_member(prayer.user_id, current_user, db)

    for field, value in prayer_data.dict(exclude_unset=True).items():
        setattr(prayer, field, value)

    db.commit()
    db.refresh(prayer)

    return prayer


# Quran Progress endpoints

# NOTE: This route MUST be defined BEFORE /quran/{user_id} to avoid path parameter conflict
@router.get("/quran/surahs")
async def get_surahs():
    """Get list of all Quran surahs."""
    return [
        {"number": num, "name": name, "verses": verses}
        for num, name, verses in QURAN_SURAHS
    ]


@router.get("/quran/{user_id}", response_model=List[QuranProgressResponse])
async def get_quran_progress(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Quran memorization progress for a user."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(user_id, current_user, db)

    progress = db.query(QuranProgress).filter(
        QuranProgress.user_id == user_id
    ).order_by(QuranProgress.surah_number.desc()).all()

    result = []
    for p in progress:
        percentage = (p.verses_memorized / p.total_verses * 100) if p.total_verses > 0 else 0
        result.append(QuranProgressResponse(
            id=p.id,
            user_id=p.user_id,
            surah_number=p.surah_number,
            surah_name=p.surah_name,
            total_verses=p.total_verses,
            verses_memorized=p.verses_memorized,
            status=p.status,
            progress_percentage=round(percentage, 1),
            last_revision_date=p.last_revision_date
        ))

    return result


@router.post("/quran", response_model=QuranProgressResponse)
async def add_surah_progress(
    progress_data: QuranProgressCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add or update Quran memorization progress."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(progress_data.user_id, current_user, db)

    # Check if already exists
    existing = db.query(QuranProgress).filter(
        QuranProgress.user_id == progress_data.user_id,
        QuranProgress.surah_number == progress_data.surah_number
    ).first()

    if existing:
        existing.verses_memorized = progress_data.verses_memorized
        existing.status = progress_data.status
        db.commit()
        db.refresh(existing)
        progress = existing
    else:
        progress = QuranProgress(**progress_data.dict())
        progress.started_at = datetime.utcnow()
        db.add(progress)
        db.commit()
        db.refresh(progress)

    percentage = (progress.verses_memorized / progress.total_verses * 100) if progress.total_verses > 0 else 0

    return QuranProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        surah_number=progress.surah_number,
        surah_name=progress.surah_name,
        total_verses=progress.total_verses,
        verses_memorized=progress.verses_memorized,
        status=progress.status,
        progress_percentage=round(percentage, 1),
        last_revision_date=progress.last_revision_date
    )


@router.put("/quran/{progress_id}", response_model=QuranProgressResponse)
async def update_quran_progress(
    progress_id: int,
    progress_data: QuranProgressUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update Quran memorization progress."""
    progress = db.query(QuranProgress).filter(QuranProgress.id == progress_id).first()
    if not progress:
        raise HTTPException(status_code=404, detail="Progress not found")

    # Validate progress belongs to family (SECURITY FIX)
    validate_family_member(progress.user_id, current_user, db)

    for field, value in progress_data.dict(exclude_unset=True).items():
        setattr(progress, field, value)

    # Mark as completed if all verses memorized
    if progress.verses_memorized >= progress.total_verses:
        progress.status = SurahStatus.MEMORIZED
        progress.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(progress)

    percentage = (progress.verses_memorized / progress.total_verses * 100) if progress.total_verses > 0 else 0

    return QuranProgressResponse(
        id=progress.id,
        user_id=progress.user_id,
        surah_number=progress.surah_number,
        surah_name=progress.surah_name,
        total_verses=progress.total_verses,
        verses_memorized=progress.verses_memorized,
        status=progress.status,
        progress_percentage=round(percentage, 1),
        last_revision_date=progress.last_revision_date
    )


# Ramadan endpoints
@router.get("/ramadan/{user_id}", response_model=List[RamadanDayResponse])
async def get_ramadan_log(
    user_id: int,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Ramadan log for a user."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(user_id, current_user, db)

    query = db.query(RamadanDay).filter(RamadanDay.user_id == user_id)

    if year:
        query = query.filter(func.extract('year', RamadanDay.date) == year)

    days = query.order_by(RamadanDay.date.asc()).all()
    return days


@router.post("/ramadan", response_model=RamadanDayResponse)
async def log_ramadan_day(
    day_data: RamadanDayCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log a Ramadan day."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(day_data.user_id, current_user, db)

    # Check if already exists
    existing = db.query(RamadanDay).filter(
        RamadanDay.user_id == day_data.user_id,
        RamadanDay.date == day_data.date
    ).first()

    if existing:
        for field, value in day_data.dict(exclude_unset=True).items():
            setattr(existing, field, value)
        db.commit()
        db.refresh(existing)
        return existing

    day = RamadanDay(**day_data.dict())
    db.add(day)
    db.commit()
    db.refresh(day)

    return day


@router.put("/ramadan/{day_id}", response_model=RamadanDayResponse)
async def update_ramadan_day(
    day_id: int,
    day_data: RamadanDayUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a Ramadan day log."""
    day = db.query(RamadanDay).filter(RamadanDay.id == day_id).first()
    if not day:
        raise HTTPException(status_code=404, detail="Ramadan day not found")

    # Validate day belongs to family (SECURITY FIX)
    validate_family_member(day.user_id, current_user, db)

    for field, value in day_data.dict(exclude_unset=True).items():
        setattr(day, field, value)

    db.commit()
    db.refresh(day)

    return day


@router.get("/ramadan/{user_id}/summary", response_model=RamadanSummaryResponse)
async def get_ramadan_summary(
    user_id: int,
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Ramadan summary statistics."""
    # Validate user belongs to same family (SECURITY FIX)
    validate_family_member(user_id, current_user, db)

    query = db.query(RamadanDay).filter(RamadanDay.user_id == user_id)

    if year:
        query = query.filter(func.extract('year', RamadanDay.date) == year)

    days = query.all()

    return RamadanSummaryResponse(
        user_id=user_id,
        total_days=len(days),
        fasted_days=sum(1 for d in days if d.fasted),
        taraweeh_days=sum(1 for d in days if d.taraweeh),
        total_quran_pages=sum(d.quran_pages for d in days),
        charity_days=sum(1 for d in days if d.charity_given)
    )


# ============== RAMADAN GOALS ==============

@router.post("/ramadan-goals", response_model=RamadanGoalResponse)
async def create_ramadan_goal(
    goal_data: RamadanGoalCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a custom Ramadan goal."""
    goal = RamadanGoal(
        user_id=current_user.id,
        year=goal_data.year,
        title=goal_data.title,
        description=goal_data.description,
        target_value=goal_data.target_value,
        unit=goal_data.unit,
        goal_type=goal_data.goal_type
    )
    db.add(goal)
    db.commit()
    db.refresh(goal)

    return _build_ramadan_goal_response(goal, db)


@router.get("/ramadan-goals")
async def get_ramadan_goals(
    year: Optional[int] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Ramadan goals for a user."""
    target_user_id = user_id or current_user.id

    # Validate user belongs to same family if user_id specified (SECURITY FIX)
    if user_id:
        validate_family_member(user_id, current_user, db)

    query = db.query(RamadanGoal).filter(
        RamadanGoal.user_id == target_user_id,
        RamadanGoal.is_active == True
    )

    if year:
        query = query.filter(RamadanGoal.year == year)

    goals = query.all()
    return [_build_ramadan_goal_response(g, db) for g in goals]


@router.delete("/ramadan-goals/{goal_id}")
async def delete_ramadan_goal(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Ramadan goal."""
    goal = db.query(RamadanGoal).filter(
        RamadanGoal.id == goal_id,
        RamadanGoal.user_id == current_user.id
    ).first()

    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")

    db.delete(goal)
    db.commit()
    return {"message": "Goal deleted"}


@router.post("/ramadan-goals/log", response_model=RamadanGoalLogResponse)
async def log_ramadan_goal(
    log_data: RamadanGoalLogCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Log progress for a Ramadan goal."""
    # Validate goal belongs to family (SECURITY FIX)
    goal = db.query(RamadanGoal).filter(RamadanGoal.id == log_data.goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    validate_family_member(goal.user_id, current_user, db)

    # Check if log already exists for this date
    existing = db.query(RamadanGoalLog).filter(
        RamadanGoalLog.goal_id == log_data.goal_id,
        RamadanGoalLog.date == log_data.date
    ).first()

    if existing:
        existing.value = log_data.value
        existing.notes = log_data.notes
        db.commit()
        db.refresh(existing)
        return existing

    log = RamadanGoalLog(
        goal_id=log_data.goal_id,
        user_id=current_user.id,
        date=log_data.date,
        value=log_data.value,
        notes=log_data.notes
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get("/ramadan-goals/{goal_id}/logs")
async def get_ramadan_goal_logs(
    goal_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all logs for a Ramadan goal."""
    # Validate goal belongs to family (SECURITY FIX)
    goal = db.query(RamadanGoal).filter(RamadanGoal.id == goal_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    validate_family_member(goal.user_id, current_user, db)

    logs = db.query(RamadanGoalLog).filter(
        RamadanGoalLog.goal_id == goal_id
    ).order_by(RamadanGoalLog.date.desc()).all()
    return logs


@router.delete("/ramadan-goals/log/{log_id}")
async def delete_ramadan_goal_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Ramadan goal log entry."""
    log = db.query(RamadanGoalLog).filter(
        RamadanGoalLog.id == log_id,
        RamadanGoalLog.user_id == current_user.id
    ).first()

    if not log:
        raise HTTPException(status_code=404, detail="Log not found")

    db.delete(log)
    db.commit()
    return {"message": "Log deleted"}


def _build_ramadan_goal_response(goal: RamadanGoal, db: Session) -> dict:
    """Build response with computed fields."""
    logs = db.query(RamadanGoalLog).filter(RamadanGoalLog.goal_id == goal.id).all()
    total_completed = sum(log.value for log in logs)
    days_logged = len(logs)

    return {
        "id": goal.id,
        "user_id": goal.user_id,
        "year": goal.year,
        "title": goal.title,
        "description": goal.description,
        "target_value": goal.target_value,
        "unit": goal.unit,
        "goal_type": goal.goal_type,
        "is_active": goal.is_active,
        "total_completed": total_completed,
        "days_logged": days_logged
    }


# ============== ZAKAT ==============

@router.post("/zakat/config", response_model=ZakatConfigResponse)
async def create_zakat_config(
    config_data: ZakatConfigCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create or update Zakat configuration for a year (family-level)."""
    # Check if config exists for this year within the same family
    existing = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        ZakatConfig.year == config_data.year,
        User.family_id == current_user.family_id
    ).first()

    if existing:
        existing.total_due = config_data.total_due
        existing.currency = config_data.currency
        existing.notes = config_data.notes
        db.commit()
        db.refresh(existing)
        return _build_zakat_config_response(existing, db)

    config = ZakatConfig(
        user_id=current_user.id,
        year=config_data.year,
        total_due=config_data.total_due,
        currency=config_data.currency,
        notes=config_data.notes
    )
    db.add(config)
    db.commit()
    db.refresh(config)
    return _build_zakat_config_response(config, db)


@router.get("/zakat/config")
async def get_zakat_configs(
    year: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Zakat configurations (family-level)."""
    # Filter by family - join through users table
    query = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        User.family_id == current_user.family_id
    )

    if year:
        query = query.filter(ZakatConfig.year == year)

    configs = query.order_by(ZakatConfig.year.desc()).all()
    return [_build_zakat_config_response(c, db) for c in configs]


@router.get("/zakat/config/{config_id}")
async def get_zakat_config(
    config_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific Zakat configuration (family-level)."""
    config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        ZakatConfig.id == config_id,
        User.family_id == current_user.family_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    return _build_zakat_config_response(config, db)


@router.put("/zakat/config/{config_id}")
async def update_zakat_config(
    config_id: int,
    total_due: Optional[int] = None,
    currency: Optional[str] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a Zakat configuration (family-level)."""
    config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        ZakatConfig.id == config_id,
        User.family_id == current_user.family_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    if total_due is not None:
        config.total_due = total_due
    if currency is not None:
        config.currency = currency
    if notes is not None:
        config.notes = notes

    db.commit()
    db.refresh(config)
    return _build_zakat_config_response(config, db)


@router.delete("/zakat/config/{config_id}")
async def delete_zakat_config(
    config_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Zakat configuration (family-level)."""
    config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        ZakatConfig.id == config_id,
        User.family_id == current_user.family_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    db.delete(config)
    db.commit()
    return {"message": "Config deleted"}


@router.post("/zakat/payment", response_model=ZakatPaymentResponse)
async def add_zakat_payment(
    payment_data: ZakatPaymentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a Zakat payment."""
    payment = ZakatPayment(
        config_id=payment_data.config_id,
        user_id=current_user.id,
        date=payment_data.date,
        amount=payment_data.amount,
        recipient=payment_data.recipient,
        notes=payment_data.notes
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


@router.get("/zakat/payments/{config_id}")
async def get_zakat_payments(
    config_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all payments for a Zakat config."""
    # Verify the config belongs to the user's family
    config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        ZakatConfig.id == config_id,
        User.family_id == current_user.family_id
    ).first()

    if not config:
        raise HTTPException(status_code=404, detail="Config not found")

    payments = db.query(ZakatPayment).filter(
        ZakatPayment.config_id == config_id
    ).order_by(ZakatPayment.date.desc()).all()
    return payments


@router.delete("/zakat/payment/{payment_id}")
async def delete_zakat_payment(
    payment_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a Zakat payment (family-level)."""
    # Verify the payment's config belongs to the user's family
    payment = db.query(ZakatPayment).join(
        ZakatConfig, ZakatPayment.config_id == ZakatConfig.id
    ).join(
        User, ZakatConfig.user_id == User.id
    ).filter(
        ZakatPayment.id == payment_id,
        User.family_id == current_user.family_id
    ).first()

    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    db.delete(payment)
    db.commit()
    return {"message": "Payment deleted"}


def _build_zakat_config_response(config: ZakatConfig, db: Session) -> dict:
    """Build response with computed fields."""
    total_paid = db.query(func.sum(ZakatPayment.amount)).filter(
        ZakatPayment.config_id == config.id
    ).scalar() or 0

    return {
        "id": config.id,
        "user_id": config.user_id,
        "year": config.year,
        "total_due": config.total_due,
        "currency": config.currency,
        "notes": config.notes,
        "total_paid": total_paid,
        "remaining": config.total_due - total_paid
    }
