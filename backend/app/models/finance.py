from sqlalchemy import Column, Integer, String, Text, Date, DateTime, Float, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class ExpenseCategory(Base):
    __tablename__ = "expense_categories"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Added for user-specific categories
    name = Column(String(100), nullable=False)
    icon = Column(String(50), nullable=True)
    color = Column(String(20), nullable=True)
    budget = Column(Float, nullable=True)  # Monthly budget for this category
    expense_type = Column(String(20), default="personal")  # personal, company
    default_amount = Column(Integer, nullable=True)  # Default monthly amount
    is_recurring = Column(Boolean, default=True)  # Recurring monthly expense
    is_active = Column(Boolean, default=True)

    expenses = relationship("Expense", back_populates="category")


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    amount = Column(Float, nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    description = Column(String(500), nullable=True)
    date = Column(Date, nullable=False)
    paid_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    receipt_url = Column(String(500), nullable=True)
    is_recurring = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    category = relationship("ExpenseCategory", back_populates="expenses")


class Stock(Base):
    __tablename__ = "stocks"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String(20), nullable=False)
    name = Column(String(255), nullable=True)
    quantity = Column(Float, nullable=False)
    buy_price = Column(Float, nullable=False)
    buy_date = Column(Date, nullable=False)
    current_price = Column(Float, nullable=True)
    last_updated = Column(DateTime(timezone=True), nullable=True)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Bill(Base):
    __tablename__ = "bills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    amount = Column(Float, nullable=False)
    category = Column(String(100), nullable=True)  # Utility, Insurance, Subscription, etc.
    due_date = Column(Date, nullable=False)
    is_recurring = Column(Boolean, default=False)
    recurrence_pattern = Column(String(50), nullable=True)  # monthly, quarterly, yearly
    is_paid = Column(Boolean, default=False)
    paid_date = Column(Date, nullable=True)
    auto_pay = Column(Boolean, default=False)
    notes = Column(String(255), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class MonthlyExpense(Base):
    """Monthly expense records for personal and company tracking"""
    __tablename__ = "monthly_expenses"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("expense_categories.id"), nullable=True)
    year = Column(Integer, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    expense_type = Column(String(20), default="personal")  # personal, company
    title = Column(String(255), nullable=False)
    amount = Column(Integer, nullable=False)
    date = Column(Date, nullable=True)  # Specific date if applicable
    notes = Column(String(500), nullable=True)
    is_paid = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    category = relationship("ExpenseCategory")
