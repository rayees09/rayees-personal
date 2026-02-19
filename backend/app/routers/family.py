from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
import secrets
from datetime import datetime, timedelta, timezone
import re

from app.database import get_db
from app.models.user import User, UserRole
from app.models.family import Family, FamilyFeature, FamilyAiLimit, AVAILABLE_FEATURES
from app.services.auth import get_current_user, get_password_hash
from app.services.email_service import get_email_service
from app.config import settings
from app.schemas.family import (
    FamilyRegisterRequest, FamilyRegisterResponse,
    EmailVerifyRequest, ResendVerificationRequest,
    FamilyResponse, FamilyDetailResponse, FeatureResponse, AiLimitResponse,
    AddMemberRequest, MemberResponse
)

router = APIRouter(prefix="/api/family", tags=["Family"])


def generate_slug(name: str) -> str:
    """Generate URL-safe slug from family name."""
    slug = re.sub(r'[^a-zA-Z0-9\s-]', '', name.lower())
    slug = re.sub(r'[\s_]+', '-', slug)
    return slug[:50]


def make_unique_slug(db: Session, base_slug: str) -> str:
    """Ensure slug is unique by appending numbers if needed."""
    slug = base_slug
    counter = 1
    while db.query(Family).filter(Family.slug == slug).first():
        slug = f"{base_slug}-{counter}"
        counter += 1
    return slug


# ============== REGISTRATION ==============

@router.post("/register", response_model=FamilyRegisterResponse)
async def register_family(
    data: FamilyRegisterRequest,
    db: Session = Depends(get_db)
):
    """Register a new family. Sends verification email to owner."""
    # Check if email already exists
    existing_user = db.query(User).filter(User.email == data.owner_email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    existing_family = db.query(Family).filter(Family.owner_email == data.owner_email).first()
    if existing_family:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A family is already registered with this email"
        )

    # Generate unique slug
    base_slug = generate_slug(data.family_name)
    slug = make_unique_slug(db, base_slug)

    # Generate verification token
    verification_token = secrets.token_urlsafe(32)

    # Create family
    family = Family(
        name=data.family_name,
        slug=slug,
        owner_email=data.owner_email,
        verification_token=verification_token,
        verification_sent_at=datetime.utcnow(),
        is_verified=False,
        is_active=True
    )
    db.add(family)
    db.flush()

    # Create owner as parent user
    owner = User(
        family_id=family.id,
        name=data.owner_name,
        email=data.owner_email,
        password_hash=get_password_hash(data.password),
        role=UserRole.PARENT,
        is_email_verified=False,
        verification_token=verification_token
    )
    db.add(owner)

    # Create default features (all enabled)
    for feature in AVAILABLE_FEATURES:
        ff = FamilyFeature(
            family_id=family.id,
            feature_key=feature["key"],
            is_enabled=True
        )
        db.add(ff)

    # Create default AI limit
    ai_limit = FamilyAiLimit(
        family_id=family.id,
        monthly_token_limit=100000,  # 100k tokens default
        current_month_usage=0
    )
    db.add(ai_limit)

    db.commit()
    db.refresh(family)

    # Send verification email
    email_service = await get_email_service(db)
    verification_link = f"{settings.frontend_url}/verify-email?token={verification_token}"
    await email_service.send_verification_email(
        to_email=data.owner_email,
        name=data.owner_name,
        verification_link=verification_link
    )

    return FamilyRegisterResponse(
        family_id=family.id,
        family_name=family.name,
        owner_email=family.owner_email,
        message="Registration successful! Please check your email to verify your account.",
        requires_verification=True
    )


@router.post("/verify-email")
async def verify_email(
    data: EmailVerifyRequest,
    db: Session = Depends(get_db)
):
    """Verify email with token."""
    # Find user with this token
    user = db.query(User).filter(User.verification_token == data.token).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )

    # Check if token is expired (24 hours)
    if user.verification_sent_at:
        expiry = user.verification_sent_at + timedelta(hours=24)
        now = datetime.now(timezone.utc)
        # Handle timezone-naive datetime from database
        if expiry.tzinfo is None:
            expiry = expiry.replace(tzinfo=timezone.utc)
        if now > expiry:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification token has expired. Please request a new one."
            )

    # Verify user
    user.is_email_verified = True
    user.verification_token = None

    # Also verify the family
    family = db.query(Family).filter(Family.id == user.family_id).first()
    if family:
        family.is_verified = True
        family.verified_at = datetime.utcnow()
        family.verification_token = None

    db.commit()

    # Send welcome email
    email_service = await get_email_service(db)
    await email_service.send_welcome_email(
        to_email=user.email,
        name=user.name,
        family_name=family.name if family else "Your Family"
    )

    return {"message": "Email verified successfully! You can now login."}


@router.post("/resend-verification")
async def resend_verification(
    data: ResendVerificationRequest,
    db: Session = Depends(get_db)
):
    """Resend verification email."""
    user = db.query(User).filter(User.email == data.email).first()
    if not user:
        # Don't reveal if email exists
        return {"message": "If the email exists, a verification link has been sent."}

    if user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email is already verified"
        )

    # Generate new token
    new_token = secrets.token_urlsafe(32)
    user.verification_token = new_token
    user.verification_sent_at = datetime.utcnow()

    # Update family token too
    family = db.query(Family).filter(Family.id == user.family_id).first()
    if family:
        family.verification_token = new_token
        family.verification_sent_at = datetime.utcnow()

    db.commit()

    # Send email
    email_service = await get_email_service(db)
    verification_link = f"{settings.frontend_url}/verify-email?token={new_token}"
    await email_service.send_verification_email(
        to_email=user.email,
        name=user.name,
        verification_link=verification_link
    )

    return {"message": "If the email exists, a verification link has been sent."}


# ============== FAMILY INFO ==============

@router.get("/me", response_model=FamilyDetailResponse)
async def get_my_family(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's family details with features."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this user"
        )

    family = db.query(Family).filter(Family.id == current_user.family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    # Get features
    features = db.query(FamilyFeature).filter(FamilyFeature.family_id == family.id).all()

    # Get AI limit
    ai_limit = db.query(FamilyAiLimit).filter(FamilyAiLimit.family_id == family.id).first()

    # Get member count
    member_count = db.query(User).filter(User.family_id == family.id).count()

    return FamilyDetailResponse(
        id=family.id,
        name=family.name,
        slug=family.slug,
        owner_email=family.owner_email,
        is_verified=family.is_verified,
        is_active=family.is_active,
        subscription_plan=family.subscription_plan,
        created_at=family.created_at,
        member_count=member_count,
        features=[
            FeatureResponse(
                feature_key=f.feature_key,
                is_enabled=f.is_enabled,
                config_json=f.config_json
            ) for f in features
        ],
        ai_limit=AiLimitResponse(
            monthly_token_limit=ai_limit.monthly_token_limit if ai_limit else 100000,
            current_month_usage=ai_limit.current_month_usage if ai_limit else 0,
            reset_date=ai_limit.reset_date if ai_limit else None,
            usage_percentage=round(
                (ai_limit.current_month_usage / ai_limit.monthly_token_limit * 100)
                if ai_limit and ai_limit.monthly_token_limit > 0 else 0, 2
            )
        ) if ai_limit else None,
        total_token_usage=ai_limit.current_month_usage if ai_limit else 0
    )


@router.get("/features")
async def get_family_features(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of enabled features for the current family."""
    if not current_user.family_id:
        # Return all features enabled for legacy users without family
        return {feature["key"]: True for feature in AVAILABLE_FEATURES}

    features = db.query(FamilyFeature).filter(
        FamilyFeature.family_id == current_user.family_id
    ).all()

    return {f.feature_key: f.is_enabled for f in features}


# ============== MEMBER MANAGEMENT ==============

@router.get("/members", response_model=List[MemberResponse])
async def get_family_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all members of the current family."""
    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No family associated with this user"
        )

    # Use explicit comparison for proper filtering
    members = db.query(User).filter(
        User.family_id == current_user.family_id,
        User.family_id.isnot(None)
    ).all()

    return [
        MemberResponse(
            id=m.id,
            name=m.name,
            email=m.email,
            username=m.username,
            role=m.role.value if hasattr(m.role, 'value') else m.role,
            dob=m.dob.isoformat() if m.dob else None,
            avatar=m.avatar,
            is_email_verified=m.is_email_verified,
            total_points=m.total_points or 0,
            created_at=m.created_at
        ) for m in members
    ]


@router.post("/members", response_model=MemberResponse)
async def add_family_member(
    data: AddMemberRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a new member to the family. Parents only."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can add family members"
        )

    if not current_user.family_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No family associated with this user"
        )

    # Check for existing email/username
    if data.email:
        existing = db.query(User).filter(User.email == data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

    if data.username:
        existing = db.query(User).filter(User.username == data.username).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username already taken"
            )

    # Parse DOB
    dob = None
    if data.dob:
        from datetime import datetime
        try:
            dob = datetime.strptime(data.dob, "%Y-%m-%d").date()
        except ValueError:
            pass

    # Create member
    member = User(
        family_id=current_user.family_id,
        name=data.name,
        email=data.email,
        username=data.username,
        password_hash=get_password_hash(data.password) if data.password else None,
        role=UserRole.PARENT if data.role == "parent" else UserRole.CHILD,
        dob=dob,
        school=data.school,
        grade=data.grade,
        is_email_verified=False if data.email else True  # No verification needed for kids without email
    )
    db.add(member)
    db.commit()
    db.refresh(member)

    # Send invite email if email provided
    if data.email and data.role == "parent":
        email_service = await get_email_service(db)
        family = db.query(Family).filter(Family.id == current_user.family_id).first()
        setup_link = f"{settings.frontend_url}/setup-account?email={data.email}"
        await email_service.send_member_invite_email(
            to_email=data.email,
            inviter_name=current_user.name,
            family_name=family.name if family else "Your Family",
            setup_link=setup_link
        )

    return MemberResponse(
        id=member.id,
        name=member.name,
        email=member.email,
        username=member.username,
        role=member.role.value if hasattr(member.role, 'value') else member.role,
        dob=member.dob.isoformat() if member.dob else None,
        avatar=member.avatar,
        is_email_verified=member.is_email_verified,
        total_points=member.total_points or 0,
        created_at=member.created_at
    )


@router.delete("/members/{member_id}")
async def remove_family_member(
    member_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove a member from the family. Parents only, cannot remove self."""
    if current_user.role != UserRole.PARENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only parents can remove family members"
        )

    if member_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself"
        )

    member = db.query(User).filter(
        User.id == member_id,
        User.family_id == current_user.family_id
    ).first()

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    db.delete(member)
    db.commit()

    return {"message": "Member removed successfully"}
