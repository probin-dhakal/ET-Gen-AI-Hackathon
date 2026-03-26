from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.news_translation import VernacularNewsTranslator 
# from src.news_summarization import NewsVideoGenerator
from src.database import DatabaseManager
from fastapi.staticfiles import StaticFiles
import json
import os

app = FastAPI()

# Vector indexing/search can trigger native-library crashes on some Windows setups.
# Keep it opt-in so core API routes (add/process/translate) remain stable.
VECTOR_INDEXING_ENABLED = os.getenv("ENABLE_VECTOR_INDEXING", "false").lower() == "true"

# Initialize database
db = DatabaseManager()

# ✅ CORS (important for React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# 📦 Request Models
# ==============================

class TranslationRequest(BaseModel):
    heading: str
    body: str


class ArticleRequest(BaseModel):
    """Model for adding a new article to database."""
    heading: str
    body: Optional[str] = None
    author: Optional[str] = None
    source_url: Optional[str] = None
    source_name: Optional[str] = None
    category: Optional[str] = None
    language: str = "english"
    word_count: Optional[int] = None
    image_url: Optional[str] = None
    published_at: Optional[str] = None


class VideoRequest(BaseModel):
    article: str
    title: str | None = "Generated Video"
    language: str = "english"




# ✅ Serve audio folder
app.mount("/audio", StaticFiles(directory="audio"), name="audio")
# ==============================
# 🏠 Root Route
# ==============================

@app.get("/")
def home():
    return {"message": "News Navigator API running - v2.0"}



@app.post("/api/articles/add")
def add_article(request: ArticleRequest):
    """
    Add a new article to the database with AI-generated nucleus summary.
    
    Returns:
        - article_id: ID of the created article (unified articles table)
        - nucleus_summary: AI-generated summary
    """
    try:
        from src.keyword_extractor import HeadingKeywordExtractor
        
        # Generate nucleus summary using AI
        extractor = HeadingKeywordExtractor()
        extracted = extractor.extract_keywords_from_heading(
            article_heading=request.heading,
            article_body=request.body or ""
        )
        
        nucleus_summary = extracted.nucleus_summary
        
        # Insert article with AI-generated summary
        article_id = db.insert_article(
            heading=request.heading,
            body=request.body,
            nucleus_summary=nucleus_summary,
            author=request.author,
            source_url=request.source_url,
            source_name=request.source_name,
            category=request.category,
            language=request.language,
            word_count=request.word_count,
            image_url=request.image_url,
            published_at=request.published_at or datetime.now().isoformat()
        )
        
        return {
            "status": "success",
            "article_id": article_id,
            "nucleus_summary": nucleus_summary,
            "message": f"Article '{request.heading[:50]}...' added successfully with AI-generated summary"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/articles/add-and-process")
def add_and_process_article(request: ArticleRequest):
    """
    Add a new article to database AND extract keywords + add to vector DB in one step.
    Keywords are stored directly in the article_keywords_list table linked to the article.
    
    Workflow:
    1. Insert article with all metadata 
    2. Extract keywords and nucleus summary using HeadingKeywordExtractor
    3. Add article to vector DB for semantic search
    4. Store keywords directly in article_keywords_list table
    5. Return article info with keywords and summary
    
    Returns:
        - article_id: ID of the created article
        - nucleus_summary: AI-generated summary of the article
        - keywords: List of extracted keywords
        - keyword_count: Number of keywords
        - confidence_score: Confidence of keyword extraction
    """
    try:
        from src.keyword_extractor import HeadingKeywordExtractor
        
        # Step 1: Insert article with all metadata into unified articles table
        article_id = db.insert_article(
            heading=request.heading,
            body=request.body,
            nucleus_summary=request.body[:200] if request.body else request.heading,
            author=request.author,
            source_url=request.source_url,
            source_name=request.source_name,
            category=request.category,
            language=request.language,
            word_count=request.word_count,
            image_url=request.image_url,
            published_at=request.published_at or datetime.now().isoformat()
        )
        
        # Step 2: Extract keywords and nucleus summary
        extractor = HeadingKeywordExtractor()
        extracted = extractor.extract_keywords_from_heading(
            article_heading=request.heading,
            article_body=request.body or ""
        )
        
        nucleus_summary = extracted.nucleus_summary
        keywords = extracted.keywords
        confidence = extracted.confidence_score
        
        # Step 3: Add to vector DB for semantic search (optional/safe-mode)
        vector_indexed = False
        if VECTOR_INDEXING_ENABLED:
            try:
                from src.vector_store import VectorStore
                vector_store = VectorStore()
                vector_store.add_article(
                    article_id=article_id,
                    nucleus_summary=nucleus_summary
                )
                vector_indexed = True
            except Exception:
                vector_indexed = False
        
        # Step 4: Store keywords directly in article_keywords_list table
        keyword_ids = db.add_keywords_to_article(
            article_id=article_id,
            keywords=keywords,
            relevance_score=confidence
        )
        
        # Step 5: Return article info with keywords and summary
        return {
            "status": "success",
            "article_id": article_id,
            "heading": request.heading,
            "nucleus_summary": nucleus_summary,
            "keywords": keywords,
            "keyword_count": len(keywords),
            "confidence_score": confidence,
            "vector_indexed": vector_indexed,
            "message": f"Article '{request.heading[:50]}...' added and processed successfully with {len(keywords)} keywords stored"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/articles/{article_id}/keywords/add")
def add_keywords_to_article_manual(article_id: int, keywords: list):
    """
    Manually add keywords to an existing article (after article has been created).
    
    Args:
        article_id: ID of the article
        keywords: List of keyword strings to add
    
    Returns:
        Confirmation with keywords added
    """
    try:
        # Verify article exists
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Add keywords to article
        db.add_keywords_to_article(article_id=article_id, keywords=keywords, relevance_score=1.0)
        
        # Get all keywords for the article
        all_keywords = db.get_keywords_for_article(article_id)
        
        return {
            "status": "success",
            "article_id": article_id,
            "message": f"Added {len(keywords)} keywords to article",
            "keywords_added": keywords,
            "total_keywords": all_keywords,
            "total_count": len(all_keywords)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



def get_article_keywords(article_id: int):
    """
    Get all keywords for a specific article from article_keywords_list table.
    
    Args:
        article_id: ID of the article
    
    Returns:
        List of keywords with relevance scores
    """
    try:
        # Verify article exists
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Get keywords for article
        keywords = db.get_keywords_for_article(article_id)
        
        return {
            "status": "success",
            "article_id": article_id,
            "article_heading": article.get('heading'),
            "keywords": keywords,
            "keyword_count": len(keywords)
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/keywords/{keyword_name}/articles")
def get_articles_by_keyword_name(keyword_name: str, limit: int = 10):
    """
    Get all articles associated with a specific keyword name.
    
    Args:
        keyword_name: Name of the keyword
        limit: Maximum number of articles to return (default: 10)
    
    Returns:
        List of articles with this keyword
    """
    try:
        articles = db.get_articles_by_keyword_name(keyword_name, limit=limit)
        
        return {
            "status": "success",
            "keyword_name": keyword_name,
            "articles": articles,
            "article_count": len(articles)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles/{article_id}")
def get_article_by_id(article_id: int):
    """Get full article by ID."""
    try:
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return article
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles/latest")
def get_latest_articles(limit: int = 20):
    """Get latest articles from local database for feed UI."""
    try:
        articles = db.get_latest_articles(limit=limit)
        return {"count": len(articles), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/feed/latest")
def get_latest_feed_articles(limit: int = 20):
    """Get latest articles across all categories for homepage feed."""
    try:
        articles = db.get_latest_articles(limit=limit)
        return {"count": len(articles), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles/search/{query}")
def search_articles(query: str, limit: int = 20):
    """Search articles by heading or content."""
    try:
        articles = db.search_full_articles(query, limit=limit)
        return {"count": len(articles), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles/category/{category}")
def get_articles_by_category(category: str, limit: int = 50):
    """Get all articles in a category."""
    try:
        articles = db.get_articles_by_category(category, limit=limit)
        return {"category": category, "count": len(articles), "articles": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))



@app.get("/api/translations/{article_id}/{language}")
def get_translation(article_id: int, language: str):
    """
    Get specific translation for an article (cached or generated).
    
    Workflow:
    1. Check if translation exists in cache
    2. If yes: return from DB (fast)
    3. If no: generate using news_translation + cache + return
    """
    try:
        language = language.lower()
        
        # Step 1: Check cache
        cached_translation = db.get_translation(article_id, language)
        if cached_translation:
            return {
                "status": "cached",
                "source": "database",
                "translation": cached_translation
            }
        
        # Step 2: Get article from database
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Step 3: Generate translation using VernacularNewsTranslator
        translator = VernacularNewsTranslator()
        translated_article = translator.translate_article(
            article_heading=article.get('heading', ''),
            article_body=article.get('body', ''),
            language=language
        )
        
        # Convert to dict for JSON serialization
        if hasattr(translated_article, 'to_dict'):
            result = translated_article.to_dict()
        elif hasattr(translated_article, 'model_dump'):
            result = translated_article.model_dump()
        else:
            result = dict(translated_article)
        
        # Step 4: Cache the translation
        translation_id = db.insert_translation(
            article_id=article_id,
            language=language,
            translated_heading=result.get('translated_heading'),
            translated_body=result.get('translated_body'),
            local_context=result.get('local_context'),
            translation_notes=result.get('translation_notes'),
            translator_model="azure-openai-gpt4",
            translation_quality_score=result.get('confidence_score', 0.95)
        )
        
        # Step 5: Return translation
        return {
            "status": "generated",
            "source": "llm_and_cached",
            "translation_id": translation_id,
            "translation": result
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# Video Generation API
# ==============================

@app.post("/generate-video")
def generate_video(request_data: VideoRequest):
    try:
        generator = NewsVideoGenerator()

        # ✅ safe handling
        language = (request_data.language or "english").lower()

        result = generator.generate_video(
            request_data.article,
            request_data.title,
            language
        )

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
        import traceback
        traceback.print_exc()  # 🔥 helps debugging
        raise HTTPException(status_code=500, detail=str(e))


# ==============================
# 📊 STATS & HEALTH CHECK
# ==============================

@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "database": "connected",
        "translator": "ready",
        "timestamp": datetime.now().isoformat()
    }


# ==============================
# KEYWORD & VECTOR DB API
# ==============================

@app.post("/api/articles/process")
def process_article(article_id: int):
    """
    Process article to extract keywords, generate summary, and add to vector DB.
    
    Workflow:
    1. Get article from database
    2. Extract keywords and nucleus summary using HeadingKeywordExtractor
    3. Update article with AI-generated nucleus summary
    4. Add to vector DB for semantic search
    5. Store keywords in article_keywords_list table
    6. Return keywords and summary to frontend
    """
    try:
        from src.keyword_extractor import HeadingKeywordExtractor
        
        # Step 1: Get article from database
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Step 2: Extract keywords and nucleus summary
        extractor = HeadingKeywordExtractor()
        extracted = extractor.extract_keywords_from_heading(
            article_heading=article.get('heading', ''),
            article_body=article.get('body', '')
        )
        
        nucleus_summary = extracted.nucleus_summary
        keywords = extracted.keywords
        confidence = extracted.confidence_score
        
        # Step 3: Update article with AI-generated nucleus summary
        db.update_nucleus_summary(article_id, nucleus_summary)
        
        # Step 4: Add to vector DB for semantic search (optional/safe-mode)
        vector_indexed = False
        if VECTOR_INDEXING_ENABLED:
            try:
                from src.vector_store import VectorStore
                vector_store = VectorStore()
                vector_store.add_article(
                    article_id=article_id,
                    nucleus_summary=nucleus_summary
                )
                vector_indexed = True
            except Exception:
                vector_indexed = False
        
        # Step 5: Store keywords in article_keywords_list table
        keyword_ids = db.add_keywords_to_article(
            article_id=article_id,
            keywords=keywords,
            relevance_score=confidence
        )
        
        return {
            "status": "success",
            "article_id": article_id,
            "nucleus_summary": nucleus_summary,
            "keywords": keywords,
            "keyword_count": len(keywords),
            "confidence_score": confidence,
            "vector_indexed": vector_indexed,
            "message": f"Article processed: {len(keywords)} keywords extracted, summary updated"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/search")
def search_articles_vector(query: str, top_k: int = 5):
    """
    Semantic search using vector database (FAISS) with LLM-powered response.
    Finds articles similar to query using embeddings and generates intelligent response.
    
    Args:
        query: Search query string
        top_k: Number of results to return (default: 5)
    
    Returns:
        - articles: List of semantically similar articles
        - llm_response: Intelligent response from Azure LLM with insights
    """
    try:
        from src.search_response_generator import SearchResponseGenerator

        if not VECTOR_INDEXING_ENABLED:
            fallback_articles = db.search_full_articles(query, limit=top_k)
            formatted = []
            for article in fallback_articles:
                formatted.append({
                    "article_id": article.get("id"),
                    "heading": article.get("heading"),
                    "body": "",
                    "search_score": 0.5,
                    "source_url": article.get("source_url"),
                    "author": article.get("author"),
                    "category": article.get("category"),
                    "published_at": article.get("published_at")
                })

            return {
                "status": "success",
                "query": query,
                "results_count": len(formatted),
                "articles": formatted,
                "llm_response": {
                    "user_query": query,
                    "response_summary": "Vector search is disabled in safe mode. Showing keyword-based matches.",
                    "key_insights": [],
                    "confidence_score": 0.5 if formatted else 0.0
                },
                "mode": "keyword_fallback"
            }

        from src.vector_store import VectorStore
        
        # Step 1: Perform semantic search
        vector_store = VectorStore()
        results = vector_store.search_and_retrieve(query, top_k=top_k)
        
        if not results:
            return {
                "status": "success",
                "query": query,
                "results_count": 0,
                "articles": [],
                "llm_response": {
                    "user_query": query,
                    "response_summary": "No articles found matching your query. Please try with different keywords.",
                    "key_insights": [],
                    "confidence_score": 0.0
                },
                "message": "No similar articles found"
            }
        
        # Format results for frontend and LLM
        formatted_results = []
        for article in results:
            formatted_results.append({
                "article_id": article.get('id'),
                "heading": article.get('heading'),
                "body": article.get('body')[:200] if article.get('body') else "",  # First 200 chars
                "search_score": article.get('search_score', 0),
                "source_url": article.get('source_url'),
                "author": article.get('author'),
                "category": article.get('category'),
                "published_at": article.get('published_at')
            })
        
        # Step 2: Generate LLM response based on search results
        response_generator = SearchResponseGenerator()
        llm_response = response_generator.generate_response(
            user_query=query,
            search_results=results
        )
        
        # Convert response to dict for JSON serialization
        if hasattr(llm_response, 'model_dump'):
            llm_response_dict = llm_response.model_dump()
        elif hasattr(llm_response, 'dict'):
            llm_response_dict = llm_response.dict()
        else:
            llm_response_dict = dict(llm_response)
        
        return {
            "status": "success",
            "query": query,
            "results_count": len(formatted_results),
            "articles": formatted_results,
            "llm_response": llm_response_dict
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/keywords")
def get_all_keywords_with_summaries():
    """
    Get all keywords from database with their summaries array and timestamps.
    
    Returns:
        List of keywords with structure:
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
    try:
        keywords_data = db.get_all_keywords_with_summaries()
        
        return {
            "status": "success",
            "total_keywords": len(keywords_data),
            "keywords": keywords_data
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/articles/{article_id}/keyword")
def get_keyword_by_article(article_id: int):
    """
    Get the keyword that contains the given article_id
    and return all summaries inside that keyword.
    """

    try:
        keyword_data = db.get_keyword_by_article(article_id)
        print(keyword_data)
        return {
            "status": "success",
            "keyword": keyword_data
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/keywords/trending")
def get_trending_keywords(limit: int = 20):
    """
    Get trending keywords across all articles.
    
    Args:
        limit: Number of keywords to return (default: 20)
    
    Returns:
        List of trending keywords with article count
    """
    try:
        keywords = db.get_trending_keywords(limit=limit)
        
        return {
            "status": "success",
            "trending_keywords": keywords,
            "count": len(keywords)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/keywords/{keyword_id}/articles")
def get_articles_by_keyword(keyword_id: int, limit: int = 10):
    """
    Get all articles linked to a specific keyword.
    
    Args:
        keyword_id: ID of the keyword
        limit: Number of articles to return (default: 10)
    
    Returns:
        List of articles with this keyword
    """
    try:
        articles = db.get_articles_by_keyword(keyword_id, limit=limit)
        
        return {
            "status": "success",
            "keyword_id": keyword_id,
            "articles": articles,
            "count": len(articles)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

@app.post("/api/articles/{article_id}/briefing")
def generate_keyword_briefing(article_id: int, query: Optional[str] = None):
    """
    Generate an AI-powered briefing from all related article summaries
    belonging to the same keyword cluster.
    
    Args:
        article_id: The article ID to generate briefing for
        query: Optional custom user query to answer (e.g., follow-up questions).
               If not provided, uses default briefing query.
    
    Process:
    1. Get keyword cluster for the article
    2. Collect summaries from all related articles
    3. Combine summaries into context
    4. Use AI to answer the query based on the summaries
    """

    try:
        from src.search_response_generator import SearchResponseGenerator

        # Step 1: get keyword cluster
        keyword_data = db.get_keyword_by_article(article_id)

        if not keyword_data:
            raise HTTPException(status_code=404, detail="Keyword cluster not found")

        related_articles = keyword_data.get("related_articles", [])

        if not related_articles:
            return {
                "status": "success",
                "message": "No related articles found",
                "briefing": None
            }

        # Step 2: collect summaries from related articles
        summaries = [
            article["summary"]
            for article in related_articles
            if article.get("summary")
        ]

        if not summaries:
            return {
                "status": "success",
                "message": "No summaries available for this keyword cluster",
                "briefing": None
            }

        # Step 3: combine summaries into comprehensive context
        combined_text = "\n\n".join(summaries)

        # Step 4: determine the query to use
        if not query or query.strip() == "":
            # Use default briefing query
            user_query = "Generate a unified intelligence briefing from these news summaries in a concise format with key insights and trends."
        else:
            # Use user's custom query (follow-up question)
            user_query = query.strip()

        # Step 5: generate AI response using SearchResponseGenerator
        generator = SearchResponseGenerator()

        # Format search results with better structure
        search_results = [{
            "heading": "Related Articles Summary",
            "body": combined_text,
            "source": "Multiple related articles",
            "article_ids": [article["article_id"] for article in related_articles]
        }]

        briefing = generator.generate_response(
            user_query=user_query,
            search_results=search_results
        )

        if hasattr(briefing, "model_dump"):
            briefing = briefing.model_dump()
        elif hasattr(briefing, "dict"):
            briefing = briefing.dict()

        return {
            "status": "success",
            "articles_used": len(summaries),
            "query_used": user_query,
            "briefing": briefing
        }

    except HTTPException as http_e:
        raise http_e
    except Exception as e:
        print(f"❌ Error generating briefing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Briefing generation failed: {str(e)}")