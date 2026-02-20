"""
AI Context Router - Provides system summary for ChatGPT integration.

This endpoint returns comprehensive family data context that can be used
to provide ChatGPT with relevant information to answer questions about
the family's activities, learning progress, and Islamic practices.
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import date, datetime, timedelta

from app.database import get_db
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus, PointsLedger
from app.models.islamic import (
    Prayer, PrayerStatus, QuranProgress, RamadanDay,
    QuranReadingGoal, QuranReadingLog
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/ai", tags=["AI Context"])


@router.get("/context")
async def get_ai_context(
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive context data for AI/ChatGPT integration.

    This endpoint provides all relevant family data that can be used
    to give context to an AI assistant for answering questions about:
    - Family members and their details
    - Learning progress and proficiency
    - Task completion and points
    - Islamic practices (prayers, Quran, Ramadan)

    Returns a structured summary that can be passed to ChatGPT.
    """

    # Only parents can access full context
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can access AI context")

    context = {
        "generated_at": datetime.utcnow().isoformat(),
        "family": [],
        "learning": {},
        "tasks": {},
        "islamic_practices": {},
        "summary_text": ""
    }

    # Get only family members (SECURITY FIX: filter by family_id)
    users = db.query(User).filter(User.family_id == current_user.family_id).all()
    today = date.today()
    current_year = today.year

    for user in users:
        # Calculate age
        age = None
        if user.dob:
            age = (today - user.dob).days // 365

        # Get total points
        total_points = db.query(func.sum(PointsLedger.points)).filter(
            PointsLedger.user_id == user.id
        ).scalar() or 0

        member_info = {
            "id": user.id,
            "name": user.name,
            "role": user.role.value,
            "age": age,
            "school": user.school,
            "grade": user.grade,
            "total_points": total_points
        }
        context["family"].append(member_info)

        # Get task statistics for each child
        if user.role == UserRole.CHILD:
            # Tasks completed this week
            week_ago = today - timedelta(days=7)
            tasks_completed_week = db.query(Task).filter(
                Task.assigned_to == user.id,
                Task.status == TaskStatus.COMPLETED,
                Task.completed_at >= week_ago
            ).count()

            tasks_pending = db.query(Task).filter(
                Task.assigned_to == user.id,
                Task.status == TaskStatus.PENDING
            ).count()

            context["tasks"][user.name] = {
                "completed_this_week": tasks_completed_week,
                "pending": tasks_pending,
                "total_points": total_points
            }

            # Prayer statistics for this month
            month_start = today.replace(day=1)
            prayers = db.query(Prayer).filter(
                Prayer.user_id == user.id,
                Prayer.date >= month_start
            ).all()

            prayers_completed = sum(1 for p in prayers if p.status != PrayerStatus.NOT_PRAYED)
            prayers_in_masjid = sum(1 for p in prayers if p.in_masjid)

            # Quran memorization progress
            quran_progress = db.query(QuranProgress).filter(
                QuranProgress.user_id == user.id
            ).all()

            memorized_surahs = sum(1 for q in quran_progress if q.status.value == "memorized")
            in_progress_surahs = sum(1 for q in quran_progress if q.status.value == "in_progress")

            # Quran reading goal
            reading_goal = db.query(QuranReadingGoal).filter(
                QuranReadingGoal.user_id == user.id,
                QuranReadingGoal.is_completed == False
            ).first()

            reading_goal_info = None
            if reading_goal:
                total_pages = db.query(func.sum(QuranReadingLog.pages_read)).filter(
                    QuranReadingLog.goal_id == reading_goal.id
                ).scalar() or 0
                reading_goal_info = {
                    "title": reading_goal.title,
                    "target_days": reading_goal.target_days,
                    "pages_per_day": reading_goal.pages_per_day,
                    "current_page": total_pages,
                    "total_pages": reading_goal.total_pages or 604,
                    "progress_percent": round((total_pages / (reading_goal.total_pages or 604)) * 100, 1)
                }

            # Ramadan statistics
            ramadan_days = db.query(RamadanDay).filter(
                RamadanDay.user_id == user.id,
                func.extract('year', RamadanDay.date) == current_year
            ).all()

            fasted_days = sum(1 for d in ramadan_days if d.fasted)
            taraweeh_days = sum(1 for d in ramadan_days if d.taraweeh)

            context["islamic_practices"][user.name] = {
                "prayers_completed_this_month": prayers_completed,
                "prayers_in_masjid_this_month": prayers_in_masjid,
                "quran_memorization": {
                    "memorized_surahs": memorized_surahs,
                    "in_progress_surahs": in_progress_surahs
                },
                "quran_reading_goal": reading_goal_info,
                "ramadan": {
                    "fasted_days": fasted_days,
                    "taraweeh_days": taraweeh_days
                }
            }

    # Build summary text for ChatGPT
    summary_lines = [
        f"Family Summary (Generated {today.strftime('%B %d, %Y')}):",
        ""
    ]

    for member in context["family"]:
        line = f"- {member['name']}"
        if member["age"]:
            line += f" (Age: {member['age']})"
        if member["school"]:
            line += f", School: {member['school']}"
        if member["grade"]:
            line += f", Grade: {member['grade']}"
        if member["role"] == "child":
            line += f", Points: {member['total_points']}"
        summary_lines.append(line)

    summary_lines.append("")
    summary_lines.append("Recent Activity:")

    for name, tasks in context["tasks"].items():
        summary_lines.append(f"- {name}: {tasks['completed_this_week']} tasks completed this week, {tasks['pending']} pending")

    summary_lines.append("")
    summary_lines.append("Islamic Practices:")

    for name, practices in context["islamic_practices"].items():
        summary_lines.append(f"- {name}:")
        summary_lines.append(f"  Prayers: {practices['prayers_completed_this_month']} completed this month ({practices['prayers_in_masjid_this_month']} in masjid)")
        summary_lines.append(f"  Quran: {practices['quran_memorization']['memorized_surahs']} surahs memorized, {practices['quran_memorization']['in_progress_surahs']} in progress")
        if practices['quran_reading_goal']:
            goal = practices['quran_reading_goal']
            summary_lines.append(f"  Reading Goal: {goal['current_page']}/{goal['total_pages']} pages ({goal['progress_percent']}%)")
        if practices['ramadan']['fasted_days'] > 0:
            summary_lines.append(f"  Ramadan: {practices['ramadan']['fasted_days']} fasting days, {practices['ramadan']['taraweeh_days']} taraweeh")

    context["summary_text"] = "\n".join(summary_lines)

    return context


@router.get("/context/text")
async def get_ai_context_text(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get a text-only summary for direct use with ChatGPT.

    Returns a plain text summary that can be directly pasted
    into a ChatGPT conversation for context.
    """
    context = await get_ai_context(current_user=current_user, db=db)
    return {"context": context["summary_text"]}
