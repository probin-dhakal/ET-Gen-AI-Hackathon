"""
Database Initialization Script for News Navigator.
Creates the database file and schema at /db/news_navigator.db.
"""

import os
import sys
from pathlib import Path
from database import DatabaseManager


def setup_database(db_path: str = "db/news_navigator.db"):
    """
    Initialize the database at the specified path.
    Creates directory if it doesn't exist.
    
    Args:
        db_path: Full path to database file
    """
    
    try:
        # Create directory if needed
        db_dir = os.path.dirname(db_path)
        if db_dir and not os.path.exists(db_dir):
            os.makedirs(db_dir, exist_ok=True)
            print(f" Created directory: {db_dir}")
        
        # Initialize database with schema
        print(f"\n Initializing database at: {db_path}")
        db = DatabaseManager(db_path=db_path)
        
        print(" Database initialized successfully!")
        print(f"\n Schema created:")
        print("   - articles (article content)")
        print("   - keywords (unique story arcs)")
        print("   - article_keywords (many-to-many relationships)")
        print("   - embeddings (FAISS index mappings)")
        
        print(f"\n✨ Database ready at: {db_path}\n")
        return True
        
    except PermissionError:
        print(f" Permission denied: Cannot create directory {db_dir}")
        print(f"   Try running with sudo or use a different path")
        return False
    except Exception as e:
        print(f" Error initializing database: {e}")
        return False


if __name__ == "__main__":
    # Get database path from environment or use default
    db_path = os.getenv("DATABASE_PATH", "db/news_navigator.db")
    
    print("=" * 70)
    print(" NEWS NAVIGATOR DATABASE SETUP")
    print("=" * 70)
    
    success = setup_database(db_path)
    
    if not success:
        sys.exit(1)
