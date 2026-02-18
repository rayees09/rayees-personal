from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from enum import Enum


class PrayerName(str, Enum):
    FAJR = "fajr"
    DHUHR = "dhuhr"
    ASR = "asr"
    MAGHRIB = "maghrib"
    ISHA = "isha"
    TARAWEEH = "taraweeh"


class PrayerStatus(str, Enum):
    NOT_PRAYED = "not_prayed"
    PRAYED_ON_TIME = "prayed_on_time"
    PRAYED_LATE = "prayed_late"
    PRAYED_QADA = "prayed_qada"


class PrayerCreate(BaseModel):
    user_id: int
    prayer_name: PrayerName
    date: date
    status: PrayerStatus = PrayerStatus.NOT_PRAYED
    time_prayed: Optional[time] = None
    in_masjid: bool = False


class PrayerUpdate(BaseModel):
    status: Optional[PrayerStatus] = None
    time_prayed: Optional[time] = None
    in_masjid: Optional[bool] = None


class PrayerResponse(BaseModel):
    id: int
    user_id: int
    prayer_name: PrayerName
    date: date
    status: PrayerStatus
    time_prayed: Optional[time]
    in_masjid: bool

    class Config:
        from_attributes = True


class DailyPrayersResponse(BaseModel):
    date: date
    user_id: int
    prayers: List[PrayerResponse]
    completed_count: int
    total_count: int


class SurahStatus(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MEMORIZED = "memorized"
    NEEDS_REVISION = "needs_revision"


class QuranProgressCreate(BaseModel):
    user_id: int
    surah_number: int
    surah_name: str
    total_verses: int
    verses_memorized: int = 0
    status: SurahStatus = SurahStatus.NOT_STARTED


class QuranProgressUpdate(BaseModel):
    verses_memorized: Optional[int] = None
    status: Optional[SurahStatus] = None
    last_revision_date: Optional[date] = None


class QuranProgressResponse(BaseModel):
    id: int
    user_id: int
    surah_number: int
    surah_name: str
    total_verses: int
    verses_memorized: int
    status: SurahStatus
    progress_percentage: float = 0.0
    last_revision_date: Optional[date]

    class Config:
        from_attributes = True


class RamadanDayCreate(BaseModel):
    user_id: int
    date: date
    hijri_day: Optional[int] = None
    fasted: bool = False
    suhoor: bool = False
    iftar: bool = False
    taraweeh: bool = False
    taraweeh_rakaat: int = 0
    quran_pages: int = 0
    charity_given: bool = False
    notes: Optional[str] = None


class RamadanDayUpdate(BaseModel):
    fasted: Optional[bool] = None
    suhoor: Optional[bool] = None
    iftar: Optional[bool] = None
    taraweeh: Optional[bool] = None
    taraweeh_rakaat: Optional[int] = None
    quran_pages: Optional[int] = None
    charity_given: Optional[bool] = None
    notes: Optional[str] = None


class RamadanDayResponse(BaseModel):
    id: int
    user_id: int
    date: date
    hijri_day: Optional[int]
    fasted: bool
    suhoor: bool
    iftar: bool
    taraweeh: bool
    taraweeh_rakaat: int
    quran_pages: int
    charity_given: bool
    notes: Optional[str]

    class Config:
        from_attributes = True


class RamadanSummaryResponse(BaseModel):
    user_id: int
    total_days: int
    fasted_days: int
    taraweeh_days: int
    total_quran_pages: int
    charity_days: int


# ============== RAMADAN GOALS ==============

class RamadanGoalCreate(BaseModel):
    year: int
    title: str
    description: Optional[str] = None
    target_value: int = 1
    unit: str = "times"  # times, pages, minutes, amount
    goal_type: str = "daily"  # daily, total


class RamadanGoalResponse(BaseModel):
    id: int
    user_id: int
    year: int
    title: str
    description: Optional[str]
    target_value: int
    unit: str
    goal_type: str
    is_active: bool
    total_completed: int = 0
    days_logged: int = 0

    class Config:
        from_attributes = True


class RamadanGoalLogCreate(BaseModel):
    goal_id: int
    date: date
    value: int = 0
    notes: Optional[str] = None


class RamadanGoalLogResponse(BaseModel):
    id: int
    goal_id: int
    user_id: int
    date: date
    value: int
    notes: Optional[str]

    class Config:
        from_attributes = True


# ============== ZAKAT ==============

class ZakatConfigCreate(BaseModel):
    year: int
    total_due: int
    currency: str = "USD"
    notes: Optional[str] = None


class ZakatConfigResponse(BaseModel):
    id: int
    user_id: int
    year: int
    total_due: int
    currency: str
    notes: Optional[str]
    total_paid: int = 0
    remaining: int = 0

    class Config:
        from_attributes = True


class ZakatPaymentCreate(BaseModel):
    config_id: int
    date: date
    amount: int
    recipient: Optional[str] = None
    notes: Optional[str] = None


class ZakatPaymentResponse(BaseModel):
    id: int
    config_id: int
    user_id: int
    date: date
    amount: int
    recipient: Optional[str]
    notes: Optional[str]

    class Config:
        from_attributes = True


# ============== EXPENSES ==============

class ExpenseCategoryCreate(BaseModel):
    name: str
    expense_type: str = "personal"  # personal, company
    default_amount: Optional[int] = None
    is_recurring: bool = True


class ExpenseCategoryResponse(BaseModel):
    id: int
    user_id: int
    name: str
    expense_type: str
    default_amount: Optional[int]
    is_recurring: bool
    is_active: bool

    class Config:
        from_attributes = True


class MonthlyExpenseCreate(BaseModel):
    category_id: Optional[int] = None
    year: int
    month: int
    expense_type: str = "personal"
    title: str
    amount: int
    date: Optional[date] = None
    notes: Optional[str] = None
    is_paid: bool = False


class MonthlyExpenseResponse(BaseModel):
    id: int
    user_id: int
    category_id: Optional[int]
    year: int
    month: int
    expense_type: str
    title: str
    amount: int
    date: Optional[date]
    notes: Optional[str]
    is_paid: bool
    category_name: Optional[str] = None

    class Config:
        from_attributes = True


class MonthlyExpenseSummary(BaseModel):
    year: int
    month: int
    expense_type: str
    total_amount: int
    paid_amount: int
    pending_amount: int
    items_count: int
