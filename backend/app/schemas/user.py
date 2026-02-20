from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import date, datetime
from enum import Enum


class UserRole(str, Enum):
    PARENT = "parent"
    CHILD = "child"


class UserBase(BaseModel):
    name: str
    username: Optional[str] = None  # For kids login
    email: Optional[EmailStr] = None
    role: UserRole = UserRole.CHILD
    dob: Optional[date] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    avatar: Optional[str] = None


class UserCreate(UserBase):
    password: Optional[str] = None  # Password for all users


class UserUpdate(BaseModel):
    name: Optional[str] = None
    username: Optional[str] = None  # For kids
    email: Optional[EmailStr] = None
    password: Optional[str] = None  # For all users
    dob: Optional[date] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    avatar: Optional[str] = None


class UserResponse(UserBase):
    id: int
    created_at: datetime
    total_points: int = 0

    class Config:
        from_attributes = True


class UserLogin(BaseModel):
    email: Optional[str] = None  # For parent login
    username: Optional[str] = None  # For kid login
    password: Optional[str] = None


class GoogleLoginRequest(BaseModel):
    credential: str  # Google ID token
    family_name: Optional[str] = None  # For new registrations
    country: Optional[str] = None  # For new registrations


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FamilyMemberResponse(BaseModel):
    id: int
    user: UserResponse
    relationship_type: str

    class Config:
        from_attributes = True
