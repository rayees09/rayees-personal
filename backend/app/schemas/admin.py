from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict
from datetime import datetime


# ============== ADMIN AUTH ==============

class AdminLoginRequest(BaseModel):
    email: EmailStr
    password: str


class AdminLoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    admin: "AdminResponse"


class AdminResponse(BaseModel):
    id: int
    email: str
    name: str
    is_active: bool
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============== DASHBOARD ==============

class DashboardStats(BaseModel):
    total_families: int
    active_families: int
    total_users: int
    total_ai_tokens_used: int
    total_ai_cost: float
    families_this_month: int
    users_this_month: int


class FamilyListItem(BaseModel):
    id: int
    name: str
    slug: str
    owner_email: str
    country: Optional[str] = None
    is_verified: bool
    is_active: bool
    subscription_plan: str
    member_count: int
    created_at: datetime
    ai_tokens_used: int = 0
    ai_cost: float = 0.0

    class Config:
        from_attributes = True


class FamilyListResponse(BaseModel):
    families: List[FamilyListItem]
    total: int
    page: int
    page_size: int


# ============== EMAIL CONFIG ==============

class EmailConfigResponse(BaseModel):
    id: Optional[int] = None
    provider: str
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str = "Family Hub"
    is_active: bool = False

    class Config:
        from_attributes = True


class EmailConfigUpdateRequest(BaseModel):
    provider: str = "smtp"
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str = "Family Hub"
    oauth_client_id: Optional[str] = None
    oauth_client_secret: Optional[str] = None
    is_active: bool = True


class EmailTestRequest(BaseModel):
    to_email: EmailStr


# ============== TOKEN USAGE ==============

class TokenUsageItem(BaseModel):
    id: int
    user_id: Optional[int] = None
    user_name: Optional[str] = None
    feature_used: str
    model_used: str
    prompt_tokens: int
    completion_tokens: int
    total_tokens: int
    cost_usd: float
    created_at: datetime

    class Config:
        from_attributes = True


class TokenUsageSummary(BaseModel):
    family_id: int
    family_name: str
    total_tokens: int
    total_cost: float
    monthly_limit: int
    usage_percentage: float
    usage_by_feature: Dict[str, int]
    usage_by_model: Dict[str, int]
    recent_usage: List[TokenUsageItem]


# ============== FEATURES ==============

class AvailableFeature(BaseModel):
    key: str
    name: str
    description: str


class FamilyFeaturesUpdate(BaseModel):
    features: Dict[str, bool]


# Update forward references
AdminLoginResponse.model_rebuild()
