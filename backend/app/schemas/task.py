from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFIED = "verified"


class TaskCategory(str, Enum):
    HOMEWORK = "homework"
    CHORE = "chore"
    PRAYER = "prayer"
    QURAN = "quran"
    EXERCISE = "exercise"
    OTHER = "other"


class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    points: int = 10
    category: TaskCategory = TaskCategory.OTHER
    is_recurring: bool = False
    recurrence_pattern: Optional[str] = None


class TaskCreate(TaskBase):
    assigned_to: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    points: Optional[int] = None
    status: Optional[TaskStatus] = None
    category: Optional[TaskCategory] = None


class TaskResponse(TaskBase):
    id: int
    assigned_to: int
    created_by: int
    status: TaskStatus
    completed_at: Optional[datetime] = None
    created_at: datetime
    assignee_name: Optional[str] = None

    class Config:
        from_attributes = True


class PointsResponse(BaseModel):
    user_id: int
    total_points: int
    recent_points: List[dict]


class RewardCreate(BaseModel):
    name: str
    description: Optional[str] = None
    points_required: int
    image_url: Optional[str] = None


class RewardResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    points_required: int
    image_url: Optional[str]
    is_available: bool

    class Config:
        from_attributes = True
