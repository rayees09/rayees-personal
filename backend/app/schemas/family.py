from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime


# ============== FAMILY REGISTRATION ==============

class FamilyRegisterRequest(BaseModel):
    """Request to register a new family."""
    family_name: str
    owner_name: str
    owner_email: EmailStr
    password: str
    country: str


class FamilyRegisterResponse(BaseModel):
    """Response after family registration."""
    family_id: int
    family_name: str
    owner_email: str
    country: Optional[str] = None
    message: str
    requires_verification: bool = True


class EmailVerifyRequest(BaseModel):
    """Request to verify email."""
    token: str


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""
    email: EmailStr


# ============== FAMILY MODELS ==============

class FamilyBase(BaseModel):
    name: str
    slug: str


class FamilyResponse(FamilyBase):
    id: int
    owner_email: str
    is_verified: bool
    is_active: bool
    subscription_plan: str
    created_at: datetime
    member_count: Optional[int] = 0

    class Config:
        from_attributes = True


class FamilyDetailResponse(FamilyResponse):
    """Detailed family response with features and limits."""
    features: List["FeatureResponse"] = []
    ai_limit: Optional["AiLimitResponse"] = None
    total_token_usage: int = 0


# ============== FEATURE FLAGS ==============

class FeatureResponse(BaseModel):
    feature_key: str
    is_enabled: bool
    config_json: Optional[dict] = None

    class Config:
        from_attributes = True


class FeatureToggleRequest(BaseModel):
    """Request to toggle a feature."""
    feature_key: str
    is_enabled: bool
    config_json: Optional[dict] = None


class BulkFeatureToggleRequest(BaseModel):
    """Request to set multiple features at once."""
    features: List[FeatureToggleRequest]


# ============== AI LIMITS ==============

class AiLimitResponse(BaseModel):
    monthly_token_limit: int
    current_month_usage: int
    reset_date: Optional[datetime] = None
    usage_percentage: float = 0.0

    class Config:
        from_attributes = True


class AiLimitUpdateRequest(BaseModel):
    """Request to update AI token limit."""
    monthly_token_limit: int


# ============== MEMBER MANAGEMENT ==============

class AddMemberRequest(BaseModel):
    """Request to add a family member."""
    name: str
    email: Optional[EmailStr] = None
    username: Optional[str] = None  # For kids
    password: Optional[str] = None
    role: str = "child"  # parent or child
    dob: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None


class MemberResponse(BaseModel):
    id: int
    name: str
    email: Optional[str] = None
    username: Optional[str] = None
    role: str
    dob: Optional[str] = None
    avatar: Optional[str] = None
    is_email_verified: bool = False
    total_points: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


# Update forward references
FamilyDetailResponse.model_rebuild()
