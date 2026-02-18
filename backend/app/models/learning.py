from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Subject(Base):
    __tablename__ = "subjects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Math, Science, Reading, Arabic/Quran
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)

    topics = relationship("Topic", back_populates="subject")


class Topic(Base):
    __tablename__ = "topics"

    id = Column(Integer, primary_key=True, index=True)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=False)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    grade_level = Column(String(20), nullable=True)  # 1st, 2nd, 3rd, etc.
    order = Column(Integer, default=0)

    subject = relationship("Subject", back_populates="topics")


# Pre-defined Math topics by grade
MATH_TOPICS = {
    "6th": [
        "Fractions", "Decimals", "Percentages", "Ratios", "Proportions",
        "Integers", "Order of Operations", "Algebraic Expressions",
        "One-Step Equations", "Geometry Basics", "Area & Perimeter",
        "Volume", "Data Analysis", "Mean/Median/Mode"
    ],
    "3rd": [
        "Addition", "Subtraction", "Multiplication Tables", "Division",
        "Place Value", "Comparing Numbers", "Rounding", "Fractions Intro",
        "Time", "Money", "Measurement", "Shapes", "Patterns"
    ]
}


class Proficiency(Base):
    __tablename__ = "proficiency"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=False)
    score = Column(Float, default=0.0)  # 0-100 percentage
    total_questions = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    last_assessed = Column(DateTime(timezone=True), nullable=True)

    topic = relationship("Topic")


class Homework(Base):
    __tablename__ = "homework"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id"), nullable=True)
    title = Column(String(255), nullable=True)
    image_url = Column(String(500), nullable=False)
    extracted_content = Column(Text, nullable=True)  # AI extracted text
    ai_analysis = Column(JSON, nullable=True)  # Full AI analysis
    questions_found = Column(Integer, default=0)
    correct_answers = Column(Integer, default=0)
    score = Column(Float, nullable=True)
    feedback = Column(Text, nullable=True)
    topics_identified = Column(JSON, nullable=True)  # List of topics
    weak_areas = Column(JSON, nullable=True)  # Areas needing improvement
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="homework")
    subject = relationship("Subject")


class Worksheet(Base):
    __tablename__ = "worksheets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)  # Created by
    assigned_to = Column(Integer, ForeignKey("users.id"), nullable=True)  # Assigned to kid
    topic_id = Column(Integer, ForeignKey("topics.id"), nullable=True)
    title = Column(String(255), nullable=False)
    subject = Column(String(100), nullable=True)  # Math, Science, etc.
    questions_json = Column(JSON, nullable=False)  # Generated questions
    answer_key = Column(JSON, nullable=True)
    difficulty = Column(String(20), default="medium")  # easy, medium, hard
    pdf_url = Column(String(500), nullable=True)  # Printable PDF
    completed_image_url = Column(String(500), nullable=True)  # Uploaded completed work
    ai_grading = Column(JSON, nullable=True)  # AI grading results
    score = Column(Float, nullable=True)
    status = Column(String(20), default="generated")  # generated, assigned, in_progress, submitted, graded
    assigned_at = Column(DateTime(timezone=True), nullable=True)
    due_date = Column(DateTime(timezone=True), nullable=True)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)

    topic = relationship("Topic")
    creator = relationship("User", foreign_keys=[user_id])
    assignee = relationship("User", foreign_keys=[assigned_to])
