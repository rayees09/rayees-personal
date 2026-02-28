from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime, date

from app.database import get_db
from app.models.user import User, UserRole
from app.models.task import Task, TaskStatus, PointsLedger, Reward, RewardRedemption
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, PointsResponse, RewardCreate, RewardResponse
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


@router.get("", response_model=List[TaskResponse])
async def get_tasks(
    assigned_to: Optional[int] = None,
    status: Optional[TaskStatus] = None,
    category: Optional[str] = None,
    due_date: Optional[date] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get tasks with optional filters."""
    # Get all users in the current user's family
    family_user_ids = db.query(User.id).filter(
        User.family_id == current_user.family_id
    ).all()
    family_user_ids = [uid[0] for uid in family_user_ids]

    # Filter tasks assigned to family members only
    query = db.query(Task).filter(Task.assigned_to.in_(family_user_ids))

    if assigned_to:
        query = query.filter(Task.assigned_to == assigned_to)
    if status:
        query = query.filter(Task.status == status)
    if category:
        query = query.filter(Task.category == category)
    if due_date:
        query = query.filter(func.date(Task.due_date) == due_date)

    tasks = query.order_by(Task.due_date.asc().nullsfirst(), Task.created_at.desc()).all()

    result = []
    for task in tasks:
        assignee = db.query(User).filter(User.id == task.assigned_to).first()
        result.append(TaskResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            assigned_to=task.assigned_to,
            created_by=task.created_by,
            due_date=task.due_date,
            points=task.points,
            status=task.status,
            category=task.category,
            is_recurring=task.is_recurring,
            recurrence_pattern=task.recurrence_pattern,
            completed_at=task.completed_at,
            created_at=task.created_at,
            assignee_name=assignee.name if assignee else None
        ))

    return result


@router.post("", response_model=TaskResponse)
async def create_task(
    task_data: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new task."""
    # Verify the assignee is in the same family
    assignee = db.query(User).filter(User.id == task_data.assigned_to).first()
    if not assignee or assignee.family_id != current_user.family_id:
        raise HTTPException(status_code=400, detail="Invalid assignee - must be a family member")

    task = Task(
        title=task_data.title,
        description=task_data.description,
        assigned_to=task_data.assigned_to,
        created_by=current_user.id,
        due_date=task_data.due_date,
        points=task_data.points,
        category=task_data.category,
        is_recurring=task_data.is_recurring,
        recurrence_pattern=task_data.recurrence_pattern
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    assignee = db.query(User).filter(User.id == task.assigned_to).first()

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        points=task.points,
        status=task.status,
        category=task.category,
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        completed_at=task.completed_at,
        created_at=task.created_at,
        assignee_name=assignee.name if assignee else None
    )


@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: int,
    task_data: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a task."""
    # Verify task belongs to a family member
    task = db.query(Task).join(User, Task.assigned_to == User.id).filter(
        Task.id == task_id,
        User.family_id == current_user.family_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    for field, value in task_data.dict(exclude_unset=True).items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    assignee = db.query(User).filter(User.id == task.assigned_to).first()

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        points=task.points,
        status=task.status,
        category=task.category,
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        completed_at=task.completed_at,
        created_at=task.created_at,
        assignee_name=assignee.name if assignee else None
    )


@router.post("/{task_id}/complete", response_model=TaskResponse)
async def complete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a task as completed and award points."""
    # Verify task belongs to a family member
    task = db.query(Task).join(User, Task.assigned_to == User.id).filter(
        Task.id == task_id,
        User.family_id == current_user.family_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Mark as completed
    task.status = TaskStatus.COMPLETED
    task.completed_at = datetime.utcnow()

    # Award points
    points_entry = PointsLedger(
        user_id=task.assigned_to,
        points=task.points,
        reason=f"Completed task: {task.title}",
        task_id=task.id
    )
    db.add(points_entry)
    db.commit()
    db.refresh(task)

    assignee = db.query(User).filter(User.id == task.assigned_to).first()

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        points=task.points,
        status=task.status,
        category=task.category,
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        completed_at=task.completed_at,
        created_at=task.created_at,
        assignee_name=assignee.name if assignee else None
    )


@router.post("/{task_id}/verify", response_model=TaskResponse)
async def verify_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Parent verifies a completed task."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can verify tasks")

    # Verify task belongs to a family member
    task = db.query(Task).join(User, Task.assigned_to == User.id).filter(
        Task.id == task_id,
        User.family_id == current_user.family_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    task.status = TaskStatus.VERIFIED
    db.commit()
    db.refresh(task)

    assignee = db.query(User).filter(User.id == task.assigned_to).first()

    return TaskResponse(
        id=task.id,
        title=task.title,
        description=task.description,
        assigned_to=task.assigned_to,
        created_by=task.created_by,
        due_date=task.due_date,
        points=task.points,
        status=task.status,
        category=task.category,
        is_recurring=task.is_recurring,
        recurrence_pattern=task.recurrence_pattern,
        completed_at=task.completed_at,
        created_at=task.created_at,
        assignee_name=assignee.name if assignee else None
    )


@router.delete("/{task_id}")
async def delete_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a task."""
    # Verify task belongs to a family member
    task = db.query(Task).join(User, Task.assigned_to == User.id).filter(
        Task.id == task_id,
        User.family_id == current_user.family_id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    db.delete(task)
    db.commit()

    return {"message": "Task deleted"}


# Points endpoints
@router.get("/points/{user_id}", response_model=PointsResponse)
async def get_user_points(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a user's points balance and history."""
    # Validate user belongs to same family (SECURITY FIX)
    target_user = db.query(User).filter(
        User.id == user_id,
        User.family_id == current_user.family_id
    ).first()
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found in your family")

    total = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == user_id
    ).scalar() or 0

    recent = db.query(PointsLedger).filter(
        PointsLedger.user_id == user_id
    ).order_by(PointsLedger.created_at.desc()).limit(10).all()

    return PointsResponse(
        user_id=user_id,
        total_points=total,
        recent_points=[
            {
                "points": p.points,
                "reason": p.reason,
                "created_at": p.created_at.isoformat()
            }
            for p in recent
        ]
    )


# Rewards endpoints
@router.get("/rewards", response_model=List[RewardResponse])
async def get_rewards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all available rewards for the family."""
    rewards = db.query(Reward).filter(
        Reward.family_id == current_user.family_id,
        Reward.is_available == True
    ).all()
    return rewards


@router.post("/rewards", response_model=RewardResponse)
async def create_reward(
    reward_data: RewardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new reward (parents only)."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(status_code=403, detail="Only parents can create rewards")

    if not current_user.family_id:
        raise HTTPException(status_code=400, detail="User must belong to a family to create rewards")

    if not reward_data.name or not reward_data.name.strip():
        raise HTTPException(status_code=400, detail="Reward name is required")

    if reward_data.points_required <= 0:
        raise HTTPException(status_code=400, detail="Points required must be greater than 0")

    try:
        reward = Reward(
            family_id=current_user.family_id,
            name=reward_data.name.strip(),
            description=reward_data.description.strip() if reward_data.description else None,
            points_required=reward_data.points_required,
            image_url=reward_data.image_url
        )
        db.add(reward)
        db.commit()
        db.refresh(reward)
        return reward
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create reward: {str(e)}")


@router.post("/rewards/{reward_id}/redeem")
async def redeem_reward(
    reward_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Redeem a reward using points."""
    reward = db.query(Reward).filter(
        Reward.id == reward_id,
        Reward.family_id == current_user.family_id
    ).first()
    if not reward:
        raise HTTPException(status_code=404, detail="Reward not found")

    if not reward.is_available:
        raise HTTPException(status_code=400, detail="Reward not available")

    # Check points
    total_points = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == current_user.id
    ).scalar() or 0

    if total_points < reward.points_required:
        raise HTTPException(status_code=400, detail="Not enough points")

    # Deduct points
    points_entry = PointsLedger(
        user_id=current_user.id,
        points=-reward.points_required,
        reason=f"Redeemed reward: {reward.name}"
    )
    db.add(points_entry)

    # Record redemption
    redemption = RewardRedemption(
        user_id=current_user.id,
        reward_id=reward_id,
        points_spent=reward.points_required
    )
    db.add(redemption)
    db.commit()

    return {"message": f"Redeemed {reward.name}!", "points_spent": reward.points_required}
