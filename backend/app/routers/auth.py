from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
from typing import List
import re
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests

from app.database import get_db
from app.models.user import User, UserRole
from app.models.task import PointsLedger
from app.models.family import Family, FamilyFeature, FamilyAiLimit, AVAILABLE_FEATURES
from app.models.assistant import AppSettings
from app.schemas.user import UserCreate, UserResponse, UserLogin, Token, UserUpdate, GoogleLoginRequest
from app.services.auth import (
    get_password_hash, authenticate_user, authenticate_user_by_pin,
    authenticate_user_by_username, create_access_token, get_current_user
)
from app.config import settings
from app.routers.support import log_activity

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
async def login(login_data: UserLogin, request: Request, db: Session = Depends(get_db)):
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

    # Log activity
    await log_activity(
        db, "login", request,
        user_id=user.id,
        family_id=user.family_id,
        details=f"Login via {'email' if login_data.email else 'username'}"
    )

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


@router.post("/login/google", response_model=Token)
async def login_with_google(
    data: GoogleLoginRequest,
    request: Request,
    db: Session = Depends(get_db)
):
    """Login with Google OAuth."""
    if not settings.google_client_id:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google OAuth not configured"
        )

    try:
        # Verify Google token
        idinfo = id_token.verify_oauth2_token(
            data.credential,
            google_requests.Request(),
            settings.google_client_id
        )

        email = idinfo.get('email')
        name = idinfo.get('name', email.split('@')[0])

        if not email:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email not provided by Google"
            )

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Google token"
        )

    # Find user by email
    user = db.query(User).filter(User.email == email).first()

    if not user:
        # Auto-register: Create new family and user
        # Use provided family_name or generate from user name
        family_name_to_use = data.family_name if data.family_name else f"{name}'s Family"

        # Generate slug from family name
        base_slug = re.sub(r'[^a-zA-Z0-9\s-]', '', family_name_to_use.lower())
        base_slug = re.sub(r'[\s_]+', '-', base_slug)[:50]
        slug = base_slug
        counter = 1
        while db.query(Family).filter(Family.slug == slug).first():
            slug = f"{base_slug}-{counter}"
            counter += 1

        # Create family
        family = Family(
            name=family_name_to_use,
            slug=slug,
            owner_email=email,
            country=data.country,  # Save country
            is_verified=True,  # Google verified the email
            verified_at=datetime.utcnow(),
            is_active=True
        )
        db.add(family)
        db.flush()

        # Create user as parent
        user = User(
            family_id=family.id,
            name=name,
            email=email,
            role=UserRole.PARENT,
            is_email_verified=True  # Google verified
        )
        db.add(user)

        # Create default features
        for feature in AVAILABLE_FEATURES:
            ff = FamilyFeature(
                family_id=family.id,
                feature_key=feature["key"],
                is_enabled=True
            )
            db.add(ff)

        # Get default cost limit from app settings
        default_cost_setting = db.query(AppSettings).filter(
            AppSettings.key == "default_ai_cost_limit_cents"
        ).first()
        default_cost_limit_usd = 0.20  # Default fallback
        if default_cost_setting and default_cost_setting.value:
            default_cost_limit_usd = int(default_cost_setting.value) / 100

        # Create default AI limit
        ai_limit = FamilyAiLimit(
            family_id=family.id,
            monthly_token_limit=100000,
            monthly_cost_limit_usd=default_cost_limit_usd,
            current_month_usage=0,
            current_month_cost_usd=0.0
        )
        db.add(ai_limit)

        db.commit()
        db.refresh(user)

        # Log new registration
        await log_activity(
            db, "google_register", request,
            user_id=user.id,
            family_id=user.family_id,
            details=f"New registration via Google: {name}"
        )

    # Mark email as verified since Google verified it
    elif not user.is_email_verified:
        user.is_email_verified = True
        db.commit()

    # Log Google login for existing user
    await log_activity(
        db, "google_login", request,
        user_id=user.id,
        family_id=user.family_id,
        details=f"Login via Google"
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
