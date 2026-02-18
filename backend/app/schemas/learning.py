from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class HomeworkUpload(BaseModel):
    user_id: int
    title: Optional[str] = None
    subject_id: Optional[int] = None


class HomeworkAnalysis(BaseModel):
    questions: List[Dict[str, Any]]
    total_questions: int
    correct_answers: int
    score: float
    subject_detected: Optional[str]
    topics_identified: List[str]
    weak_areas: List[str]
    feedback: str
    suggestions: List[str]


class QuestionResult(BaseModel):
    question_number: int
    question_text: Optional[str] = None
    student_answer: Optional[str] = None
    correct_answer: Optional[str] = None
    is_correct: Optional[bool] = None
    partial_credit: Optional[float] = None
    explanation: Optional[str] = None


class HomeworkResponse(BaseModel):
    id: int
    user_id: int
    title: Optional[str]
    image_url: str
    subject_id: Optional[int]
    questions_found: int
    correct_answers: int
    score: Optional[float]
    feedback: Optional[str]
    topics_identified: Optional[List[str]]
    weak_areas: Optional[List[str]]
    questions: Optional[List[QuestionResult]] = None  # Detailed question results
    created_at: datetime

    class Config:
        from_attributes = True


class WorksheetGenerate(BaseModel):
    user_id: int
    topic_id: Optional[int] = None
    topic_name: Optional[str] = None
    subject: str
    difficulty: str = "medium"  # easy, medium, hard
    question_count: int = 10
    grade_level: Optional[str] = None


class WorksheetQuestion(BaseModel):
    question_number: int
    question: str
    question_type: str  # multiple_choice, fill_blank, short_answer, calculation
    options: Optional[List[str]] = None  # For multiple choice
    answer: str
    hint: Optional[str] = None
    points: int = 1


class WorksheetResponse(BaseModel):
    id: int
    user_id: int
    title: str
    topic_id: Optional[int]
    questions: List[WorksheetQuestion]
    difficulty: str
    pdf_url: Optional[str]
    status: str
    score: Optional[float]
    generated_at: datetime

    class Config:
        from_attributes = True


class GradeWorksheetRequest(BaseModel):
    worksheet_id: int


class GradingResult(BaseModel):
    worksheet_id: int
    total_questions: int
    correct_answers: int
    score: float
    question_results: List[Dict[str, Any]]
    feedback: str
    areas_to_improve: List[str]


class ProficiencyResponse(BaseModel):
    user_id: int
    subject: str
    topic: str
    score: float
    total_questions: int
    correct_answers: int
    last_assessed: Optional[datetime]
    trend: str  # improving, declining, stable


class SubjectProficiencyResponse(BaseModel):
    user_id: int
    subject: str
    overall_score: float
    topics: List[ProficiencyResponse]
    weak_areas: List[str]
    strong_areas: List[str]
    recommendations: List[str]


class ProgressReportResponse(BaseModel):
    user_id: int
    user_name: str
    period: str  # weekly, monthly
    subjects: List[SubjectProficiencyResponse]
    homework_completed: int
    worksheets_completed: int
    average_score: float
    improvement: float
    parent_suggestions: List[str]
