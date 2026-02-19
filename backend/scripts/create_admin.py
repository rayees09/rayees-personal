#!/usr/bin/env python3
"""
CLI script to create admin accounts for Family Hub.

Usage:
    python scripts/create_admin.py --email admin@example.com --password yourpassword --name "Admin Name"

Or interactively:
    python scripts/create_admin.py
"""

import sys
import os
import argparse
import getpass

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.admin import Admin
from app.services.auth import get_password_hash
from app.config import settings


def create_admin(email: str, password: str, name: str, db_url: str = None):
    """Create a new admin account."""
    # Use provided DB URL or get from settings
    database_url = db_url or settings.DATABASE_URL

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check if admin already exists
        existing = db.query(Admin).filter(Admin.email == email).first()
        if existing:
            print(f"Error: Admin with email '{email}' already exists.")
            return False

        # Create new admin
        admin = Admin(
            email=email,
            password_hash=get_password_hash(password),
            name=name,
            is_active=True
        )
        db.add(admin)
        db.commit()

        print(f"✓ Admin '{name}' ({email}) created successfully!")
        return True

    except Exception as e:
        db.rollback()
        print(f"Error creating admin: {e}")
        return False
    finally:
        db.close()


def list_admins(db_url: str = None):
    """List all admin accounts."""
    database_url = db_url or settings.DATABASE_URL

    engine = create_engine(database_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        admins = db.query(Admin).all()
        if not admins:
            print("No admin accounts found.")
            return

        print("\n=== Admin Accounts ===")
        for admin in admins:
            status = "Active" if admin.is_active else "Inactive"
            last_login = admin.last_login.strftime("%Y-%m-%d %H:%M") if admin.last_login else "Never"
            print(f"  • {admin.name} ({admin.email}) - {status} - Last login: {last_login}")
        print()

    finally:
        db.close()


def main():
    parser = argparse.ArgumentParser(description="Manage Family Hub admin accounts")
    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Create command
    create_parser = subparsers.add_parser("create", help="Create a new admin")
    create_parser.add_argument("--email", "-e", help="Admin email address")
    create_parser.add_argument("--password", "-p", help="Admin password (will prompt if not provided)")
    create_parser.add_argument("--name", "-n", help="Admin display name")

    # List command
    subparsers.add_parser("list", help="List all admins")

    args = parser.parse_args()

    if args.command == "list":
        list_admins()
        return

    if args.command == "create" or args.command is None:
        # Interactive mode if no args provided
        email = args.email if hasattr(args, 'email') and args.email else input("Email: ").strip()
        name = args.name if hasattr(args, 'name') and args.name else input("Name: ").strip()

        if hasattr(args, 'password') and args.password:
            password = args.password
        else:
            password = getpass.getpass("Password: ")
            confirm = getpass.getpass("Confirm Password: ")
            if password != confirm:
                print("Error: Passwords do not match.")
                sys.exit(1)

        if not email or not name or not password:
            print("Error: Email, name, and password are required.")
            sys.exit(1)

        success = create_admin(email, password, name)
        sys.exit(0 if success else 1)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
