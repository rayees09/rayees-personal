from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import Optional
from datetime import datetime

from app.database import get_db
from app.models.support import Issue, ActivityLog, IssueStatus, IssuePriority
from app.models.user import User
from app.models.family import Family
from app.models.admin import Admin
from app.services.auth import get_current_user
from app.routers.admin import get_current_admin
from app.schemas.support import (
    IssueCreate, IssueResponse, IssueListResponse, IssueUpdateRequest,
    ActivityLogResponse, ActivityLogListResponse
)

router = APIRouter(prefix="/api/support", tags=["Support"])


# ============== HELPER FUNCTIONS ==============

def get_client_ip(request: Request) -> str:
    """Get client IP from request."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


def parse_user_agent(user_agent: str) -> str:
    """Determine device type from user agent."""
    if not user_agent:
        return "unknown"
    ua_lower = user_agent.lower()
    if "mobile" in ua_lower or "android" in ua_lower or "iphone" in ua_lower:
        return "mobile"
    elif "tablet" in ua_lower or "ipad" in ua_lower:
        return "tablet"
    return "desktop"


async def log_activity(
    db: Session,
    action: str,
    request: Request,
    user_id: int = None,
    family_id: int = None,
    details: str = None,
    country: str = None,
    city: str = None
):
    """Log user activity."""
    user_agent = request.headers.get("User-Agent", "")

    log = ActivityLog(
        user_id=user_id,
        family_id=family_id,
        action=action,
        details=details,
        ip_address=get_client_ip(request),
        country=country,
        city=city,
        user_agent=user_agent[:500] if user_agent else None,
        device_type=parse_user_agent(user_agent)
    )
    db.add(log)
    db.commit()
    return log


# ============== USER ENDPOINTS ==============

@router.post("/issues", response_model=IssueResponse)
async def create_issue(
    data: IssueCreate,
    request: Request,
    db: Session = Depends(get_db)
):
    """Submit a new issue/feedback. Works with or without login."""
    # Try to get current user if token provided
    current_user = None
    try:
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]
            from jose import jwt
            from app.config import settings
            payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
            user_id = payload.get("sub")
            if user_id:
                current_user = db.query(User).filter(User.id == int(user_id)).first()
    except:
        pass

    issue = Issue(
        family_id=current_user.family_id if current_user else None,
        user_id=current_user.id if current_user else None,
        subject=data.subject,
        description=data.description,
        category=data.category,
        contact_email=data.contact_email or (current_user.email if current_user else None)
    )
    db.add(issue)
    db.commit()
    db.refresh(issue)

    # Log the activity
    await log_activity(
        db, "issue_submitted", request,
        user_id=current_user.id if current_user else None,
        family_id=current_user.family_id if current_user else None,
        details=f"Issue: {data.subject}"
    )

    return IssueResponse(
        id=issue.id,
        family_id=issue.family_id,
        user_id=issue.user_id,
        subject=issue.subject,
        description=issue.description,
        category=issue.category,
        priority=issue.priority.value if hasattr(issue.priority, 'value') else issue.priority,
        status=issue.status.value if hasattr(issue.status, 'value') else issue.status,
        contact_email=issue.contact_email,
        admin_notes=issue.admin_notes,
        resolved_at=issue.resolved_at,
        created_at=issue.created_at
    )


@router.get("/my-issues", response_model=IssueListResponse)
async def get_my_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get issues submitted by current user."""
    query = db.query(Issue).filter(Issue.user_id == current_user.id)

    total = query.count()
    issues = query.order_by(Issue.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return IssueListResponse(
        issues=[
            IssueResponse(
                id=i.id,
                family_id=i.family_id,
                user_id=i.user_id,
                subject=i.subject,
                description=i.description,
                category=i.category,
                priority=i.priority.value if hasattr(i.priority, 'value') else i.priority,
                status=i.status.value if hasattr(i.status, 'value') else i.status,
                contact_email=i.contact_email,
                admin_notes=i.admin_notes,
                resolved_at=i.resolved_at,
                created_at=i.created_at
            ) for i in issues
        ],
        total=total,
        page=page,
        page_size=page_size
    )


# ============== ADMIN ENDPOINTS ==============

@router.get("/admin/issues", response_model=IssueListResponse)
async def list_all_issues(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    category: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: List all issues."""
    query = db.query(Issue)

    if status:
        query = query.filter(Issue.status == status)
    if category:
        query = query.filter(Issue.category == category)

    total = query.count()
    issues = query.order_by(Issue.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    return IssueListResponse(
        issues=[
            IssueResponse(
                id=i.id,
                family_id=i.family_id,
                user_id=i.user_id,
                subject=i.subject,
                description=i.description,
                category=i.category,
                priority=i.priority.value if hasattr(i.priority, 'value') else i.priority,
                status=i.status.value if hasattr(i.status, 'value') else i.status,
                contact_email=i.contact_email,
                admin_notes=i.admin_notes,
                resolved_at=i.resolved_at,
                created_at=i.created_at
            ) for i in issues
        ],
        total=total,
        page=page,
        page_size=page_size
    )


@router.put("/admin/issues/{issue_id}", response_model=IssueResponse)
async def update_issue(
    issue_id: int,
    data: IssueUpdateRequest,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: Update issue status/priority/notes."""
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Issue not found"
        )

    if data.status:
        issue.status = data.status
        if data.status == "resolved":
            issue.resolved_at = datetime.utcnow()

    if data.priority:
        issue.priority = data.priority

    if data.admin_notes is not None:
        issue.admin_notes = data.admin_notes

    db.commit()
    db.refresh(issue)

    return IssueResponse(
        id=issue.id,
        family_id=issue.family_id,
        user_id=issue.user_id,
        subject=issue.subject,
        description=issue.description,
        category=issue.category,
        priority=issue.priority.value if hasattr(issue.priority, 'value') else issue.priority,
        status=issue.status.value if hasattr(issue.status, 'value') else issue.status,
        contact_email=issue.contact_email,
        admin_notes=issue.admin_notes,
        resolved_at=issue.resolved_at,
        created_at=issue.created_at
    )


@router.get("/admin/activity-logs", response_model=ActivityLogListResponse)
async def list_activity_logs(
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    action: Optional[str] = None,
    family_id: Optional[int] = None,
    country: Optional[str] = None,
    admin: Admin = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """Admin: List all activity logs."""
    query = db.query(ActivityLog)

    if action:
        query = query.filter(ActivityLog.action == action)
    if family_id:
        query = query.filter(ActivityLog.family_id == family_id)
    if country:
        query = query.filter(ActivityLog.country == country)

    total = query.count()
    logs = query.order_by(ActivityLog.created_at.desc()).offset(
        (page - 1) * page_size
    ).limit(page_size).all()

    # Get user and family names
    result_logs = []
    for log in logs:
        user_name = None
        family_name = None

        if log.user_id:
            user = db.query(User).filter(User.id == log.user_id).first()
            user_name = user.name if user else None

        if log.family_id:
            family = db.query(Family).filter(Family.id == log.family_id).first()
            family_name = family.name if family else None

        result_logs.append(ActivityLogResponse(
            id=log.id,
            family_id=log.family_id,
            user_id=log.user_id,
            user_name=user_name,
            family_name=family_name,
            action=log.action,
            details=log.details,
            ip_address=log.ip_address,
            country=log.country,
            city=log.city,
            device_type=log.device_type,
            created_at=log.created_at
        ))

    return ActivityLogListResponse(
        logs=result_logs,
        total=total,
        page=page,
        page_size=page_size
    )


# Export log_activity for use in other routers
__all__ = ['router', 'log_activity', 'get_client_ip', 'parse_user_agent']
