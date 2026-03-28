"""
Truncate all article bodies to 600 words
"""

import sqlite3
import os
from pathlib import Path

# Database path
DB_PATH = "db/news_navigator.db"

def truncate_to_600_words(text):
    """Truncate text to 600 words"""
    if not text:
        return text
    
    words = text.split()
    if len(words) <= 600:
        return text
    
    return ' '.join(words[:600])

def truncate_articles_to_600_words():
    """Truncate all article bodies to 600 words"""
    
    # Ensure database exists
    if not os.path.exists(DB_PATH):
        print(f"❌ Error: Database not found at {DB_PATH}")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        # Count articles before
        cursor.execute("SELECT COUNT(*) as count FROM articles WHERE body IS NOT NULL")
        before_count = cursor.fetchone()[0]
        
        print(f"📊 Total articles with body: {before_count}")
        
        # Fetch all articles
        cursor.execute("SELECT id, body FROM articles WHERE body IS NOT NULL")
        articles = cursor.fetchall()
        
        # Truncate each article to 600 words
        truncated_count = 0
        for article_id, body in articles:
            truncated_body = truncate_to_600_words(body)
            if len(truncated_body) < len(body):  # Only update if actually truncated
                cursor.execute(
                    "UPDATE articles SET body = ? WHERE id = ?",
                    (truncated_body, article_id)
                )
                truncated_count += 1
        
        conn.commit()
        
        # Verify the changes
        def count_words(text):
            return len(text.split()) if text else 0
        
        cursor.execute("SELECT body FROM articles WHERE body IS NOT NULL")
        all_bodies = cursor.fetchall()
        word_counts = [count_words(row[0]) for row in all_bodies]
        
        print(f"\n✅ Truncation completed!")
        print(f"📈 Statistics after truncation:")
        print(f"   • Total articles: {len(word_counts)}")
        print(f"   • Articles truncated: {truncated_count}")
        print(f"   • Average words per article: {sum(word_counts) / len(word_counts):.2f}")
        print(f"   • Max words: {max(word_counts)}")
        print(f"   • Min words: {min(word_counts)}")
        
        conn.close()
        
    except sqlite3.Error as e:
        print(f"❌ Database error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("🔄 Starting article body truncation to 600 words...\n")
    truncate_articles_to_600_words()
