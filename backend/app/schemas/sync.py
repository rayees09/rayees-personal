from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime


class GoogleAuthUrlResponse(BaseModel):
    """Response with OAuth authorization URL"""
    auth_url: str


class GoogleAuthCallbackRequest(BaseModel):
    """Request from OAuth callback"""
    code: str
    state: Optional[str] = None


class SetFolderRequest(BaseModel):
    """Request to set the sync folder"""
    folder_id: str


class GoogleSheetsConfigResponse(BaseModel):
    """User's Google Drive sync configuration"""
    id: int
    user_id: int
    google_email: Optional[str] = None
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    is_connected: bool = False
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SyncRequest(BaseModel):
    year: int


class SyncLogResponse(BaseModel):
    id: int
    user_id: int
    feature: str
    year: int
    status: str
    rows_synced: int
    error_message: Optional[str] = None
    synced_at: datetime

    class Config:
        from_attributes = True


class SyncStatusResponse(BaseModel):
    is_connected: bool
    google_email: Optional[str] = None
    folder_id: Optional[str] = None
    folder_name: Optional[str] = None
    recent_syncs: List[SyncLogResponse] = []


class FolderInfo(BaseModel):
    id: str
    name: str


class FolderListResponse(BaseModel):
    folders: List[FolderInfo]
