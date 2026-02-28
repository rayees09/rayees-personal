from sqlalchemy import Column, Integer, String, Date, DateTime, Boolean, ForeignKey, Enum, Time
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class PrayerName(str, enum.Enum):
    FAJR = "fajr"
    DHUHR = "dhuhr"
    ASR = "asr"
    MAGHRIB = "maghrib"
    ISHA = "isha"
    TARAWEEH = "taraweeh"


class PrayerStatus(str, enum.Enum):
    NOT_PRAYED = "not_prayed"
    PRAYED_ON_TIME = "prayed_on_time"
    PRAYED_LATE = "prayed_late"
    PRAYED_QADA = "prayed_qada"


class Prayer(Base):
    __tablename__ = "prayers"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    prayer_name = Column(Enum(PrayerName), nullable=False)
    date = Column(Date, nullable=False)
    status = Column(Enum(PrayerStatus), default=PrayerStatus.NOT_PRAYED)
    time_prayed = Column(Time, nullable=True)
    in_masjid = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="prayers")


class SurahStatus(str, enum.Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    MEMORIZED = "memorized"
    NEEDS_REVISION = "needs_revision"


# Quran Surah data
QURAN_SURAHS = [
    (1, "Al-Fatihah", 7), (2, "Al-Baqarah", 286), (3, "Ali 'Imran", 200),
    (4, "An-Nisa", 176), (5, "Al-Ma'idah", 120), (6, "Al-An'am", 165),
    (7, "Al-A'raf", 206), (8, "Al-Anfal", 75), (9, "At-Tawbah", 129),
    (10, "Yunus", 109), (11, "Hud", 123), (12, "Yusuf", 111),
    # ... more surahs - focusing on commonly memorized ones
    (36, "Ya-Sin", 83), (55, "Ar-Rahman", 78), (56, "Al-Waqi'ah", 96),
    (67, "Al-Mulk", 30), (78, "An-Naba", 40), (87, "Al-A'la", 19),
    (93, "Ad-Duhaa", 11), (94, "Ash-Sharh", 8), (95, "At-Tin", 8),
    (96, "Al-'Alaq", 19), (97, "Al-Qadr", 5), (98, "Al-Bayyinah", 8),
    (99, "Az-Zalzalah", 8), (100, "Al-'Adiyat", 11), (101, "Al-Qari'ah", 11),
    (102, "At-Takathur", 8), (103, "Al-'Asr", 3), (104, "Al-Humazah", 9),
    (105, "Al-Fil", 5), (106, "Quraysh", 4), (107, "Al-Ma'un", 7),
    (108, "Al-Kawthar", 3), (109, "Al-Kafirun", 6), (110, "An-Nasr", 3),
    (111, "Al-Masad", 5), (112, "Al-Ikhlas", 4), (113, "Al-Falaq", 5),
    (114, "An-Nas", 6)
]


class QuranProgress(Base):
    __tablename__ = "quran_progress"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    surah_number = Column(Integer, nullable=False)
    surah_name = Column(String(100), nullable=False)
    total_verses = Column(Integer, nullable=False)
    verses_memorized = Column(Integer, default=0)
    status = Column(Enum(SurahStatus), default=SurahStatus.NOT_STARTED)
    last_revision_date = Column(Date, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="quran_progress")


class RamadanDay(Base):
    __tablename__ = "ramadan_days"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    hijri_day = Column(Integer, nullable=True)  # Day of Ramadan (1-30)
    fasted = Column(Boolean, default=False)
    # New fields for missed fasting tracking
    fasting_status = Column(String(20), default="not_tracked")  # fasted, missed, exempt, not_tracked
    missed_reason = Column(String(50), nullable=True)  # illness, travel, menstruation, other
    suhoor = Column(Boolean, default=False)
    iftar = Column(Boolean, default=False)
    taraweeh = Column(Boolean, default=False)
    taraweeh_rakaat = Column(Integer, default=0)
    quran_pages = Column(Integer, default=0)
    charity_given = Column(Boolean, default=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="ramadan_days")


class QadhaDay(Base):
    """Track missed fasts and their compensation (Qadha)"""
    __tablename__ = "qadha_days"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ramadan_year = Column(Integer, nullable=False)  # Which Ramadan year was missed
    original_date = Column(Date, nullable=True)  # Original missed date (optional)
    missed_reason = Column(String(50), nullable=True)  # illness, travel, menstruation, other
    compensated_date = Column(Date, nullable=True)  # When qadha was performed
    is_compensated = Column(Boolean, default=False)
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")


# Quran has 604 pages total (standard Madina Mushaf)
QURAN_TOTAL_PAGES = 604


class QuranReadingGoal(Base):
    """Track Quran completion goals (e.g., complete in 25 days during Ramadan)"""
    __tablename__ = "quran_reading_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255), default="Complete Quran")
    total_pages = Column(Integer, default=604)  # Standard Quran pages
    target_days = Column(Integer, default=30)  # Complete in X days
    pages_per_day = Column(Integer, default=20)  # Calculated target
    start_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    current_page = Column(Integer, default=0)
    is_completed = Column(Boolean, default=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    reading_logs = relationship("QuranReadingLog", back_populates="goal")


class QuranReadingLog(Base):
    """Daily Quran reading log with optional page image"""
    __tablename__ = "quran_reading_logs"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("quran_reading_goals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    pages_read = Column(Integer, default=0)
    start_page = Column(Integer, nullable=True)
    end_page = Column(Integer, nullable=True)
    surah_name = Column(String(100), nullable=True)  # Which surah reading
    image_url = Column(String(500), nullable=True)  # Uploaded page image
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    goal = relationship("QuranReadingGoal", back_populates="reading_logs")
    user = relationship("User")


class RamadanGoal(Base):
    """Custom Ramadan goals (e.g., 'Read 20 pages daily', 'Give charity daily')"""
    __tablename__ = "ramadan_goals"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)  # Ramadan year (e.g., 2026)
    title = Column(String(255), nullable=False)  # Goal name
    description = Column(String(500), nullable=True)
    target_value = Column(Integer, default=1)  # Target per day or total
    unit = Column(String(50), default="times")  # times, pages, minutes, amount, etc.
    goal_type = Column(String(50), default="daily")  # daily, total
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    logs = relationship("RamadanGoalLog", back_populates="goal", cascade="all, delete-orphan")


class RamadanGoalLog(Base):
    """Daily log for Ramadan goals"""
    __tablename__ = "ramadan_goal_logs"

    id = Column(Integer, primary_key=True, index=True)
    goal_id = Column(Integer, ForeignKey("ramadan_goals.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    value = Column(Integer, default=0)  # How much completed
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    goal = relationship("RamadanGoal", back_populates="logs")
    user = relationship("User")


class ZakatConfig(Base):
    """Yearly Zakat configuration"""
    __tablename__ = "zakat_configs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    year = Column(Integer, nullable=False)  # Year (e.g., 2026)
    total_due = Column(Integer, nullable=False)  # Total Zakat due
    currency = Column(String(10), default="USD")  # USD, INR, etc.
    notes = Column(String(500), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    payments = relationship("ZakatPayment", back_populates="config", cascade="all, delete-orphan")


class ZakatPayment(Base):
    """Zakat payment records"""
    __tablename__ = "zakat_payments"

    id = Column(Integer, primary_key=True, index=True)
    config_id = Column(Integer, ForeignKey("zakat_configs.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Integer, nullable=False)
    recipient = Column(String(255), nullable=True)  # Who received
    notes = Column(String(500), nullable=True)
    is_recipient_private = Column(Boolean, default=False)  # Hide recipient from other family members
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    config = relationship("ZakatConfig", back_populates="payments")
    user = relationship("User")
