from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime
import base64
import os
import uuid

from app.database import get_db
from app.models.user import User
from app.models.learning import Subject, Topic, Proficiency, Homework, Worksheet
from app.schemas.learning import (
    HomeworkUpload, HomeworkResponse, WorksheetGenerate, WorksheetResponse,
    WorksheetQuestion, SubjectProficiencyResponse, ProficiencyResponse, ProgressReportResponse,
    QuestionResult
)
from app.services.auth import get_current_user
from app.services.ai_service import ai_service
from app.config import settings

router = APIRouter(prefix="/api/learning", tags=["Learning"])


def save_uploaded_file(file: UploadFile) -> str:
    """Save uploaded file and return the path."""
    os.makedirs(settings.upload_dir, exist_ok=True)
    ext = os.path.splitext(file.filename)[1] if file.filename else ".jpg"
    filename = f"{uuid.uuid4()}{ext}"
    filepath = os.path.join(settings.upload_dir, filename)

    with open(filepath, "wb") as f:
        f.write(file.file.read())

    return filepath


@router.post("/homework/upload", response_model=HomeworkResponse)
async def upload_homework(
    file: UploadFile = File(...),
    user_id: int = Form(...),
    title: Optional[str] = Form(None),
    subject_id: Optional[int] = Form(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload homework image for AI analysis."""
    # Save file
    try:
        filepath = save_uploaded_file(file)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

    # Read file for AI analysis
    try:
        with open(filepath, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read file: {str(e)}")

    # Get user's grade level
    user = db.query(User).filter(User.id == user_id).first()
    grade_level = user.grade if user and user.grade else "6th"

    # Analyze with AI
    try:
        analysis = await ai_service.analyze_homework(image_data, grade_level)
    except ValueError as e:
        # API key not configured
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI analysis failed: {str(e)}")

    # Create homework record
    homework = Homework(
        user_id=user_id,
        title=title or "Homework",
        image_url=filepath,
        subject_id=subject_id,
        extracted_content=str(analysis.get("questions", [])),
        ai_analysis=analysis,
        questions_found=analysis.get("total_questions", 0),
        correct_answers=analysis.get("correct_answers", 0),
        score=analysis.get("score"),
        feedback=analysis.get("feedback"),
        topics_identified=analysis.get("topics_identified", []),
        weak_areas=analysis.get("weak_areas", [])
    )
    db.add(homework)
    db.commit()
    db.refresh(homework)

    # Update proficiency based on analysis
    if analysis.get("topics_identified"):
        subject_name = analysis.get("subject_detected", "Other")
        subject = db.query(Subject).filter(Subject.name == subject_name).first()

        if not subject:
            subject = Subject(name=subject_name)
            db.add(subject)
            db.commit()
            db.refresh(subject)

        for topic_name in analysis.get("topics_identified", []):
            topic = db.query(Topic).filter(
                Topic.subject_id == subject.id,
                Topic.name == topic_name
            ).first()

            if not topic:
                topic = Topic(subject_id=subject.id, name=topic_name)
                db.add(topic)
                db.commit()
                db.refresh(topic)

            # Update proficiency
            proficiency = db.query(Proficiency).filter(
                Proficiency.user_id == user_id,
                Proficiency.topic_id == topic.id
            ).first()

            if proficiency:
                # Rolling average
                total = proficiency.total_questions + analysis.get("total_questions", 0)
                correct = proficiency.correct_answers + analysis.get("correct_answers", 0)
                proficiency.score = (correct / total * 100) if total > 0 else 0
                proficiency.total_questions = total
                proficiency.correct_answers = correct
                proficiency.last_assessed = datetime.utcnow()
            else:
                proficiency = Proficiency(
                    user_id=user_id,
                    topic_id=topic.id,
                    score=analysis.get("score", 0),
                    total_questions=analysis.get("total_questions", 0),
                    correct_answers=analysis.get("correct_answers", 0),
                    last_assessed=datetime.utcnow()
                )
                db.add(proficiency)

        db.commit()

    # Parse question results from analysis
    questions = []
    for q in analysis.get("questions", []):
        questions.append(QuestionResult(
            question_number=q.get("question_number", 0),
            question_text=q.get("question_text"),
            student_answer=q.get("student_answer"),
            correct_answer=q.get("correct_answer"),
            is_correct=q.get("is_correct"),
            partial_credit=q.get("partial_credit"),
            explanation=q.get("explanation")
        ))

    return HomeworkResponse(
        id=homework.id,
        user_id=homework.user_id,
        title=homework.title,
        image_url=homework.image_url,
        subject_id=homework.subject_id,
        questions_found=homework.questions_found,
        correct_answers=homework.correct_answers,
        score=homework.score,
        feedback=homework.feedback,
        topics_identified=homework.topics_identified,
        weak_areas=homework.weak_areas,
        questions=questions,
        created_at=homework.created_at
    )


@router.get("/homework/{user_id}", response_model=List[HomeworkResponse])
async def get_homework_history(
    user_id: int,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get homework history for a user."""
    homework = db.query(Homework).filter(
        Homework.user_id == user_id
    ).order_by(Homework.created_at.desc()).limit(limit).all()

    return [
        HomeworkResponse(
            id=h.id,
            user_id=h.user_id,
            title=h.title,
            image_url=h.image_url,
            subject_id=h.subject_id,
            questions_found=h.questions_found,
            correct_answers=h.correct_answers,
            score=h.score,
            feedback=h.feedback,
            topics_identified=h.topics_identified,
            weak_areas=h.weak_areas,
            created_at=h.created_at
        )
        for h in homework
    ]


@router.post("/worksheet/generate")
async def generate_worksheet(
    request: WorksheetGenerate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate a practice worksheet using AI."""
    # Get user's grade level
    user = db.query(User).filter(User.id == request.user_id).first()
    grade_level = request.grade_level or (user.grade if user else "6th")

    topic_name = request.topic_name
    if request.topic_id:
        topic = db.query(Topic).filter(Topic.id == request.topic_id).first()
        if topic:
            topic_name = topic.name

    # Generate with AI
    result = await ai_service.generate_worksheet(
        topic=topic_name or "General",
        subject=request.subject,
        difficulty=request.difficulty,
        question_count=request.question_count,
        grade_level=grade_level
    )

    if result.get("parse_error"):
        raise HTTPException(status_code=500, detail="Failed to generate worksheet")

    # Save worksheet
    worksheet = Worksheet(
        user_id=request.user_id,
        topic_id=request.topic_id,
        title=result.get("title", f"Practice: {topic_name}"),
        subject=request.subject,
        questions_json=result.get("questions", []),
        answer_key=[{"question_number": q["question_number"], "answer": q["answer"]} for q in result.get("questions", [])],
        difficulty=request.difficulty,
        status="generated"
    )
    db.add(worksheet)
    db.commit()
    db.refresh(worksheet)

    return {
        "id": worksheet.id,
        "title": worksheet.title,
        "questions": result.get("questions", []),
        "instructions": result.get("instructions", ""),
        "estimated_time_minutes": result.get("estimated_time_minutes", 15),
        "status": "generated"
    }


@router.post("/worksheet/{worksheet_id}/grade")
async def grade_worksheet(
    worksheet_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Grade a completed worksheet by uploading an image."""
    worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Save completed image
    filepath = save_uploaded_file(file)
    worksheet.completed_image_url = filepath

    # Read file for AI grading
    with open(filepath, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    # Grade with AI
    result = await ai_service.grade_worksheet(image_data, worksheet.answer_key)

    worksheet.ai_grading = result
    worksheet.score = result.get("score")
    worksheet.status = "graded"
    worksheet.completed_at = datetime.utcnow()

    db.commit()

    # Update proficiency
    if worksheet.topic_id:
        proficiency = db.query(Proficiency).filter(
            Proficiency.user_id == worksheet.user_id,
            Proficiency.topic_id == worksheet.topic_id
        ).first()

        if proficiency:
            total = proficiency.total_questions + result.get("total_questions", 0)
            correct = proficiency.correct_answers + result.get("correct_answers", 0)
            proficiency.score = (correct / total * 100) if total > 0 else 0
            proficiency.total_questions = total
            proficiency.correct_answers = correct
            proficiency.last_assessed = datetime.utcnow()
            db.commit()

    return result


@router.get("/proficiency/{user_id}")
async def get_proficiency(
    user_id: int,
    subject: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get proficiency scores for a user."""
    query = db.query(Proficiency, Topic, Subject).join(
        Topic, Proficiency.topic_id == Topic.id
    ).join(
        Subject, Topic.subject_id == Subject.id
    ).filter(Proficiency.user_id == user_id)

    if subject:
        query = query.filter(Subject.name == subject)

    results = query.all()

    subjects_data = {}
    for prof, topic, subj in results:
        if subj.name not in subjects_data:
            subjects_data[subj.name] = {
                "topics": [],
                "total_score": 0,
                "count": 0
            }

        subjects_data[subj.name]["topics"].append({
            "topic": topic.name,
            "score": prof.score,
            "total_questions": prof.total_questions,
            "correct_answers": prof.correct_answers,
            "last_assessed": prof.last_assessed.isoformat() if prof.last_assessed else None
        })
        subjects_data[subj.name]["total_score"] += prof.score
        subjects_data[subj.name]["count"] += 1

    return {
        "user_id": user_id,
        "subjects": [
            {
                "subject": name,
                "overall_score": round(data["total_score"] / data["count"], 1) if data["count"] > 0 else 0,
                "topics": data["topics"],
                "weak_areas": [t["topic"] for t in data["topics"] if t["score"] < 70],
                "strong_areas": [t["topic"] for t in data["topics"] if t["score"] >= 80]
            }
            for name, data in subjects_data.items()
        ]
    }


@router.get("/weak-areas/{user_id}")
async def get_weak_areas(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weak areas that need improvement."""
    query = db.query(Proficiency, Topic, Subject).join(
        Topic, Proficiency.topic_id == Topic.id
    ).join(
        Subject, Topic.subject_id == Subject.id
    ).filter(
        Proficiency.user_id == user_id,
        Proficiency.score < 70
    ).order_by(Proficiency.score.asc())

    results = query.all()

    return {
        "user_id": user_id,
        "weak_areas": [
            {
                "subject": subj.name,
                "topic": topic.name,
                "score": prof.score,
                "recommendation": f"Practice more {topic.name} problems"
            }
            for prof, topic, subj in results
        ]
    }


@router.post("/image-to-task")
async def extract_tasks_from_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Extract tasks from an uploaded image."""
    filepath = save_uploaded_file(file)

    with open(filepath, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()

    result = await ai_service.extract_tasks_from_image(image_data)

    return result


@router.get("/suggestions/{user_id}")
async def get_parent_suggestions(
    user_id: int,
    subject: str = "Math",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get AI-powered suggestions for parents."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Get weak areas
    weak_areas_query = db.query(Proficiency, Topic, Subject).join(
        Topic, Proficiency.topic_id == Topic.id
    ).join(
        Subject, Topic.subject_id == Subject.id
    ).filter(
        Proficiency.user_id == user_id,
        Subject.name == subject,
        Proficiency.score < 70
    )

    weak_areas = [topic.name for _, topic, _ in weak_areas_query.all()]

    # Get recent scores
    recent_homework = db.query(Homework).filter(
        Homework.user_id == user_id
    ).order_by(Homework.created_at.desc()).limit(5).all()

    recent_scores = [h.score for h in recent_homework if h.score is not None]

    result = await ai_service.get_parent_suggestions(
        child_name=user.name,
        weak_areas=weak_areas or ["General practice"],
        recent_scores=recent_scores or [75],
        subject=subject
    )

    return result


@router.post("/worksheet/{worksheet_id}/assign")
async def assign_worksheet(
    worksheet_id: int,
    assigned_to: int,
    due_date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Assign a worksheet to a kid."""
    worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    worksheet.assigned_to = assigned_to
    worksheet.status = "assigned"
    worksheet.assigned_at = datetime.utcnow()
    if due_date:
        worksheet.due_date = datetime.fromisoformat(due_date)

    db.commit()

    return {"message": "Worksheet assigned successfully", "worksheet_id": worksheet_id}


@router.get("/worksheets/assigned/{user_id}")
async def get_assigned_worksheets(
    user_id: int,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get worksheets assigned to a user."""
    query = db.query(Worksheet).filter(Worksheet.assigned_to == user_id)

    if status:
        query = query.filter(Worksheet.status == status)
    else:
        # By default, show pending worksheets (assigned, in_progress)
        query = query.filter(Worksheet.status.in_(["assigned", "in_progress", "submitted", "graded"]))

    worksheets = query.order_by(Worksheet.assigned_at.desc()).all()

    return [
        {
            "id": w.id,
            "title": w.title,
            "subject": w.subject,
            "difficulty": w.difficulty,
            "status": w.status,
            "questions_count": len(w.questions_json) if w.questions_json else 0,
            "score": w.score,
            "assigned_at": w.assigned_at.isoformat() if w.assigned_at else None,
            "due_date": w.due_date.isoformat() if w.due_date else None,
            "completed_at": w.completed_at.isoformat() if w.completed_at else None,
        }
        for w in worksheets
    ]


@router.get("/worksheet/{worksheet_id}")
async def get_worksheet(
    worksheet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a specific worksheet with questions."""
    worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Hide answers if worksheet is assigned but not yet graded
    questions = worksheet.questions_json
    if worksheet.status in ["assigned", "in_progress", "submitted"]:
        # Remove answers from questions for the kid
        questions = [
            {k: v for k, v in q.items() if k != "answer"}
            for q in questions
        ]

    return {
        "id": worksheet.id,
        "title": worksheet.title,
        "subject": worksheet.subject,
        "difficulty": worksheet.difficulty,
        "status": worksheet.status,
        "questions": questions,
        "score": worksheet.score,
        "ai_grading": worksheet.ai_grading if worksheet.status == "graded" else None,
        "assigned_at": worksheet.assigned_at.isoformat() if worksheet.assigned_at else None,
        "due_date": worksheet.due_date.isoformat() if worksheet.due_date else None,
    }


@router.post("/worksheet/{worksheet_id}/start")
async def start_worksheet(
    worksheet_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark worksheet as in progress."""
    worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    worksheet.status = "in_progress"
    db.commit()

    return {"message": "Worksheet started", "status": "in_progress"}


@router.post("/worksheet/{worksheet_id}/submit")
async def submit_worksheet(
    worksheet_id: int,
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Submit a completed worksheet image for grading."""
    worksheet = db.query(Worksheet).filter(Worksheet.id == worksheet_id).first()
    if not worksheet:
        raise HTTPException(status_code=404, detail="Worksheet not found")

    # Save completed image
    filepath = save_uploaded_file(file)
    worksheet.completed_image_url = filepath
    worksheet.status = "submitted"
    worksheet.completed_at = datetime.utcnow()
    db.commit()

    # Auto-grade with AI
    try:
        with open(filepath, "rb") as f:
            image_data = base64.b64encode(f.read()).decode()

        result = await ai_service.grade_worksheet(image_data, worksheet.answer_key)

        worksheet.ai_grading = result
        worksheet.score = result.get("score")
        worksheet.status = "graded"
        db.commit()

        return {
            "message": "Worksheet submitted and graded",
            "status": "graded",
            "score": worksheet.score,
            "grading": result
        }
    except Exception as e:
        # If grading fails, still mark as submitted
        return {
            "message": "Worksheet submitted, grading pending",
            "status": "submitted",
            "error": str(e)
        }
