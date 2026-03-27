#!/usr/bin/env python3
"""
Insert all sample articles one by one using the add-and-process approach.
Automatically extracts keywords and summaries for each article.
Usage: python3 insert_with_keywords.py
"""

import os
import sys
from datetime import datetime
from src.database import DatabaseManager
from src.keyword_extractor import HeadingKeywordExtractor
from src.vector_store import VectorStore
from insert_detailed_articles import articles as DETAILED_ARTICLES
# Import the sample articles from the insert script
from insert_sample_articles import SAMPLE_ARTICLES

def insert_articles_with_processing():
    """Insert all sample articles with keyword extraction and vector DB indexing."""
    
    db_path = os.getenv("DATABASE_PATH", "db/news_navigator.db")
    
    print("=" * 80)
    print(" 📄 INSERTING ARTICLES WITH KEYWORDS & SUMMARIES")
    print("=" * 80)
    
    print(f"\n Database: {db_path}")
    print(f" Processing {len(SAMPLE_ARTICLES)} articles...\n")
    
    try:
        db = DatabaseManager(db_path=db_path)
        extractor = HeadingKeywordExtractor()
        vector_store = VectorStore()
        
        inserted_count = 0
        total_keywords = 0
        
        for i, article in enumerate(DETAILED_ARTICLES, 1):
            print(f"\n{'─' * 80}")
            print(f" 📝 Article {i}/{len(DETAILED_ARTICLES)}")
            print(f"{'─' * 80}")
            
            # Step 1: Extract keywords and generate nucleus summary
            print(f" 🔍 Extracting keywords and generating summary...")
            extracted = extractor.extract_keywords_from_heading(
                article_heading=article["heading"],
                article_body=article["body"]
            )
            
            nucleus_summary = extracted.nucleus_summary
            keywords = extracted.keywords
            print(keywords)
            confidence = extracted.confidence_score
            
            print(f"    ✅ Summary generated")
            print(f"    📋 Summary: {nucleus_summary[:100]}...")
            print(f"    Keywords extracted: {len(keywords)}")
            print(f"    Confidence: {confidence:.2%}")
        
            
            # Step 2: Insert article into database with AI-generated summary
            article_id = db.insert_article(
                heading=article["heading"],
                body=article["body"],
                nucleus_summary=nucleus_summary,
                author=article["author"],
                source_url=article["source_url"],
                source_name=article["source_name"],
                category=article["category"],
                language=article["language"],
                word_count=2000,
                image_url="https://picsum.photos/200/300",
                published_at=article["published_at"]
            )
            print(f" ✅ Article inserted (ID: {article_id})")
            
            # Step 3: Add to vector DB
            print(f" 📊 Adding to vector database...")
            try:
                vector_store.add_article(
                    article_id=article_id,
                    nucleus_summary=nucleus_summary
                )
                print(f"    ✅ Added to vector DB")
            except Exception as e:
                print(f"    ⚠️  Vector DB error (non-fatal): {str(e)[:60]}")
            
            # Step 4: Store keywords in article_keywords_list table
            print(f" 📌 Storing keywords...")
            db.add_keywords_to_article(
                article_id=article_id,
                keywords=keywords,  # Pass entire list, not individual keywords
                relevance_score=confidence
            )
            print(f"    ✅ {len(keywords)} keywords stored")
        
  
        print(f"\n ✅ All data has been inserted successfully!\n")
        
    except Exception as e:
        print(f"\n❌ Error inserting articles: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


def update_existing_articles_with_keywords(start_id=116, end_id=123):
    """Update existing articles with AI-generated summaries and keywords."""
    
    db_path = os.getenv("DATABASE_PATH", "db/news_navigator.db")
    
    print("=" * 90)
    print(" 🔑 UPDATING EXISTING ARTICLES WITH AI KEYWORDS & SUMMARIES")
    print("=" * 90)
    
    print(f"\n Database: {db_path}")
    print(f" Processing articles with IDs {start_id}-{end_id}...\n")
    
    try:
        db = DatabaseManager(db_path=db_path)
        extractor = HeadingKeywordExtractor()
        
        # Fetch existing articles in the specified ID range
        with db.get_connection() as conn:
            articles = conn.execute(
                "SELECT id, heading, body, nucleus_summary FROM articles WHERE id BETWEEN ? AND ? ORDER BY id",
                (start_id, end_id)
            ).fetchall()
        
        if not articles:
            print(f"❌ No articles found in ID range {start_id}-{end_id}")
            return
        
        print(f" Found {len(articles)} articles to process\n")
        
        updated_count = 0
        total_keywords = 0
        
        for i, (article_id, heading, body, old_summary) in enumerate(articles, 1):
            print(f"\n{'─' * 90}")
            print(f" 📝 Article {i}/{len(articles)} (ID: {article_id})")
            print(f"{'─' * 90}")
            print(f" Title: {heading[:80]}...")
            
            # Step 1: Extract keywords and generate AI nucleus summary
            print(f" 🔍 Extracting keywords and generating AI summary...")
            extracted = extractor.extract_keywords_from_heading(
                article_heading=heading,
                article_body=body
            )
            
            ai_summary = extracted.nucleus_summary
            keywords = extracted.keywords
            confidence = extracted.confidence_score
            
            print(f"    ✅ AI Summary generated ({len(ai_summary)} chars)")
            print(f"    📋 Old summary: {old_summary[:70] if old_summary else 'NULL'}...")
            print(f"    📋 New summary: {ai_summary[:70]}...")
            print(f"    Keywords extracted: {len(keywords)}")
            print(f"    Keywords: {', '.join(keywords[:5])}{'...' if len(keywords) > 5 else ''}")
            print(f"    Confidence: {confidence:.2%}")
            
            # Step 2: Update article with AI-generated summary
            print(f" 💾 Updating nucleus summary...")
            db.update_nucleus_summary(article_id, ai_summary)
            print(f"    ✅ Nucleus summary updated")
            
            # Step 3: Store keywords in article_keywords_list table
            print(f" 📌 Storing keywords...")
            db.add_keywords_to_article(
                article_id=article_id,
                keywords=keywords,
                relevance_score=confidence
            )
            print(f"    ✅ {len(keywords)} keywords stored")
            
            # Verify update
            with db.get_connection() as conn:
                verify = conn.execute(
                    "SELECT nucleus_summary FROM articles WHERE id = ?",
                    (article_id,)
                ).fetchone()
                keyword_count = conn.execute(
                    "SELECT COUNT(*) FROM article_keywords_list WHERE article_id = ?",
                    (article_id,)
                ).fetchone()[0]
            
            if verify and verify[0]:
                print(f"    ✔️  Verified: Summary updated ({len(verify[0])} chars), {keyword_count} keywords in DB")
            
            updated_count += 1
            total_keywords += len(keywords)
        
        print(f"\n{'=' * 90}")
        print(f" ✅ COMPLETED!")
        print(f"{'=' * 90}")
        print(f" Updated: {updated_count} articles")
        print(f" Total keywords added: {total_keywords}")
        print(f" Average keywords per article: {total_keywords/updated_count:.1f}" if updated_count > 0 else "")
        print(f"\n Note: AI-generated summaries replaced fallback 200-char summaries\n")
        
    except Exception as e:
        print(f"\n❌ Error updating articles: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--update":
        if len(sys.argv) < 4:
            print("Usage: python insert_with_keywords.py --update START_ID END_ID")
            sys.exit(1)
        start_id = int(sys.argv[2])
        end_id = int(sys.argv[3])
        update_existing_articles_with_keywords(start_id, end_id)
    else:
        insert_articles_with_processing()
