#!/usr/bin/env python3
"""
Migration script to add family_id column to family_reminders table.
Run: python scripts/add_family_id_to_reminders.py
"""
import os
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal


def migrate():
    """Add family_id column to family_reminders table."""
    db = SessionLocal()

    try:
        # Check if column already exists
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'family_reminders' AND column_name = 'family_id'
        """))
        if result.fetchone():
            print("Column 'family_id' already exists in 'family_reminders' table.")
            return

        # Add family_id column
        print("Adding family_id column to family_reminders table...")
        db.execute(text("""
            ALTER TABLE family_reminders
            ADD COLUMN family_id INTEGER REFERENCES families(id)
        """))

        # Update existing reminders based on created_by user's family
        print("Updating existing reminders with family_id from creator...")
        db.execute(text("""
            UPDATE family_reminders r
            SET family_id = u.family_id
            FROM users u
            WHERE r.created_by = u.id AND r.family_id IS NULL
        """))

        # For any remaining without family_id, set to default family (id=1)
        db.execute(text("""
            UPDATE family_reminders SET family_id = 1 WHERE family_id IS NULL
        """))

        db.commit()
        print("Migration completed successfully!")

    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    migrate()
