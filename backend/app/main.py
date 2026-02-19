from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.database import engine, Base
from app.routers import auth, tasks, islamic, learning
from app.routers import quran_goals, reminders, expenses, ai_context
from app.routers import admin, family

# Create database tables
Base.metadata.create_all(bind=engine)

# Create uploads directory
os.makedirs(settings.upload_dir, exist_ok=True)

app = FastAPI(
    title=settings.app_name,
    description="Family Management App - Track tasks, prayers, learning, and more",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

# Include routers
app.include_router(auth.router)
app.include_router(tasks.router)
app.include_router(islamic.router)
app.include_router(learning.router)
app.include_router(quran_goals.router)
app.include_router(reminders.router)
app.include_router(expenses.router)
app.include_router(ai_context.router)
app.include_router(admin.router)
app.include_router(family.router)


@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "message": "Welcome to Family Hub - Your Complete Family Management App!",
        "docs": "/docs",
        "features": [
            "Prayer & Islamic Practice Tracking",
            "Family Task Management",
            "Kids Learning & Homework Analysis",
            "Points & Rewards System",
            "Expense Tracking",
            "Reminders & Calendar"
        ],
        "register": "/register",
        "login": "/login"
    }


@app.get("/health")
async def health():
    return {"status": "healthy"}


# Startup event to seed initial data
@app.on_event("startup")
async def startup_event():
    from sqlalchemy.orm import Session
    from app.database import SessionLocal
    from app.models.user import User, UserRole
    from app.models.learning import Subject, Topic
    from app.services.auth import get_password_hash
    from datetime import date

    db = SessionLocal()

    try:
        # Check if users exist
        if not db.query(User).first():
            # Create family members
            rayees = User(
                name="Rayees",
                email="rayees@family.com",
                password_hash=get_password_hash("rayees123"),
                role=UserRole.PARENT
            )
            db.add(rayees)

            shibila = User(
                name="Shibila",
                email="shibila@family.com",
                password_hash=get_password_hash("shibila123"),
                role=UserRole.PARENT
            )
            db.add(shibila)

            kanz = User(
                name="Kanz",
                password_hash=get_password_hash("1234"),  # Simple PIN
                role=UserRole.CHILD,
                dob=date(2014, 6, 15),
                school="Thortan School",
                grade="6th"
            )
            db.add(kanz)

            nouman = User(
                name="Nouman",
                password_hash=get_password_hash("1234"),
                role=UserRole.CHILD,
                dob=date(2017, 2, 19),
                school="Warrick Fremont",
                grade="3rd"
            )
            db.add(nouman)

            zakia = User(
                name="Zakia",
                role=UserRole.CHILD,
                dob=date(2023, 6, 10)
            )
            db.add(zakia)

            db.commit()
            print("Created family members!")

        # Create subjects if not exist
        if not db.query(Subject).first():
            subjects = [
                Subject(name="Math", icon="calculator", color="#4CAF50"),
                Subject(name="Science", icon="flask", color="#2196F3"),
                Subject(name="Reading", icon="book", color="#FF9800"),
                Subject(name="Arabic/Quran", icon="mosque", color="#9C27B0")
            ]
            for subj in subjects:
                db.add(subj)
            db.commit()

            # Add Math topics for 6th grade
            math = db.query(Subject).filter(Subject.name == "Math").first()
            math_topics = [
                "Fractions", "Decimals", "Percentages", "Ratios", "Proportions",
                "Integers", "Order of Operations", "Algebraic Expressions",
                "One-Step Equations", "Geometry Basics", "Area & Perimeter",
                "Volume", "Data Analysis", "Mean/Median/Mode"
            ]
            for i, topic_name in enumerate(math_topics):
                topic = Topic(subject_id=math.id, name=topic_name, grade_level="6th", order=i)
                db.add(topic)

            # Add Math topics for 3rd grade
            math_topics_3rd = [
                "Addition", "Subtraction", "Multiplication Tables", "Division",
                "Place Value", "Comparing Numbers", "Rounding", "Fractions Intro",
                "Time", "Money", "Measurement", "Shapes", "Patterns"
            ]
            for i, topic_name in enumerate(math_topics_3rd):
                topic = Topic(subject_id=math.id, name=topic_name, grade_level="3rd", order=i)
                db.add(topic)

            db.commit()
            print("Created subjects and topics!")

    finally:
        db.close()


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
