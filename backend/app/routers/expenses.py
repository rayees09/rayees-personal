from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import date

from app.database import get_db
from app.models.user import User
from app.models.finance import ExpenseCategory, MonthlyExpense
from app.schemas.islamic import (
    ExpenseCategoryCreate, ExpenseCategoryResponse,
    MonthlyExpenseCreate, MonthlyExpenseResponse, MonthlyExpenseSummary
)
from app.services.auth import get_current_user

router = APIRouter(prefix="/api/expenses", tags=["Expenses"])


# ============== EXPENSE CATEGORIES ==============

@router.post("/categories", response_model=ExpenseCategoryResponse)
async def create_category(
    category_data: ExpenseCategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create an expense category."""
    category = ExpenseCategory(
        user_id=current_user.id,
        name=category_data.name,
        expense_type=category_data.expense_type,
        default_amount=category_data.default_amount,
        is_recurring=category_data.is_recurring
    )
    db.add(category)
    db.commit()
    db.refresh(category)
    return category


@router.get("/categories")
async def get_categories(
    expense_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all expense categories."""
    query = db.query(ExpenseCategory).filter(
        ExpenseCategory.user_id == current_user.id,
        ExpenseCategory.is_active == True
    )

    if expense_type:
        query = query.filter(ExpenseCategory.expense_type == expense_type)

    categories = query.order_by(ExpenseCategory.name).all()
    return categories


@router.put("/categories/{category_id}")
async def update_category(
    category_id: int,
    name: Optional[str] = None,
    default_amount: Optional[int] = None,
    is_recurring: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an expense category."""
    category = db.query(ExpenseCategory).filter(
        ExpenseCategory.id == category_id,
        ExpenseCategory.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    if name is not None:
        category.name = name
    if default_amount is not None:
        category.default_amount = default_amount
    if is_recurring is not None:
        category.is_recurring = is_recurring

    db.commit()
    db.refresh(category)
    return category


@router.delete("/categories/{category_id}")
async def delete_category(
    category_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an expense category (soft delete)."""
    category = db.query(ExpenseCategory).filter(
        ExpenseCategory.id == category_id,
        ExpenseCategory.user_id == current_user.id
    ).first()

    if not category:
        raise HTTPException(status_code=404, detail="Category not found")

    category.is_active = False
    db.commit()
    return {"message": "Category deleted"}


# ============== MONTHLY EXPENSES ==============

@router.post("/", response_model=MonthlyExpenseResponse)
async def create_expense(
    expense_data: MonthlyExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a monthly expense."""
    expense = MonthlyExpense(
        user_id=current_user.id,
        category_id=expense_data.category_id,
        year=expense_data.year,
        month=expense_data.month,
        expense_type=expense_data.expense_type,
        title=expense_data.title,
        amount=expense_data.amount,
        date=expense_data.date,
        notes=expense_data.notes,
        is_paid=expense_data.is_paid
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)
    return _build_expense_response(expense, db)


@router.get("/")
async def get_expenses(
    year: int,
    month: int,
    expense_type: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expenses for a specific month."""
    query = db.query(MonthlyExpense).filter(
        MonthlyExpense.user_id == current_user.id,
        MonthlyExpense.year == year,
        MonthlyExpense.month == month
    )

    if expense_type:
        query = query.filter(MonthlyExpense.expense_type == expense_type)

    expenses = query.order_by(MonthlyExpense.created_at.desc()).all()
    return [_build_expense_response(e, db) for e in expenses]


@router.get("/summary")
async def get_expense_summary(
    year: int,
    month: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get expense summary for a month."""
    expenses = db.query(MonthlyExpense).filter(
        MonthlyExpense.user_id == current_user.id,
        MonthlyExpense.year == year,
        MonthlyExpense.month == month
    ).all()

    personal = [e for e in expenses if e.expense_type == "personal"]
    company = [e for e in expenses if e.expense_type == "company"]

    return {
        "year": year,
        "month": month,
        "personal": {
            "total_amount": sum(e.amount for e in personal),
            "paid_amount": sum(e.amount for e in personal if e.is_paid),
            "pending_amount": sum(e.amount for e in personal if not e.is_paid),
            "items_count": len(personal)
        },
        "company": {
            "total_amount": sum(e.amount for e in company),
            "paid_amount": sum(e.amount for e in company if e.is_paid),
            "pending_amount": sum(e.amount for e in company if not e.is_paid),
            "items_count": len(company)
        }
    }


@router.put("/{expense_id}")
async def update_expense(
    expense_id: int,
    title: Optional[str] = None,
    amount: Optional[int] = None,
    is_paid: Optional[bool] = None,
    notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update an expense."""
    expense = db.query(MonthlyExpense).filter(
        MonthlyExpense.id == expense_id,
        MonthlyExpense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    if title is not None:
        expense.title = title
    if amount is not None:
        expense.amount = amount
    if is_paid is not None:
        expense.is_paid = is_paid
    if notes is not None:
        expense.notes = notes

    db.commit()
    db.refresh(expense)
    return _build_expense_response(expense, db)


@router.put("/{expense_id}/toggle-paid")
async def toggle_expense_paid(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle paid status of an expense."""
    expense = db.query(MonthlyExpense).filter(
        MonthlyExpense.id == expense_id,
        MonthlyExpense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    expense.is_paid = not expense.is_paid
    db.commit()
    db.refresh(expense)
    return _build_expense_response(expense, db)


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete an expense."""
    expense = db.query(MonthlyExpense).filter(
        MonthlyExpense.id == expense_id,
        MonthlyExpense.user_id == current_user.id
    ).first()

    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")

    db.delete(expense)
    db.commit()
    return {"message": "Expense deleted"}


@router.post("/init-month")
async def init_month_expenses(
    year: int,
    month: int,
    expense_type: str = "personal",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Initialize monthly expenses from recurring categories."""
    # Get recurring categories
    categories = db.query(ExpenseCategory).filter(
        ExpenseCategory.user_id == current_user.id,
        ExpenseCategory.expense_type == expense_type,
        ExpenseCategory.is_recurring == True,
        ExpenseCategory.is_active == True
    ).all()

    created = []
    for cat in categories:
        # Check if already exists
        existing = db.query(MonthlyExpense).filter(
            MonthlyExpense.user_id == current_user.id,
            MonthlyExpense.category_id == cat.id,
            MonthlyExpense.year == year,
            MonthlyExpense.month == month
        ).first()

        if not existing:
            expense = MonthlyExpense(
                user_id=current_user.id,
                category_id=cat.id,
                year=year,
                month=month,
                expense_type=expense_type,
                title=cat.name,
                amount=cat.default_amount or 0,
                is_paid=False
            )
            db.add(expense)
            created.append(cat.name)

    db.commit()
    return {"message": f"Created {len(created)} expenses", "created": created}


def _build_expense_response(expense: MonthlyExpense, db: Session) -> dict:
    """Build expense response with category name."""
    category_name = None
    if expense.category_id:
        category = db.query(ExpenseCategory).filter(
            ExpenseCategory.id == expense.category_id
        ).first()
        if category:
            category_name = category.name

    return {
        "id": expense.id,
        "user_id": expense.user_id,
        "category_id": expense.category_id,
        "year": expense.year,
        "month": expense.month,
        "expense_type": expense.expense_type,
        "title": expense.title,
        "amount": expense.amount,
        "date": expense.date.isoformat() if expense.date else None,
        "notes": expense.notes,
        "is_paid": expense.is_paid,
        "category_name": category_name
    }
