from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional, List
from datetime import datetime, timedelta
from pydantic import BaseModel
import os

from app.database import get_db
from app.models.admin import Admin, EmailConfig, EmailProvider
from app.models.family import Family, FamilyFeature, FamilyAiLimit, AVAILABLE_FEATURES
from app.models.token_usage import AiTokenUsage
from app.models.user import User
from app.services.auth import get_password_hash, verify_password, create_access_token
from app.services.email_service import get_email_service
from app.schemas.admin import (
    AdminLoginRequest, AdminLoginResponse, AdminResponse,
    DashboardStats, FamilyListItem, FamilyListResponse,
    EmailConfigResponse, EmailConfigUpdateRequest, EmailTestRequest,
    TokenUsageSummary, TokenUsageItem, AvailableFeature, FamilyFeaturesUpdate
)

router = APIRouter(prefix="/api/admin", tags=["Admin"])


# ============== ADMIN AUTH ==============

async def get_current_admin(
    token: str = Depends(lambda: None),  # TODO: Implement proper admin token extraction
    db: Session = Depends(get_db)
) -> Admin:
    """Get current admin from token."""
    # For now, check if the request has admin authorization
    # This should be implemented with proper JWT validation
    # Placeholder implementation
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Admin authentication required"
    )


@router.post("/login", response_model=AdminLoginResponse)
async def admin_login(
    data: AdminLoginRequest,
    db: Session = Depends(get_db)
):
    """Admin login endpoint."""
    admin = db.query(Admin).filter(Admin.email == data.email).first()
    if not admin or not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is disabled"
        )

    # Update last login
    admin.last_login = datetime.utcnow()
    db.commit()

    # Create token with admin flag
    token_data = {
        "sub": str(admin.id),
        "email": admin.email,
        "is_admin": True
    }
    access_token = create_access_token(data=token_data)

    return AdminLoginResponse(
        access_token=access_token,
        admin=AdminResponse(
            id=admin.id,
            email=admin.email,
            name=admin.name,
            is_active=admin.is_active,
            last_login=admin.last_login
        )
    )


@router.post("/create-first-admin")
async def create_first_admin(
    email: str,
    password: str,
    name: str,
    secret_key: str,
    db: Session = Depends(get_db)
):
    """Create the first admin account. Requires secret key from env."""
    expected_secret = os.getenv("ADMIN_SETUP_SECRET", "your-admin-setup-secret")
    if secret_key != expected_secret:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid setup secret"
        )

    # Check if any admin exists
    existing = db.query(Admin).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin already exists. Use normal admin management."
        )

    admin = Admin(
        email=email,
        password_hash=get_password_hash(password),
        name=name,
        is_active=True
    )
    db.add(admin)
    db.commit()

    return {"message": "Admin created successfully", "email": email}


# ============== DASHBOARD ==============

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard_stats(
    db: Session = Depends(get_db)
):
    """Get dashboard statistics."""
    now = datetime.utcnow()
    month_start = datetime(now.year, now.month, 1)

    # Family stats
    total_families = db.query(Family).count()
    active_families = db.query(Family).filter(Family.is_active == True).count()
    families_this_month = db.query(Family).filter(Family.created_at >= month_start).count()

    # User stats
    total_users = db.query(User).count()
    users_this_month = db.query(User).filter(User.created_at >= month_start).count()

    # AI usage stats
    ai_stats = db.query(
        func.sum(AiTokenUsage.total_tokens).label("tokens"),
        func.sum(AiTokenUsage.cost_usd).label("cost")
    ).first()

    return DashboardStats(
        total_families=total_families,
        active_families=active_families,
        total_users=total_users,
        total_ai_tokens_used=ai_stats.tokens or 0,
        total_ai_cost=round(ai_stats.cost or 0, 2),
        families_this_month=families_this_month,
        users_this_month=users_this_month
    )


# ============== FAMILY MANAGEMENT ==============

@router.get("/families", response_model=FamilyListResponse)
async def list_families(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    db: Session = Depends(get_db)
):
    """List all families with pagination."""
    query = db.query(Family)

    if search:
        query = query.filter(
            Family.name.ilike(f"%{search}%") |
            Family.owner_email.ilike(f"%{search}%")
        )

    if is_active is not None:
        query = query.filter(Family.is_active == is_active)

    total = query.count()

    families = query.order_by(Family.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    items = []
    for f in families:
        member_count = db.query(User).filter(User.family_id == f.id).count()
        ai_usage = db.query(
            func.sum(AiTokenUsage.total_tokens).label("tokens"),
            func.sum(AiTokenUsage.cost_usd).label("cost")
        ).filter(AiTokenUsage.family_id == f.id).first()

        items.append(FamilyListItem(
            id=f.id,
            name=f.name,
            slug=f.slug,
            owner_email=f.owner_email,
            is_verified=f.is_verified,
            is_active=f.is_active,
            subscription_plan=f.subscription_plan,
            member_count=member_count,
            created_at=f.created_at,
            ai_tokens_used=ai_usage.tokens or 0,
            ai_cost=round(ai_usage.cost or 0, 4)
        ))

    return FamilyListResponse(
        families=items,
        total=total,
        page=page,
        page_size=page_size
    )


@router.get("/families/{family_id}")
async def get_family_details(
    family_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed information about a family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    members = db.query(User).filter(User.family_id == family_id).all()
    features = db.query(FamilyFeature).filter(FamilyFeature.family_id == family_id).all()
    ai_limit = db.query(FamilyAiLimit).filter(FamilyAiLimit.family_id == family_id).first()

    return {
        "family": {
            "id": family.id,
            "name": family.name,
            "slug": family.slug,
            "owner_email": family.owner_email,
            "is_verified": family.is_verified,
            "is_active": family.is_active,
            "subscription_plan": family.subscription_plan,
            "created_at": family.created_at
        },
        "members": [
            {
                "id": m.id,
                "name": m.name,
                "email": m.email,
                "role": m.role.value if hasattr(m.role, 'value') else m.role,
                "is_email_verified": m.is_email_verified
            } for m in members
        ],
        "features": {f.feature_key: f.is_enabled for f in features},
        "ai_limit": {
            "monthly_limit": ai_limit.monthly_token_limit if ai_limit else 100000,
            "current_usage": ai_limit.current_month_usage if ai_limit else 0,
            "reset_date": ai_limit.reset_date if ai_limit else None
        } if ai_limit else None
    }


@router.put("/families/{family_id}/status")
async def update_family_status(
    family_id: int,
    is_active: bool,
    db: Session = Depends(get_db)
):
    """Activate or deactivate a family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    family.is_active = is_active
    db.commit()

    return {"message": f"Family {'activated' if is_active else 'deactivated'} successfully"}


@router.put("/families/{family_id}/verify")
async def verify_family_directly(
    family_id: int,
    db: Session = Depends(get_db)
):
    """Admin: Directly verify a family (bypass email verification)."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    family.is_verified = True
    family.verified_at = datetime.utcnow()
    family.verification_token = None

    # Also verify the owner
    owner = db.query(User).filter(
        User.family_id == family_id,
        User.email == family.owner_email
    ).first()
    if owner:
        owner.is_email_verified = True
        owner.verification_token = None

    db.commit()

    return {"message": "Family and owner verified successfully"}


@router.put("/users/{user_id}/verify")
async def verify_user_directly(
    user_id: int,
    db: Session = Depends(get_db)
):
    """Admin: Directly verify a user's email (bypass email verification)."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    user.is_email_verified = True
    user.verification_token = None

    db.commit()

    return {"message": f"User {user.email or user.username} verified successfully"}


@router.put("/families/{family_id}/features")
async def update_family_features(
    family_id: int,
    data: FamilyFeaturesUpdate,
    db: Session = Depends(get_db)
):
    """Update feature flags for a family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    for feature_key, is_enabled in data.features.items():
        feature = db.query(FamilyFeature).filter(
            FamilyFeature.family_id == family_id,
            FamilyFeature.feature_key == feature_key
        ).first()

        if feature:
            feature.is_enabled = is_enabled
        else:
            # Create new feature entry
            new_feature = FamilyFeature(
                family_id=family_id,
                feature_key=feature_key,
                is_enabled=is_enabled
            )
            db.add(new_feature)

    db.commit()

    return {"message": "Features updated successfully"}


@router.put("/families/{family_id}/ai-limits")
async def update_family_ai_limits(
    family_id: int,
    monthly_token_limit: int,
    db: Session = Depends(get_db)
):
    """Update AI token limits for a family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    ai_limit = db.query(FamilyAiLimit).filter(FamilyAiLimit.family_id == family_id).first()
    if ai_limit:
        ai_limit.monthly_token_limit = monthly_token_limit
    else:
        ai_limit = FamilyAiLimit(
            family_id=family_id,
            monthly_token_limit=monthly_token_limit,
            current_month_usage=0
        )
        db.add(ai_limit)

    db.commit()

    return {"message": "AI limits updated successfully"}


@router.get("/families/{family_id}/usage", response_model=TokenUsageSummary)
async def get_family_usage(
    family_id: int,
    db: Session = Depends(get_db)
):
    """Get detailed AI usage for a family."""
    family = db.query(Family).filter(Family.id == family_id).first()
    if not family:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Family not found"
        )

    # Get AI limit
    ai_limit = db.query(FamilyAiLimit).filter(FamilyAiLimit.family_id == family_id).first()

    # Get total usage
    total_usage = db.query(
        func.sum(AiTokenUsage.total_tokens).label("tokens"),
        func.sum(AiTokenUsage.cost_usd).label("cost")
    ).filter(AiTokenUsage.family_id == family_id).first()

    # Usage by feature
    by_feature = db.query(
        AiTokenUsage.feature_used,
        func.sum(AiTokenUsage.total_tokens).label("tokens")
    ).filter(AiTokenUsage.family_id == family_id).group_by(
        AiTokenUsage.feature_used
    ).all()

    # Usage by model
    by_model = db.query(
        AiTokenUsage.model_used,
        func.sum(AiTokenUsage.total_tokens).label("tokens")
    ).filter(AiTokenUsage.family_id == family_id).group_by(
        AiTokenUsage.model_used
    ).all()

    # Recent usage
    recent = db.query(AiTokenUsage).filter(
        AiTokenUsage.family_id == family_id
    ).order_by(AiTokenUsage.created_at.desc()).limit(20).all()

    monthly_limit = ai_limit.monthly_token_limit if ai_limit else 100000
    total_tokens = total_usage.tokens or 0

    return TokenUsageSummary(
        family_id=family_id,
        family_name=family.name,
        total_tokens=total_tokens,
        total_cost=round(total_usage.cost or 0, 4),
        monthly_limit=monthly_limit,
        usage_percentage=round((total_tokens / monthly_limit * 100) if monthly_limit > 0 else 0, 2),
        usage_by_feature={f.feature_used: f.tokens for f in by_feature},
        usage_by_model={m.model_used: m.tokens for m in by_model},
        recent_usage=[
            TokenUsageItem(
                id=u.id,
                user_id=u.user_id,
                feature_used=u.feature_used,
                model_used=u.model_used,
                prompt_tokens=u.prompt_tokens,
                completion_tokens=u.completion_tokens,
                total_tokens=u.total_tokens,
                cost_usd=u.cost_usd,
                created_at=u.created_at
            ) for u in recent
        ]
    )


# ============== EMAIL CONFIG ==============

@router.get("/email-config", response_model=EmailConfigResponse)
async def get_email_config(
    db: Session = Depends(get_db)
):
    """Get current email configuration."""
    config = db.query(EmailConfig).filter(EmailConfig.is_active == True).first()
    if not config:
        return EmailConfigResponse(
            provider="smtp",
            is_active=False
        )

    return EmailConfigResponse(
        id=config.id,
        provider=config.provider.value if hasattr(config.provider, 'value') else config.provider,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        from_email=config.from_email,
        from_name=config.from_name,
        is_active=config.is_active
    )


@router.put("/email-config", response_model=EmailConfigResponse)
async def update_email_config(
    data: EmailConfigUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update email configuration."""
    # Deactivate existing configs
    db.query(EmailConfig).update({"is_active": False})

    # Create or update config
    config = db.query(EmailConfig).first()
    if config:
        config.provider = EmailProvider(data.provider)
        config.smtp_host = data.smtp_host
        config.smtp_port = data.smtp_port
        config.smtp_user = data.smtp_user
        if data.smtp_password:  # Only update if provided
            config.smtp_password = data.smtp_password
        config.from_email = data.from_email
        config.from_name = data.from_name
        config.oauth_client_id = data.oauth_client_id
        config.oauth_client_secret = data.oauth_client_secret
        config.is_active = data.is_active
    else:
        config = EmailConfig(
            provider=EmailProvider(data.provider),
            smtp_host=data.smtp_host,
            smtp_port=data.smtp_port,
            smtp_user=data.smtp_user,
            smtp_password=data.smtp_password,
            from_email=data.from_email,
            from_name=data.from_name,
            oauth_client_id=data.oauth_client_id,
            oauth_client_secret=data.oauth_client_secret,
            is_active=data.is_active
        )
        db.add(config)

    db.commit()
    db.refresh(config)

    return EmailConfigResponse(
        id=config.id,
        provider=config.provider.value if hasattr(config.provider, 'value') else config.provider,
        smtp_host=config.smtp_host,
        smtp_port=config.smtp_port,
        smtp_user=config.smtp_user,
        from_email=config.from_email,
        from_name=config.from_name,
        is_active=config.is_active
    )


class EmailTestWithConfigRequest(BaseModel):
    to_email: str
    smtp_host: str
    smtp_port: int = 587
    smtp_user: str
    smtp_password: str
    from_email: str
    from_name: str = "Family Hub"


@router.post("/email-config/test")
async def test_email_config(
    data: EmailTestWithConfigRequest,
    db: Session = Depends(get_db)
):
    """Send a test email using provided config."""
    import smtplib
    import ssl
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = "Family Hub - Test Email"
        msg["From"] = f"{data.from_name} <{data.from_email}>"
        msg["To"] = data.to_email

        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h1 style="color: #2e7d32;">Test Email Successful!</h1>
            <p>This is a test email from Family Hub.</p>
            <p>If you received this, your email configuration is working correctly!</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_content, "html"))

        # Create SSL context (similar to Java's mail.smtp.ssl.trust)
        context = ssl.create_default_context()

        # Try primary method based on port
        last_error = None

        # Port 465: Try SSL first, then STARTTLS
        if data.smtp_port == 465:
            try:
                # Direct SSL connection for port 465
                with smtplib.SMTP_SSL(data.smtp_host, data.smtp_port, context=context, timeout=30) as server:
                    server.login(data.smtp_user, data.smtp_password)
                    server.sendmail(data.from_email, data.to_email, msg.as_string())
                return {"message": "Test email sent successfully"}
            except Exception as e:
                last_error = e
                # Try STARTTLS as fallback (some servers use this even on 465)
                try:
                    with smtplib.SMTP(data.smtp_host, data.smtp_port, timeout=30) as server:
                        server.ehlo()
                        server.starttls(context=context)
                        server.ehlo()
                        server.login(data.smtp_user, data.smtp_password)
                        server.sendmail(data.from_email, data.to_email, msg.as_string())
                    return {"message": "Test email sent successfully"}
                except:
                    pass  # Fall through to try port 587
        else:
            # STARTTLS for port 587 or other ports
            try:
                with smtplib.SMTP(data.smtp_host, data.smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(data.smtp_user, data.smtp_password)
                    server.sendmail(data.from_email, data.to_email, msg.as_string())
                return {"message": "Test email sent successfully"}
            except Exception as e:
                last_error = e

        # If port 465 failed, try 587 with STARTTLS (Zoho fallback)
        if data.smtp_port == 465:
            try:
                with smtplib.SMTP(data.smtp_host, 587, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(data.smtp_user, data.smtp_password)
                    server.sendmail(data.from_email, data.to_email, msg.as_string())
                return {"message": "Test email sent successfully (using port 587 fallback)"}
            except Exception as e:
                last_error = e

        # If we got here, all attempts failed
        if last_error:
            raise last_error
        raise Exception("All connection methods failed")

    except smtplib.SMTPAuthenticationError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Authentication failed. Check username/password. Error: {str(e)}"
        )
    except smtplib.SMTPConnectError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Connection failed. Check host/port. Error: {str(e)}"
        )
    except ssl.SSLError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"SSL/TLS error: {str(e)}"
        )
    except smtplib.SMTPException as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"SMTP error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send test email: {str(e)}"
        )


# ============== FEATURES ==============

@router.get("/features", response_model=List[AvailableFeature])
async def get_available_features():
    """Get list of all available features."""
    return [
        AvailableFeature(
            key=f["key"],
            name=f["name"],
            description=f["description"]
        ) for f in AVAILABLE_FEATURES
    ]


# ============== ADMIN MANAGEMENT ==============

class AdminCreateRequest(BaseModel):
    email: str
    password: str
    name: str


class AdminUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


class AdminListItem(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None


@router.get("/admins", response_model=List[AdminListItem])
async def list_admins(
    db: Session = Depends(get_db)
):
    """List all admin accounts."""
    admins = db.query(Admin).order_by(Admin.created_at.desc()).all()
    return [
        AdminListItem(
            id=a.id,
            email=a.email,
            name=a.name,
            is_active=a.is_active,
            created_at=a.created_at,
            last_login=a.last_login
        ) for a in admins
    ]


@router.post("/admins", response_model=AdminListItem)
async def create_admin(
    data: AdminCreateRequest,
    db: Session = Depends(get_db)
):
    """Create a new admin account."""
    # Check if email already exists
    existing = db.query(Admin).filter(Admin.email == data.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Admin with this email already exists"
        )

    admin = Admin(
        email=data.email,
        password_hash=get_password_hash(data.password),
        name=data.name,
        is_active=True
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)

    return AdminListItem(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        is_active=admin.is_active,
        created_at=admin.created_at,
        last_login=admin.last_login
    )


@router.put("/admins/{admin_id}", response_model=AdminListItem)
async def update_admin(
    admin_id: int,
    data: AdminUpdateRequest,
    db: Session = Depends(get_db)
):
    """Update an admin account."""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    if data.name is not None:
        admin.name = data.name
    if data.email is not None:
        # Check if email is taken by another admin
        existing = db.query(Admin).filter(
            Admin.email == data.email,
            Admin.id != admin_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already in use by another admin"
            )
        admin.email = data.email
    if data.password is not None:
        admin.password_hash = get_password_hash(data.password)
    if data.is_active is not None:
        admin.is_active = data.is_active

    db.commit()
    db.refresh(admin)

    return AdminListItem(
        id=admin.id,
        email=admin.email,
        name=admin.name,
        is_active=admin.is_active,
        created_at=admin.created_at,
        last_login=admin.last_login
    )


@router.delete("/admins/{admin_id}")
async def delete_admin(
    admin_id: int,
    db: Session = Depends(get_db)
):
    """Delete an admin account."""
    admin = db.query(Admin).filter(Admin.id == admin_id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Admin not found"
        )

    # Don't allow deleting the last admin
    admin_count = db.query(Admin).filter(Admin.is_active == True).count()
    if admin_count <= 1 and admin.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete the last active admin"
        )

    db.delete(admin)
    db.commit()

    return {"message": "Admin deleted successfully"}
