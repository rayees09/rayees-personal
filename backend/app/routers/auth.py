from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from typing import List

from app.database import get_db
from app.models.user import User, UserRole
from app.models.task import PointsLedger
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token, UserUpdate
from app.services.auth import (
    get_password_hash, authenticate_user, authenticate_user_by_pin,
    authenticate_user_by_username, create_access_token, get_current_user
)
from app.config import settings

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Check if email already exists
    if user_data.email:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

    # Check if username already exists
    if user_data.username:
        existing = db.query(User).filter(User.username == user_data.username).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Create user
    password_hash = None
    if user_data.password:
        password_hash = get_password_hash(user_data.password)

    user = User(
        name=user_data.name,
        username=user_data.username,
        email=user_data.email,
        password_hash=password_hash,
        role=user_data.role,
        dob=user_data.dob,
        school=user_data.school,
        grade=user_data.grade,
        avatar=user_data.avatar
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Create token
    access_token = create_access_token(data={"sub": user.id})

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            dob=user.dob,
            school=user.school,
            grade=user.grade,
            avatar=user.avatar,
            created_at=user.created_at,
            total_points=0
        )
    )


@router.post("/login", response_model=Token)
async def login(login_data: UserLogin, db: Session = Depends(get_db)):
    user = None

    # Try email/password login (for parents)
    if login_data.email and login_data.password:
        user = authenticate_user(db, login_data.email, login_data.password)

    # Try username/password login (for kids)
    elif login_data.username and login_data.password:
        user = authenticate_user_by_username(db, login_data.username, login_data.password)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    # Check if email verification is required (for users with email)
    if user.email and not user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Email not verified. Please check your email for the verification link."
        )

    # Get total points
    total_points = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == user.id
    ).scalar() or 0

    access_token = create_access_token(data={"sub": user.id})

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            dob=user.dob,
            school=user.school,
            grade=user.grade,
            avatar=user.avatar,
            created_at=user.created_at,
            total_points=total_points
        )
    )


@router.post("/login/form", response_model=Token)
async def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    """OAuth2 compatible login endpoint."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials"
        )

    total_points = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == user.id
    ).scalar() or 0

    access_token = create_access_token(data={"sub": user.id})

    return Token(
        access_token=access_token,
        user=UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            dob=user.dob,
            school=user.school,
            grade=user.grade,
            avatar=user.avatar,
            created_at=user.created_at,
            total_points=total_points
        )
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    total_points = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == current_user.id
    ).scalar() or 0

    return UserResponse(
        id=current_user.id,
        name=current_user.name,
        email=current_user.email,
        role=current_user.role,
        dob=current_user.dob,
        school=current_user.school,
        grade=current_user.grade,
        avatar=current_user.avatar,
        created_at=current_user.created_at,
        total_points=total_points
    )


@router.get("/family", response_model=List[UserResponse])
async def get_family_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all family members for the current user's family."""
    # Filter by family_id for multi-tenant isolation
    users = db.query(User).filter(User.family_id == current_user.family_id).all()
    result = []
    for user in users:
        total_points = db.query(func.sum(PointsLedger.points)).filter(
            PointsLedger.user_id == user.id
        ).scalar() or 0

        result.append(UserResponse(
            id=user.id,
            name=user.name,
            email=user.email,
            role=user.role,
            dob=user.dob,
            school=user.school,
            grade=user.grade,
            avatar=user.avatar,
            created_at=user.created_at,
            total_points=total_points
        ))
    return result


@router.put("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Only parents can update other users
    if current_user.role != UserRole.PARENT and current_user.id != user_id:
        raise HTTPException(status_code=403, detail="Not authorized")

    update_data = user_data.dict(exclude_unset=True)

    # Check if new username is taken by another user
    if 'username' in update_data and update_data['username']:
        existing = db.query(User).filter(
            User.username == update_data['username'],
            User.id != user_id
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="Username already taken")

    # Handle password updates with hashing
    if 'password' in update_data and update_data['password']:
        user.password_hash = get_password_hash(update_data['password'])
        del update_data['password']

    # Update other fields
    for field, value in update_data.items():
        setattr(user, field, value)

    db.commit()
    db.refresh(user)

    total_points = db.query(func.sum(PointsLedger.points)).filter(
        PointsLedger.user_id == user.id
    ).scalar() or 0

    return UserResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        role=user.role,
        dob=user.dob,
        school=user.school,
        grade=user.grade,
        avatar=user.avatar,
        created_at=user.created_at,
        total_points=total_points
    )
