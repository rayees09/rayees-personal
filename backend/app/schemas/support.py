from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============== ISSUES ==============

class IssueCreate(BaseModel):
    subject: str
    description: str
    category: str = "general"  # bug, feature, question, other
    contact_email: Optional[EmailStr] = None


class IssueResponse(BaseModel):
    id: int
    family_id: Optional[int] = None
    user_id: Optional[int] = None
    subject: str
    description: str
    category: str
    priority: str
    status: str
    contact_email: Optional[str] = None
    admin_notes: Optional[str] = None
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class IssueListResponse(BaseModel):
    issues: List[IssueResponse]
    total: int
    page: int
    page_size: int


class IssueUpdateRequest(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    admin_notes: Optional[str] = None


# ============== ACTIVITY LOGS ==============

class ActivityLogResponse(BaseModel):
    id: int
    family_id: Optional[int] = None
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    family_name: Optional[str] = None
    action: str
    details: Optional[str] = None
    ip_address: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    device_type: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityLogListResponse(BaseModel):
    logs: List[ActivityLogResponse]
    total: int
    page: int
    page_size: int
