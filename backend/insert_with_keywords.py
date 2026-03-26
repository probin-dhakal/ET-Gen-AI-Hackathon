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

if __name__ == "__main__":
    insert_articles_with_processing()
