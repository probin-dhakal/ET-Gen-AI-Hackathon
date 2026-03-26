"""
Hybrid Database Manager: SQLite for local development, Postgres for production.
Manages schema creation, insertions, and complex joins.
"""

import sqlite3
import os
from datetime import datetime
from typing import List, Optional, Tuple
from contextlib import contextmanager
from pathlib import Path

# Determine default database path
_default_db_path = os.getenv("DATABASE_PATH")
if not _default_db_path:
    # Try /db/ first, fallback to /tmp/ if not writable
    if os.access("db", os.W_OK) or not os.path.exists("db"):
        _default_db_path = "db/news_navigator.db"
    else:
        _default_db_path = "tmp/news_navigator.db"

DB_PATH = _default_db_path


class DatabaseManager:
    """
    Local SQLite database for News Navigator.
    Can be easily swapped for Postgres in production.
    """
    
    def __init__(self, db_path: str = DB_PATH):
        """Initialize database connection."""
        self.db_path = db_path
        
        # Ensure directory exists
        db_dir = os.path.dirname(self.db_path)
        if db_dir:
            Path(db_dir).mkdir(parents=True, exist_ok=True)
        
        self.init_schema()
    
    @contextmanager
    def get_connection(self):
        """Context manager for database connections."""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row  # Return rows as dicts
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()
    
    def init_schema(self):
        """Create all tables if they don't exist."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # 1. Unified Articles table (consolidated with full metadata)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    heading TEXT NOT NULL,
                    body TEXT,
                    nucleus_summary TEXT,
                    author TEXT,
                    source_url TEXT,
                    source_name VARCHAR(100),
                    category VARCHAR(50),
                    language VARCHAR(20) DEFAULT 'english',
                    word_count INTEGER,
                    image_url TEXT,
                    published_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    received_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 2. Article Keywords List table (keywords directly linked to articles)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS article_keywords_list (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_id INTEGER NOT NULL,
                    keyword_name VARCHAR(255) NOT NULL,
                    relevance_score REAL DEFAULT 1.0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(article_id, keyword_name),
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
                )
            """)
            
            # 3. Keywords table (unique story arcs - maintained for backward compatibility)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS keywords (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name VARCHAR(255) UNIQUE NOT NULL,
                    category VARCHAR(50),
                    article_count INTEGER DEFAULT 0,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            # 3. Article-Keywords join table (Many-to-Many)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS article_keywords (
                    article_id INTEGER NOT NULL,
                    keyword_id INTEGER NOT NULL,
                    relevance_score REAL DEFAULT 1.0,
                    PRIMARY KEY (article_id, keyword_id),
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
                    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE
                )
            """)
            
            # 3.5. Keyword Summaries table (array of nucleus summaries per keyword)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS keyword_summaries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    keyword_id INTEGER NOT NULL,
                    article_id INTEGER NOT NULL,
                    nucleus_summary TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (keyword_id) REFERENCES keywords(id) ON DELETE CASCADE,
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
                )
            """)
            
            # 4. Vector embeddings table (for FAISS mapping)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS embeddings (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_id INTEGER NOT NULL UNIQUE,
                    faiss_index INTEGER NOT NULL,
                    embedding_model VARCHAR(50),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
                )
            """)
            
            # 5. Article Translations table (cached translations)
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS article_translations (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    article_id INTEGER NOT NULL,
                    language VARCHAR(20) NOT NULL,
                    translated_heading TEXT NOT NULL,
                    translated_body TEXT,
                    local_context TEXT,
                    translation_notes TEXT,
                    translator_model VARCHAR(50),
                    translation_quality_score REAL,
                    translated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    UNIQUE(article_id, language),
                    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
                )
            """)
            
            # Create indices for faster queries
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_keywords_name 
                ON keywords(name)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_article_published 
                ON articles(published_at)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_articles_heading
                ON articles(heading)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_articles_published
                ON articles(published_at)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_article_translations_article
                ON article_translations(article_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_article_translations_language
                ON article_translations(language)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_article_keywords_keyword 
                ON article_keywords(keyword_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_keyword_summaries_keyword
                ON keyword_summaries(keyword_id)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_keyword_summaries_article
                ON keyword_summaries(article_id)
            """)
            
            conn.commit()
    
    def reset_database(self):
        """
        Delete all data from all tables while keeping the schema intact.
        Use this to reset the database without recreating it.
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Disable foreign keys temporarily to allow deletion
            cursor.execute("PRAGMA foreign_keys = OFF")
            
            # Delete data from all tables (order matters due to foreign keys)
            tables = [
                "article_keywords_list",
                "article_keywords",
                "keyword_summaries",
                "embeddings",
                "article_translations",
                "articles",
                "keywords"
            ]
            
            for table in tables:
                cursor.execute(f"DELETE FROM {table}")
            
            # Re-enable foreign keys
            cursor.execute("PRAGMA foreign_keys = ON")
            
            conn.commit()
            print(f"✅ Database reset successfully! All tables cleared.")
    
    def insert_article(
        self,
        heading: str,
        body: str = None,
        nucleus_summary: str = None,
        author: str = None,
        source_url: str = None,
        source_name: str = None,
        category: str = None,
        language: str = "english",
        word_count: int = None,
        image_url: str = None,
        published_at: str = None
    ) -> int:
        """Insert a complete article with all metadata and return its ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO articles 
                (heading, body, nucleus_summary, author, source_url, source_name, 
                 category, language, word_count, image_url, published_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (heading, body, nucleus_summary, author, source_url, source_name, 
                  category, language, word_count, image_url, published_at))
            article_id = cursor.lastrowid
            return article_id
    
    def update_nucleus_summary(self, article_id: int, nucleus_summary: str) -> bool:
        """Update the nucleus_summary for an article."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                UPDATE articles 
                SET nucleus_summary = ?, updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (nucleus_summary, article_id))
            conn.commit()
            return cursor.rowcount > 0
    
    def insert_or_get_keyword(self, keyword_name: str) -> int:
        """Insert keyword or return existing ID (UNIQUE constraint)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Try to get existing
            cursor.execute("SELECT id FROM keywords WHERE name = ?", (keyword_name,))
            row = cursor.fetchone()
            
            if row:
                return row[0]
            
            # Insert new
            cursor.execute("""
                INSERT INTO keywords (name, article_count)
                VALUES (?, 0)
            """, (keyword_name,))
            
            return cursor.lastrowid
    
    def link_article_keyword(
        self,
        article_id: int,
        keyword_id: int,
        relevance_score: float = 1.0,
        nucleus_summary: str = None
    ) -> None:
        """Link article to keyword with relevance score and store nucleus summary."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT INTO article_keywords (article_id, keyword_id, relevance_score)
                    VALUES (?, ?, ?)
                """, (article_id, keyword_id, relevance_score))
                
                # Increment article count for keyword
                cursor.execute("""
                    UPDATE keywords 
                    SET article_count = article_count + 1,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (keyword_id,))
                
            except sqlite3.IntegrityError:
                # Link already exists, just update relevance
                cursor.execute("""
                    UPDATE article_keywords 
                    SET relevance_score = ?
                    WHERE article_id = ? AND keyword_id = ?
                """, (relevance_score, article_id, keyword_id))
            
            # Store nucleus summary for this keyword-article pair
            if nucleus_summary:
                try:
                    cursor.execute("""
                        INSERT INTO keyword_summaries (keyword_id, article_id, nucleus_summary)
                        VALUES (?, ?, ?)
                    """, (keyword_id, article_id, nucleus_summary))
                except sqlite3.IntegrityError:
                    # Summary already exists for this pair, skip
                    pass
    
    def add_keywords_to_article(self, article_id: int, keywords: List[str], relevance_score: float = 1.0) -> List[int]:
        """
        Add keywords directly to an article using the article_keywords_list table.
        
        Args:
            article_id: ID of the article
            keywords: List of keyword names
            relevance_score: Relevance score for all keywords
        
        Returns:
            List of keyword IDs created
        """
        keyword_ids = []
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            for keyword_name in keywords:
                try:
                    cursor.execute("""
                        INSERT INTO article_keywords_list (article_id, keyword_name, relevance_score)
                        VALUES (?, ?, ?)
                    """, (article_id, keyword_name, relevance_score))
                    keyword_ids.append(cursor.lastrowid)
                except sqlite3.IntegrityError:
                    # Keyword already exists for this article, update relevance score
                    cursor.execute("""
                        UPDATE article_keywords_list 
                        SET relevance_score = ?
                        WHERE article_id = ? AND keyword_name = ?
                    """, (relevance_score, article_id, keyword_name))
            
            conn.commit()
        
        return keyword_ids
    
    def get_keywords_for_article(self, article_id: int) -> List[dict]:
        """
        Get all keywords for a specific article from article_keywords_list table.
        
        Args:
            article_id: ID of the article
        
        Returns:
            List of dicts with keyword_name and relevance_score
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, keyword_name, relevance_score, created_at
                FROM article_keywords_list
                WHERE article_id = ?
                ORDER BY relevance_score DESC
            """, (article_id,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_articles_by_keyword_name(self, keyword_name: str, limit: int = 10) -> List[dict]:
        """
        Get all articles associated with a specific keyword name.
        
        Args:
            keyword_name: Name of the keyword
            limit: Maximum number of results
        
        Returns:
            List of articles with this keyword
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT a.id, a.heading, a.author, a.category, 
                       a.published_at, akl.relevance_score
                FROM articles a
                JOIN article_keywords_list akl ON a.id = akl.article_id
                WHERE akl.keyword_name = ?
                ORDER BY a.published_at DESC
                LIMIT ?
            """, (keyword_name, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_keyword_summaries(
        self,
        keyword_id: int
    ) -> List[str]:
        """Get all nucleus summaries for a keyword as an array."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT nucleus_summary 
                FROM keyword_summaries
                WHERE keyword_id = ?
                ORDER BY created_at DESC
            """, (keyword_id,))
            
            rows = cursor.fetchall()
            summaries = [row[0] for row in rows]
            return summaries
    
    def get_articles_by_keyword(
        self,
        keyword_name: str,
        limit: int = 50
    ) -> List[dict]:
        """Get all articles for a keyword (the "Deep Briefing" query)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    a.id,
                    a.heading,
                    a.nucleus_summary,
                    a.source_url,
                    a.published_at,
                    ak.relevance_score
                FROM articles a
                JOIN article_keywords ak ON a.id = ak.article_id
                JOIN keywords k ON ak.keyword_id = k.id
                WHERE k.name = ?
                ORDER BY a.published_at DESC
                LIMIT ?
            """, (keyword_name, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_all_keywords_with_summaries(self) -> List[dict]:
        """
        Get all keywords with their summaries array and timestamps.
        
        Returns:
            List of dicts with structure:
            {
                'keyword_id': int,
                'keyword_name': str,
                'article_count': int,
                'keyword_created_at': timestamp,
                'keyword_updated_at': timestamp,
                'summaries': [
                    {
                        'summary': str,
                        'article_id': int,
                        'created_at': timestamp
                    },
                    ...
                ]
            }
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            # Get all keywords
            cursor.execute("""
                SELECT 
                    id,
                    name,
                    article_count,
                    created_at,
                    updated_at
                FROM keywords
                ORDER BY updated_at DESC
            """)
            
            all_keywords = cursor.fetchall()
            result = []
            
            for keyword_row in all_keywords:
                keyword_id = keyword_row[0]
                keyword_name = keyword_row[1]
                article_count = keyword_row[2]
                created_at = keyword_row[3]
                updated_at = keyword_row[4]
                
                # Get all summaries for this keyword
                cursor.execute("""
                    SELECT 
                        nucleus_summary,
                        article_id,
                        created_at
                    FROM keyword_summaries
                    WHERE keyword_id = ?
                    ORDER BY created_at DESC
                """, (keyword_id,))
                
                summaries_rows = cursor.fetchall()
                summaries = [
                    {
                        'summary': row[0],
                        'article_id': row[1],
                        'created_at': row[2]
                    }
                    for row in summaries_rows
                ]
                
                result.append({
                    'keyword_id': keyword_id,
                    'keyword_name': keyword_name,
                    'article_count': article_count,
                    'keyword_created_at': created_at,
                    'keyword_updated_at': updated_at,
                    'summaries': summaries
                })
            
            return result
    
    def get_trending_keywords(self, limit: int = 20) -> List[dict]:
        """Get most-mentioned keywords (story arcs)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    id,
                    name,
                    article_count,
                    created_at
                FROM keywords
                ORDER BY article_count DESC
                LIMIT ?
            """, (limit,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_keyword_timeline(
        self,
        keyword_name: str,
        days_back: int = 30
    ) -> List[dict]:
        """Get keyword mentions over time (for timeline visualization)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT 
                    DATE(a.published_at) as date,
                    COUNT(*) as mention_count,
                    GROUP_CONCAT(a.heading, ' | ') as headlines
                FROM articles a
                JOIN article_keywords ak ON a.id = ak.article_id
                JOIN keywords k ON ak.keyword_id = k.id
                WHERE k.name = ?
                    AND a.published_at >= datetime('now', '-' || ? || ' days')
                GROUP BY DATE(a.published_at)
                ORDER BY date DESC
            """, (keyword_name, days_back))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def register_embedding(
        self,
        article_id: int,
        faiss_index: int,
        embedding_model: str = "text-embedding-004"
    ) -> None:
        """Register FAISS embedding for article."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                INSERT OR REPLACE INTO embeddings 
                (article_id, faiss_index, embedding_model)
                VALUES (?, ?, ?)
            """, (article_id, faiss_index, embedding_model))
    
    def get_embedding_mapping(self) -> dict:
        """Get FAISS index -> Article ID mapping."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT faiss_index, article_id FROM embeddings ORDER BY faiss_index
            """)
            
            rows = cursor.fetchall()
            return {row[0]: row[1] for row in rows}
    
    def get_article_by_id(self, article_id: int) -> dict:
        """Fetch full article content by ID."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM articles WHERE id = ?
            """, (article_id,))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def search_keywords(self, query: str) -> List[dict]:
        """Search keywords by name (case-insensitive)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, name, article_count FROM keywords
                WHERE name LIKE ?
                ORDER BY article_count DESC
                LIMIT 20
            """, (f"%{query}%",))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_related_articles(
        self,
        article_id: int,
        limit: int = 5
    ) -> List[dict]:
        """Get articles sharing keywords (for recommendations)."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT DISTINCT 
                    a.id,
                    a.heading,
                    a.nucleus_summary,
                    COUNT(ak2.keyword_id) as shared_keywords
                FROM articles a
                JOIN article_keywords ak2 ON a.id = ak2.article_id
                WHERE ak2.keyword_id IN (
                    SELECT ak.keyword_id FROM article_keywords ak
                    WHERE ak.article_id = ?
                )
                AND a.id != ?
                GROUP BY a.id
                ORDER BY shared_keywords DESC
                LIMIT ?
            """, (article_id, article_id, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    # ==================== FULL ARTICLES & TRANSLATIONS ====================
    
    
    def get_full_article(self, article_id: int) -> dict:
        """Get full article by ID from the unified articles table."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("SELECT * FROM articles WHERE id = ?", (article_id,))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def insert_translation(
        self,
        article_id: int,
        language: str,
        translated_heading: str,
        translated_body: str = None,
        local_context: str = None,
        translation_notes: str = None,
        translator_model: str = "azure-openai-gpt4",
        translation_quality_score: float = 0.95
    ) -> int:
        """
        Insert a cached translation for an article.
        Called when translation is first requested, then served from DB.
        
        Args:
            article_id: Reference to articles_full
            language: Target language (hindi, tamil, telugu, bengali, assamese, etc.)
            translated_heading: Translated title
            translated_body: Translated content
            local_context: Local context/relevance
            translation_notes: Any special notes about translation
            translator_model: Model used for translation
            translation_quality_score: Quality score 0-1
        
        Returns:
            ID of inserted translation
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            try:
                cursor.execute("""
                    INSERT INTO article_translations
                    (article_id, language, translated_heading, translated_body, 
                     local_context, translation_notes, translator_model, 
                     translation_quality_score)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """, (article_id, language, translated_heading, translated_body,
                      local_context, translation_notes, translator_model, 
                      translation_quality_score))
                
                return cursor.lastrowid
                
            except sqlite3.IntegrityError:
                # Translation already exists, update it
                cursor.execute("""
                    UPDATE article_translations
                    SET translated_heading = ?,
                        translated_body = ?,
                        local_context = ?,
                        translation_notes = ?,
                        translator_model = ?,
                        translation_quality_score = ?,
                        translated_at = CURRENT_TIMESTAMP
                    WHERE article_id = ? AND language = ?
                """, (translated_heading, translated_body, local_context,
                      translation_notes, translator_model, translation_quality_score,
                      article_id, language))
                
                cursor.execute("SELECT id FROM article_translations WHERE article_id = ? AND language = ?",
                             (article_id, language))
                return cursor.fetchone()[0]
    
    def get_translation(self, article_id: int, language: str) -> dict:
        """
        Get cached translation for an article in specific language.
        Returns from DB if exists, None if needs translation.
        
        Args:
            article_id: Article ID
            language: Target language
        
        Returns:
            Translation dict if exists, None otherwise
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT * FROM article_translations
                WHERE article_id = ? AND language = ?
            """, (article_id, language))
            
            row = cursor.fetchone()
            return dict(row) if row else None
    
    def get_all_translations(self, article_id: int) -> List[dict]:
        """Get all translations for an article."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT language, translated_heading, translated_body, 
                       local_context, translation_quality_score, translated_at
                FROM article_translations
                WHERE article_id = ?
                ORDER BY translated_at DESC
            """, (article_id,))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def search_full_articles(self, query: str, limit: int = 20) -> List[dict]:
        """Search full articles by heading or content."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, heading, author, source_name, 
                       category, published_at, word_count
                FROM articles
                WHERE heading LIKE ? OR body LIKE ?
                ORDER BY published_at DESC
                LIMIT ?
            """, (f"%{query}%", f"%{query}%", limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]

    def get_latest_articles(self, limit: int = 20) -> List[dict]:
        """Get latest articles with full fields for feed rendering."""
        with self.get_connection() as conn:
            cursor = conn.cursor()

            cursor.execute("""
                SELECT id, heading, body, nucleus_summary, author, source_url,
                       source_name, category, language, word_count, image_url,
                       published_at, created_at
                FROM articles
                ORDER BY datetime(COALESCE(published_at, created_at)) DESC, id DESC
                LIMIT ?
            """, (limit,))

            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_articles_by_category(self, category: str, limit: int = 50) -> List[dict]:
        """Get all articles in a category."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT id, heading, body, nucleus_summary, author, source_url, source_name,
                       category, language, word_count, published_at, image_url
                FROM articles
                WHERE category = ?
                ORDER BY published_at DESC
                LIMIT ?
            """, (category, limit))
            
            rows = cursor.fetchall()
            return [dict(row) for row in rows]
    
    def get_translation_status(self, article_id: int) -> dict:
        """Get translation status for an article."""
        with self.get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute("""
                SELECT language, translation_quality_score, translated_at
                FROM article_translations
                WHERE article_id = ?
                ORDER BY translated_at DESC
            """, (article_id,))
            
            rows = cursor.fetchall()
            languages = [dict(row) for row in rows]
            
            return {
                "article_id": article_id,
                "total_translations": len(languages),
                "languages": [lang['language'] for lang in languages],
                "translations": languages
            }
        
    def get_keyword_by_article(self, article_id: int) -> dict:
        """
        Get all articles that share keywords with the given article.
        
        Workflow:
        1. Fetch source article's heading and nucleus_summary
        2. Find all keywords for the current article from article_keywords_list
        3. Search for all OTHER articles that have those keywords
        4. Count how many keywords they share (relevance)
        5. Return source article info + keywords + related articles sorted by relevance
        
        Uses the article_keywords_list table (direct keyword storage).
        """
        with self.get_connection() as conn:
            cursor = conn.cursor()

            # STEP 0: Fetch source article's heading and description
            cursor.execute(
                """
                SELECT heading, nucleus_summary
                FROM articles
                WHERE id = ?
                """,
                (article_id,)
            )
            
            source_article = cursor.fetchone()
            source_heading = source_article[0] if source_article else "Unknown"
            source_description = source_article[1] if source_article else "No description available"

            # STEP 1: Get all keywords for this article
            cursor.execute(
                """
                SELECT DISTINCT keyword_name
                FROM article_keywords_list
                WHERE article_id = ?
                ORDER BY keyword_name
                """,
                (article_id,)
            )

            keyword_rows = cursor.fetchall()

            # If no keywords found, return empty related articles
            if not keyword_rows:
                return {
                    "source_article_id": article_id,
                    "source_heading": source_heading,
                    "source_description": source_description,
                    "related_articles": [],
                    "keywords_found": 0
                }

            keyword_names = [row[0] for row in keyword_rows]
            keywords_found = len(keyword_names)

            # STEP 2: Build dynamic SQL for IN clause with all keywords
            placeholders = ",".join(["?"] * len(keyword_names))

            # STEP 3: Find all OTHER articles sharing these keywords
            # Count how many keywords each article shares (for ranking)
            cursor.execute(
                f"""
                SELECT DISTINCT a.id, a.heading, a.nucleus_summary, a.created_at,
                       COUNT(akl.keyword_name) as shared_keywords
                FROM articles a
                JOIN article_keywords_list akl ON a.id = akl.article_id
                WHERE akl.keyword_name IN ({placeholders})
                  AND a.id != ?
                GROUP BY a.id
                ORDER BY shared_keywords DESC, a.created_at DESC
                """,
                keyword_names + [article_id]
            )

            rows = cursor.fetchall()

            # STEP 4: Format results for frontend
            articles = []
            for r in rows:
                articles.append({
                    "article_id": r[0],
                    "title": r[1],
                    "summary": r[2],
                    "created_at": r[3],
                    "shared_keywords": r[4]
                })

            return {
                "source_article_id": article_id,
                "source_heading": source_heading,
                "source_description": source_description,
                "keywords_found": keywords_found,
                "keywords": keyword_names,
                "related_articles": articles,
                "total_related": len(articles)
            }
            
if __name__ == "__main__":
    # Test the database
    db = DatabaseManager()
    
    print("📊 Adding test article...")
    article_id = db.insert_article(
        heading="Union Budget 2026: Tax relief for middle class",
        body="In a major fiscal stimulus, the government announced significant tax relief targeting the middle class...",
        nucleus_summary="Government announces significant tax relief for middle class with focus on infrastructure spending.",
        author="Financial Times Bureau",
        source_url="https://example.com/budget-2026",
        source_name="Financial Times",
        category="business",
        language="english",
        word_count=450,
        published_at="2026-03-22 10:30:00"
    )
    print(f"✅ Article ID: {article_id}\n")
    
    print("🌐 Adding translations...")
    languages = ["hindi", "tamil", "telugu"]
    for lang in languages:
        translation_id = db.insert_translation(
            article_id=article_id,
            language=lang,
            translated_heading=f"[{lang.upper()}] Union Budget 2026",
            translated_body=f"Translation in {lang}...",
            local_context=f"Context relevant to {lang} speakers",
            translator_model="azure-openai-gpt4"
        )
        print(f"  ✅ {lang.capitalize()} translation (ID: {translation_id})")
    
    print("\n📋 Getting translation status...")
    status = db.get_translation_status(article_id)
    print(f"  Total translations: {status['total_translations']}")
    print(f"  Languages: {', '.join(status['languages'])}")
    
    print("\n✅ Database schema with articles and translations ready!")

    print("🏷️ Adding keywords...")
    keyword_ids = []
    for keyword in ["Union Budget 2026", "Tax Relief", "Fiscal Policy"]:
        kw_id = db.insert_or_get_keyword(keyword)
        db.link_article_keyword(article_id, kw_id)
        keyword_ids.append(kw_id)
        print(f"  - {keyword} (ID: {kw_id})")
    
    print("\n📈 Trending keywords...")
    trending = db.get_trending_keywords(5)
    for kw in trending:
        print(f"  - {kw['name']}: {kw['article_count']} articles")
    
    print("\n📋 Timeline for 'Union Budget 2026'...")
    timeline = db.get_keyword_timeline("Union Budget 2026", days_back=30)
    for entry in timeline:
        print(f"  - {entry['date']}: {entry['mention_count']} mentions")
