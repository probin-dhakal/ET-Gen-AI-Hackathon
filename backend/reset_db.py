#!/usr/bin/env python3
"""
Quick script to reset the database and remove all values.
Usage: python reset_db.py
"""

import os
import sys
from src.database import DatabaseManager

def reset_database():
    """Reset the database by deleting all data."""
    
    db_path = os.getenv("DATABASE_PATH", "db/news_navigator.db")
    
    print("=" * 70)
    print(" 🗑️  DATABASE RESET")
    print("=" * 70)
    print(f"\n Database: {db_path}")
    print("\n This will DELETE ALL DATA from the following tables:")
    print("   - articles")
    print("   - keywords")
    print("   - article_keywords")
    print("   - keyword_summaries")
    print("   - embeddings")
    print("   - articles_full")
    print("   - article_translations")
    
    confirm = input("\n ⚠️  Are you sure? Type 'yes' to proceed: ").strip().lower()
    
    if confirm != "yes":
        print("\n ❌ Reset cancelled.")
        sys.exit(0)
    
    try:
        db = DatabaseManager(db_path=db_path)
        db.reset_database()
        print("\n" + "=" * 70)
        print(" ✅ SUCCESS! Database has been reset.")
        print("=" * 70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error resetting database: {e}")
        sys.exit(1)

if __name__ == "__main__":
    reset_database()
