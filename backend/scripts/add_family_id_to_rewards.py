#!/usr/bin/env python3
"""
Migration script to add family_id column to rewards table.
Run: python scripts/add_family_id_to_rewards.py
"""
import os
import sys

# Add the parent directory to the path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text
from app.database import SessionLocal, engine


def migrate():
    """Add family_id column to rewards table."""
    db = SessionLocal()

    try:
        # Check if column already exists
        result = db.execute(text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = 'rewards' AND column_name = 'family_id'
        """))
        if result.fetchone():
            print("Column 'family_id' already exists in 'rewards' table.")
            return

        # Add family_id column
        print("Adding family_id column to rewards table...")
        db.execute(text("""
            ALTER TABLE rewards
            ADD COLUMN family_id INTEGER REFERENCES families(id)
        """))

        # Update existing rewards to belong to the default family (id=1)
        print("Updating existing rewards to default family (id=1)...")
        db.execute(text("""
            UPDATE rewards SET family_id = 1 WHERE family_id IS NULL
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
