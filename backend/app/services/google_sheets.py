import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

# Scopes required for Google Sheets and Drive API
SCOPES = [
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/userinfo.email'
]


class GoogleDriveOAuthService:
    """Service for Google Drive operations using OAuth user credentials."""

    def __init__(self, access_token: str, refresh_token: str, client_id: str, client_secret: str):
        """Initialize with OAuth tokens."""
        self.credentials = Credentials(
            token=access_token,
            refresh_token=refresh_token,
            token_uri='https://oauth2.googleapis.com/token',
            client_id=client_id,
            client_secret=client_secret,
            scopes=SCOPES
        )
        self._refresh_if_needed()
        self.drive_service = build('drive', 'v3', credentials=self.credentials)
        self.sheets_service = build('sheets', 'v4', credentials=self.credentials)

    def _refresh_if_needed(self):
        """Refresh access token if expired."""
        if self.credentials.expired and self.credentials.refresh_token:
            self.credentials.refresh(Request())

    def get_updated_tokens(self) -> Dict[str, Any]:
        """Return current tokens (may have been refreshed)."""
        return {
            'access_token': self.credentials.token,
            'refresh_token': self.credentials.refresh_token,
            'expiry': self.credentials.expiry.isoformat() if self.credentials.expiry else None
        }

    def list_folders(self) -> List[Dict[str, str]]:
        """List only root-level folders in user's Drive (directly in My Drive)."""
        try:
            results = self.drive_service.files().list(
                q="mimeType='application/vnd.google-apps.folder' and 'root' in parents and trashed=false",
                fields='files(id, name)',
                orderBy='name',
                pageSize=100
            ).execute()
            return results.get('files', [])
        except HttpError as e:
            raise Exception(f"Failed to list folders: {str(e)}")

    def verify_folder_access(self, folder_id: str) -> Dict[str, Any]:
        """Verify access to a folder and return folder info."""
        try:
            folder = self.drive_service.files().get(
                fileId=folder_id, fields='id,name,mimeType'
            ).execute()

            if folder.get('mimeType') != 'application/vnd.google-apps.folder':
                raise Exception("The ID provided is not a folder")

            return {'id': folder_id, 'name': folder.get('name')}
        except HttpError as e:
            raise Exception(f"Cannot access folder: {str(e)}")

    def get_or_create_spreadsheet(self, folder_id: str, name: str) -> str:
        """Get existing spreadsheet or create new one in folder. Returns spreadsheet ID."""
        try:
            # Search for existing spreadsheet with this name in folder
            query = f"'{folder_id}' in parents and name='{name}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false"
            results = self.drive_service.files().list(q=query, fields='files(id, name)').execute()
            files = results.get('files', [])

            if files:
                return files[0]['id']

            # Create new spreadsheet in folder (user has storage quota)
            file_metadata = {
                'name': name,
                'mimeType': 'application/vnd.google-apps.spreadsheet',
                'parents': [folder_id]
            }
            file = self.drive_service.files().create(body=file_metadata, fields='id').execute()
            return file['id']

        except HttpError as e:
            raise Exception(f"Failed to access spreadsheet: {str(e)}")

    def sync_to_sheet(self, folder_id: str, feature: str, year: int, data: List[List[Any]]) -> Dict[str, Any]:
        """Sync data to feature/year specific spreadsheet in folder."""
        sheet_name = f"{feature}_{year}"
        spreadsheet_id = self.get_or_create_spreadsheet(folder_id, sheet_name)

        try:
            # Clear existing data
            self.sheets_service.spreadsheets().values().clear(
                spreadsheetId=spreadsheet_id, range='A:Z'
            ).execute()

            # Write new data
            if data:
                self.sheets_service.spreadsheets().values().update(
                    spreadsheetId=spreadsheet_id,
                    range='A1',
                    valueInputOption='USER_ENTERED',
                    body={'values': data}
                ).execute()

                # Format header row
                self._format_header(spreadsheet_id)

            return {
                'spreadsheet_id': spreadsheet_id,
                'sheet_name': sheet_name,
                'rows_synced': len(data) - 1 if data else 0
            }

        except HttpError as e:
            raise Exception(f"Failed to sync data: {str(e)}")

    def _format_header(self, spreadsheet_id: str):
        """Format header row with styling."""
        try:
            spreadsheet = self.sheets_service.spreadsheets().get(
                spreadsheetId=spreadsheet_id, fields='sheets.properties.sheetId'
            ).execute()
            sheet_id = spreadsheet['sheets'][0]['properties']['sheetId']

            request = {
                'requests': [{
                    'repeatCell': {
                        'range': {'sheetId': sheet_id, 'startRowIndex': 0, 'endRowIndex': 1},
                        'cell': {
                            'userEnteredFormat': {
                                'backgroundColor': {'red': 0.2, 'green': 0.5, 'blue': 0.3},
                                'textFormat': {'bold': True, 'foregroundColor': {'red': 1, 'green': 1, 'blue': 1}}
                            }
                        },
                        'fields': 'userEnteredFormat(backgroundColor,textFormat)'
                    }
                }, {
                    'updateSheetProperties': {
                        'properties': {'sheetId': sheet_id, 'gridProperties': {'frozenRowCount': 1}},
                        'fields': 'gridProperties.frozenRowCount'
                    }
                }]
            }
            self.sheets_service.spreadsheets().batchUpdate(
                spreadsheetId=spreadsheet_id, body=request
            ).execute()
        except HttpError:
            pass  # Non-critical formatting


def format_zakat_data(zakat_config: Dict, payments: List[Dict]) -> List[List[Any]]:
    """Format Zakat data for Google Sheets."""
    headers = ['Date', 'Type', 'Amount', 'Currency', 'Recipient', 'Notes', 'Total Due', 'Remaining']

    rows = [headers]
    total_due = zakat_config.get('total_due', 0)
    currency = zakat_config.get('currency', 'USD')

    running_remaining = total_due
    for payment in sorted(payments, key=lambda x: x.get('date', '')):
        amount = payment.get('amount', 0)
        running_remaining -= amount
        rows.append([
            payment.get('date', ''),
            'Payment',
            amount,
            currency,
            payment.get('recipient', ''),
            payment.get('notes', ''),
            total_due,
            running_remaining
        ])

    if len(rows) == 1:
        rows.append(['', 'No payments yet', '', currency, '', '', total_due, total_due])

    return rows


def format_expenses_data(expenses: List[Dict], year: int) -> List[List[Any]]:
    """Format Expenses data for Google Sheets (yearly)."""
    headers = ['Date', 'Month', 'Category', 'Title', 'Amount', 'Type', 'Is Paid', 'Notes']

    rows = [headers]
    month_names = ['', 'January', 'February', 'March', 'April', 'May', 'June',
                   'July', 'August', 'September', 'October', 'November', 'December']

    for expense in sorted(expenses, key=lambda x: (x.get('month', 0), x.get('date', ''))):
        month = expense.get('month', 0)
        rows.append([
            expense.get('date', ''),
            month_names[month] if 1 <= month <= 12 else str(month),
            expense.get('category_name', expense.get('category', '')),
            expense.get('title', ''),
            expense.get('amount', 0),
            expense.get('expense_type', 'personal'),
            'Yes' if expense.get('is_paid') else 'No',
            expense.get('notes', '')
        ])

    return rows


def format_notes_data(notes: List[Dict]) -> List[List[Any]]:
    """Format Notes data for Google Sheets."""
    headers = ['ID', 'Title', 'Content', 'Category', 'Is Pinned', 'Created At', 'Updated At']

    rows = [headers]
    for note in sorted(notes, key=lambda x: x.get('updated_at', ''), reverse=True):
        rows.append([
            note.get('id', ''),
            note.get('title', ''),
            note.get('content', '')[:5000] if note.get('content') else '',
            note.get('category', 'personal'),
            'Yes' if note.get('is_pinned') else 'No',
            note.get('created_at', ''),
            note.get('updated_at', '')
        ])

    return rows


def format_tasks_data(tasks: List[Dict]) -> List[List[Any]]:
    """Format Tasks data for Google Sheets."""
    headers = ['ID', 'Title', 'Category', 'Priority', 'Due Date', 'Completed', 'Notes', 'Created At']

    rows = [headers]
    for task in sorted(tasks, key=lambda x: x.get('created_at', ''), reverse=True):
        rows.append([
            task.get('id', ''),
            task.get('title', ''),
            task.get('category', 'personal'),
            task.get('priority', 'medium'),
            task.get('due_date', ''),
            'Yes' if task.get('is_completed') else 'No',
            task.get('notes', '')[:2000] if task.get('notes') else '',
            task.get('created_at', '')
        ])

    return rows
