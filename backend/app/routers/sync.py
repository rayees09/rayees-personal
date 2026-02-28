from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import extract
from typing import Optional
from datetime import datetime, timezone
from urllib.parse import urlencode
import requests

from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.sync import GoogleSheetsConfig, SyncLog
from app.models.islamic import ZakatConfig, ZakatPayment
from app.models.finance import MonthlyExpense
from app.models.assistant import Note, QuickTask
from app.schemas.sync import (
    GoogleAuthUrlResponse, SetFolderRequest, GoogleSheetsConfigResponse,
    SyncRequest, SyncLogResponse, SyncStatusResponse, FolderListResponse, FolderInfo
)
from app.services.auth import get_current_user
from app.services.google_sheets import (
    GoogleDriveOAuthService, SCOPES,
    format_zakat_data, format_expenses_data, format_notes_data, format_tasks_data
)

router = APIRouter(prefix="/api/sync", tags=["Google Sheets Sync"])


def get_drive_service(config: GoogleSheetsConfig) -> GoogleDriveOAuthService:
    """Get Google Drive service using user's OAuth tokens."""
    if not config.access_token or not config.refresh_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected. Please connect first.")

    return GoogleDriveOAuthService(
        access_token=config.access_token,
        refresh_token=config.refresh_token,
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret
    )


def update_tokens_if_refreshed(config: GoogleSheetsConfig, service: GoogleDriveOAuthService, db: Session):
    """Update tokens in database if they were refreshed."""
    tokens = service.get_updated_tokens()
    if tokens['access_token'] != config.access_token:
        config.access_token = tokens['access_token']
        if tokens['expiry']:
            config.token_expiry = datetime.fromisoformat(tokens['expiry'])
        db.commit()


# ============ OAuth Flow ============

@router.get("/google/auth-url", response_model=GoogleAuthUrlResponse)
async def get_google_auth_url(current_user: User = Depends(get_current_user)):
    """Generate Google OAuth authorization URL."""
    if not settings.google_client_id or not settings.google_client_secret:
        raise HTTPException(status_code=500, detail="Google OAuth not configured")

    params = {
        'client_id': settings.google_client_id,
        'redirect_uri': settings.google_redirect_uri,
        'response_type': 'code',
        'scope': ' '.join(SCOPES),
        'access_type': 'offline',
        'prompt': 'consent',
        'state': str(current_user.id)  # Pass user ID in state
    }

    auth_url = f"https://accounts.google.com/o/oauth2/v2/auth?{urlencode(params)}"
    return GoogleAuthUrlResponse(auth_url=auth_url)


@router.get("/google/callback")
async def google_oauth_callback(
    code: str = Query(...),
    state: str = Query(...),
    db: Session = Depends(get_db)
):
    """Handle Google OAuth callback."""
    try:
        user_id = int(state)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid state parameter")

    # Exchange code for tokens
    token_url = "https://oauth2.googleapis.com/token"
    token_data = {
        'code': code,
        'client_id': settings.google_client_id,
        'client_secret': settings.google_client_secret,
        'redirect_uri': settings.google_redirect_uri,
        'grant_type': 'authorization_code'
    }

    response = requests.post(token_url, data=token_data)
    if response.status_code != 200:
        raise HTTPException(status_code=400, detail=f"Failed to exchange code: {response.text}")

    tokens = response.json()
    access_token = tokens.get('access_token')
    refresh_token = tokens.get('refresh_token')
    expires_in = tokens.get('expires_in', 3600)

    if not access_token:
        raise HTTPException(status_code=400, detail="No access token received")

    # Get user's Google email
    userinfo_response = requests.get(
        'https://www.googleapis.com/oauth2/v2/userinfo',
        headers={'Authorization': f'Bearer {access_token}'}
    )
    google_email = None
    if userinfo_response.status_code == 200:
        google_email = userinfo_response.json().get('email')

    # Save or update config
    config = db.query(GoogleSheetsConfig).filter(GoogleSheetsConfig.user_id == user_id).first()

    if config:
        config.access_token = access_token
        config.refresh_token = refresh_token or config.refresh_token
        config.token_expiry = datetime.now(timezone.utc).replace(microsecond=0)
        config.google_email = google_email
    else:
        config = GoogleSheetsConfig(
            user_id=user_id,
            access_token=access_token,
            refresh_token=refresh_token,
            token_expiry=datetime.now(timezone.utc),
            google_email=google_email
        )
        db.add(config)

    db.commit()

    # Redirect to frontend settings page
    return RedirectResponse(url=f"{settings.frontend_url}/settings?google=connected")


# ============ Config Management ============

@router.get("/google/status", response_model=SyncStatusResponse)
async def get_sync_status(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current sync status."""
    config = db.query(GoogleSheetsConfig).filter(
        GoogleSheetsConfig.user_id == current_user.id
    ).first()

    recent_syncs = db.query(SyncLog).filter(
        SyncLog.user_id == current_user.id
    ).order_by(SyncLog.synced_at.desc()).limit(10).all()

    is_connected = config is not None and config.access_token is not None

    return SyncStatusResponse(
        is_connected=is_connected,
        google_email=config.google_email if config else None,
        folder_id=config.folder_id if config else None,
        folder_name=config.folder_name if config else None,
        recent_syncs=[SyncLogResponse.model_validate(s) for s in recent_syncs]
    )


@router.get("/google/folders", response_model=FolderListResponse)
async def list_google_folders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List folders in user's Google Drive."""
    config = db.query(GoogleSheetsConfig).filter(
        GoogleSheetsConfig.user_id == current_user.id
    ).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    try:
        service = get_drive_service(config)
        folders = service.list_folders()
        update_tokens_if_refreshed(config, service, db)

        return FolderListResponse(
            folders=[FolderInfo(id=f['id'], name=f['name']) for f in folders]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/folder")
async def set_sync_folder(
    request: SetFolderRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Set the folder to sync data to."""
    config = db.query(GoogleSheetsConfig).filter(
        GoogleSheetsConfig.user_id == current_user.id
    ).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")

    try:
        service = get_drive_service(config)
        folder_info = service.verify_folder_access(request.folder_id)
        update_tokens_if_refreshed(config, service, db)

        config.folder_id = request.folder_id
        config.folder_name = folder_info.get('name')
        db.commit()

        return {"message": f"Folder set to '{folder_info.get('name')}'", "folder_name": folder_info.get('name')}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/google/disconnect")
async def disconnect_google(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Disconnect Google Drive."""
    config = db.query(GoogleSheetsConfig).filter(
        GoogleSheetsConfig.user_id == current_user.id
    ).first()

    if config:
        db.delete(config)
        db.commit()

    return {"message": "Google Drive disconnected"}


# ============ Sync Operations ============

@router.post("/google/zakat")
async def sync_zakat(
    sync_data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync Zakat data to Google Sheets."""
    config = db.query(GoogleSheetsConfig).filter(
        GoogleSheetsConfig.user_id == current_user.id
    ).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    if not config.folder_id:
        raise HTTPException(status_code=400, detail="No sync folder selected")

    # Get Zakat data
    zakat_config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
        User.family_id == current_user.family_id,
        ZakatConfig.year == sync_data.year
    ).first()

    if not zakat_config:
        raise HTTPException(status_code=404, detail=f"No Zakat configuration found for {sync_data.year}")

    payments = db.query(ZakatPayment).filter(ZakatPayment.config_id == zakat_config.id).all()

    zakat_dict = {'total_due': zakat_config.total_due, 'currency': zakat_config.currency}
    payments_list = [{'date': str(p.date), 'amount': p.amount, 'recipient': p.recipient, 'notes': p.notes} for p in payments]
    data = format_zakat_data(zakat_dict, payments_list)

    try:
        service = get_drive_service(config)
        result = service.sync_to_sheet(config.folder_id, 'Zakat', sync_data.year, data)
        update_tokens_if_refreshed(config, service, db)

        db.add(SyncLog(user_id=current_user.id, feature='zakat', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
        db.commit()

        return {"message": f"Synced {result['rows_synced']} Zakat payments to '{result['sheet_name']}'", "rows_synced": result['rows_synced']}
    except Exception as e:
        db.add(SyncLog(user_id=current_user.id, feature='zakat', year=sync_data.year, status='failed', error_message=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/expenses")
async def sync_expenses(
    sync_data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync Expenses data to Google Sheets."""
    config = db.query(GoogleSheetsConfig).filter(GoogleSheetsConfig.user_id == current_user.id).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    if not config.folder_id:
        raise HTTPException(status_code=400, detail="No sync folder selected")

    expenses = db.query(MonthlyExpense).filter(
        MonthlyExpense.user_id == current_user.id,
        MonthlyExpense.year == sync_data.year
    ).all()

    if not expenses:
        raise HTTPException(status_code=404, detail=f"No expenses found for {sync_data.year}")

    expenses_list = [
        {'date': str(e.date) if e.date else '', 'month': e.month, 'category_name': e.category.name if e.category else '',
         'title': e.title, 'amount': e.amount, 'expense_type': e.expense_type, 'is_paid': e.is_paid, 'notes': e.notes}
        for e in expenses
    ]
    data = format_expenses_data(expenses_list, sync_data.year)

    try:
        service = get_drive_service(config)
        result = service.sync_to_sheet(config.folder_id, 'Expenses', sync_data.year, data)
        update_tokens_if_refreshed(config, service, db)

        db.add(SyncLog(user_id=current_user.id, feature='expenses', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
        db.commit()

        return {"message": f"Synced {result['rows_synced']} expenses to '{result['sheet_name']}'", "rows_synced": result['rows_synced']}
    except Exception as e:
        db.add(SyncLog(user_id=current_user.id, feature='expenses', year=sync_data.year, status='failed', error_message=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/notes")
async def sync_notes(
    sync_data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync Notes to Google Sheets."""
    config = db.query(GoogleSheetsConfig).filter(GoogleSheetsConfig.user_id == current_user.id).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    if not config.folder_id:
        raise HTTPException(status_code=400, detail="No sync folder selected")

    notes = db.query(Note).filter(
        Note.user_id == current_user.id,
        extract('year', Note.created_at) == sync_data.year
    ).all()

    if not notes:
        raise HTTPException(status_code=404, detail=f"No notes found for {sync_data.year}")

    notes_list = [
        {'id': n.id, 'title': n.title, 'content': n.content, 'category': n.category,
         'is_pinned': n.is_pinned, 'created_at': str(n.created_at), 'updated_at': str(n.updated_at)}
        for n in notes
    ]
    data = format_notes_data(notes_list)

    try:
        service = get_drive_service(config)
        result = service.sync_to_sheet(config.folder_id, 'Notes', sync_data.year, data)
        update_tokens_if_refreshed(config, service, db)

        db.add(SyncLog(user_id=current_user.id, feature='notes', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
        db.commit()

        return {"message": f"Synced {result['rows_synced']} notes to '{result['sheet_name']}'", "rows_synced": result['rows_synced']}
    except Exception as e:
        db.add(SyncLog(user_id=current_user.id, feature='notes', year=sync_data.year, status='failed', error_message=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/tasks")
async def sync_tasks(
    sync_data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync Tasks to Google Sheets."""
    config = db.query(GoogleSheetsConfig).filter(GoogleSheetsConfig.user_id == current_user.id).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    if not config.folder_id:
        raise HTTPException(status_code=400, detail="No sync folder selected")

    tasks = db.query(QuickTask).filter(
        QuickTask.user_id == current_user.id,
        extract('year', QuickTask.created_at) == sync_data.year
    ).all()

    if not tasks:
        raise HTTPException(status_code=404, detail=f"No tasks found for {sync_data.year}")

    tasks_list = [
        {'id': t.id, 'title': t.title, 'category': t.category, 'priority': t.priority,
         'due_date': str(t.due_date) if t.due_date else '', 'is_completed': t.is_completed,
         'notes': t.notes, 'created_at': str(t.created_at)}
        for t in tasks
    ]
    data = format_tasks_data(tasks_list)

    try:
        service = get_drive_service(config)
        result = service.sync_to_sheet(config.folder_id, 'Tasks', sync_data.year, data)
        update_tokens_if_refreshed(config, service, db)

        db.add(SyncLog(user_id=current_user.id, feature='tasks', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
        db.commit()

        return {"message": f"Synced {result['rows_synced']} tasks to '{result['sheet_name']}'", "rows_synced": result['rows_synced']}
    except Exception as e:
        db.add(SyncLog(user_id=current_user.id, feature='tasks', year=sync_data.year, status='failed', error_message=str(e)))
        db.commit()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/google/all")
async def sync_all(
    sync_data: SyncRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Sync all data to Google Sheets."""
    config = db.query(GoogleSheetsConfig).filter(GoogleSheetsConfig.user_id == current_user.id).first()

    if not config or not config.access_token:
        raise HTTPException(status_code=400, detail="Google Drive not connected")
    if not config.folder_id:
        raise HTTPException(status_code=400, detail="No sync folder selected")

    service = get_drive_service(config)
    results = []
    errors = []

    # Sync Zakat
    try:
        zakat_config = db.query(ZakatConfig).join(User, ZakatConfig.user_id == User.id).filter(
            User.family_id == current_user.family_id, ZakatConfig.year == sync_data.year
        ).first()
        if zakat_config:
            payments = db.query(ZakatPayment).filter(ZakatPayment.config_id == zakat_config.id).all()
            data = format_zakat_data(
                {'total_due': zakat_config.total_due, 'currency': zakat_config.currency},
                [{'date': str(p.date), 'amount': p.amount, 'recipient': p.recipient, 'notes': p.notes} for p in payments]
            )
            result = service.sync_to_sheet(config.folder_id, 'Zakat', sync_data.year, data)
            results.append(f"Zakat: {result['rows_synced']} rows")
            db.add(SyncLog(user_id=current_user.id, feature='zakat', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
    except Exception as e:
        errors.append(f"Zakat: {str(e)}")

    # Sync Expenses
    try:
        expenses = db.query(MonthlyExpense).filter(MonthlyExpense.user_id == current_user.id, MonthlyExpense.year == sync_data.year).all()
        if expenses:
            data = format_expenses_data(
                [{'date': str(e.date) if e.date else '', 'month': e.month, 'category_name': e.category.name if e.category else '',
                  'title': e.title, 'amount': e.amount, 'expense_type': e.expense_type, 'is_paid': e.is_paid, 'notes': e.notes}
                 for e in expenses], sync_data.year
            )
            result = service.sync_to_sheet(config.folder_id, 'Expenses', sync_data.year, data)
            results.append(f"Expenses: {result['rows_synced']} rows")
            db.add(SyncLog(user_id=current_user.id, feature='expenses', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
    except Exception as e:
        errors.append(f"Expenses: {str(e)}")

    # Sync Notes
    try:
        notes = db.query(Note).filter(Note.user_id == current_user.id, extract('year', Note.created_at) == sync_data.year).all()
        if notes:
            data = format_notes_data(
                [{'id': n.id, 'title': n.title, 'content': n.content, 'category': n.category,
                  'is_pinned': n.is_pinned, 'created_at': str(n.created_at), 'updated_at': str(n.updated_at)}
                 for n in notes]
            )
            result = service.sync_to_sheet(config.folder_id, 'Notes', sync_data.year, data)
            results.append(f"Notes: {result['rows_synced']} rows")
            db.add(SyncLog(user_id=current_user.id, feature='notes', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
    except Exception as e:
        errors.append(f"Notes: {str(e)}")

    # Sync Tasks
    try:
        tasks = db.query(QuickTask).filter(QuickTask.user_id == current_user.id, extract('year', QuickTask.created_at) == sync_data.year).all()
        if tasks:
            data = format_tasks_data(
                [{'id': t.id, 'title': t.title, 'category': t.category, 'priority': t.priority,
                  'due_date': str(t.due_date) if t.due_date else '', 'is_completed': t.is_completed,
                  'notes': t.notes, 'created_at': str(t.created_at)}
                 for t in tasks]
            )
            result = service.sync_to_sheet(config.folder_id, 'Tasks', sync_data.year, data)
            results.append(f"Tasks: {result['rows_synced']} rows")
            db.add(SyncLog(user_id=current_user.id, feature='tasks', year=sync_data.year, status='success', rows_synced=result['rows_synced']))
    except Exception as e:
        errors.append(f"Tasks: {str(e)}")

    update_tokens_if_refreshed(config, service, db)
    db.commit()

    if errors and not results:
        raise HTTPException(status_code=500, detail=f"All syncs failed: {'; '.join(errors)}")

    return {"message": f"Sync completed for {sync_data.year}", "synced": results, "errors": errors if errors else None}
