from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.news_translation import VernacularNewsTranslator
from src.news_summarization import NewsVideoGenerator
from src.database import DatabaseManager
from fastapi.staticfiles import StaticFiles
import json

app = FastAPI()

# Initialize database
db = DatabaseManager()

# ✅ CORS (important for React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
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
    Add a new article to the database.
    
    Returns:
        - article_id: ID in articles table
        - full_article_id: ID in articles_full table
    """
    try:
        # Step 1: Add to articles table
        article_id = db.insert_article(
            heading=request.heading,
            nucleus_summary=request.body[:200] if request.body else request.heading,
            source_url=request.source_url,
            language=request.language
        )
        
        # Step 2: Add to articles_full table
        full_article_id = db.insert_full_article(
            article_id=article_id,
            heading=request.heading,
            body=request.body,
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
            "full_article_id": full_article_id,
            "message": f"Article '{request.heading[:50]}...' added successfully"
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/articles/{article_id}")
def get_article(article_id: int):
    """Get full article by ID."""
    try:
        article = db.get_full_article(article_id)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        return article
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
    """Generate a video from article text."""
    try:
        generator = NewsVideoGenerator()
        result = generator.generate_video(
            request_data.article,
            request_data.title
        )

        return {
            "status": "success",
            "data": result
        }

    except Exception as e:
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
    3. Add to vector DB for semantic search
    4. Link keywords to article in database
    5. Return keywords and summary to frontend
    """
    try:
        from src.keyword_extractor import HeadingKeywordExtractor
        from src.vector_store import VectorStore
        
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
        
        # Step 3: Add to vector DB for semantic search
        vector_store = VectorStore()
        vector_store.add_article(
            article_id=article_id,
            nucleus_summary=nucleus_summary
        )
        
        # Step 4: Link keywords to article in database
        keyword_ids = []
        for keyword_name in keywords:
            # Insert or get keyword
            keyword_id = db.insert_or_get_keyword(keyword_name)
            # Link keyword to article with nucleus summary
            db.link_article_keyword(
                article_id=article_id,
                keyword_id=keyword_id,
                relevance_score=confidence,
                nucleus_summary=nucleus_summary
            )
            keyword_ids.append(keyword_id)
        
        # Step 5: Update article with nucleus summary
        # (If there's an update method in the DB)
        
        return {
            "status": "success",
            "article_id": article_id,
            "nucleus_summary": nucleus_summary,
            "keywords": keywords,
            "keyword_count": len(keywords),
            "confidence_score": confidence,
            "message": f"Article processed: {len(keywords)} keywords extracted and indexed"
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
        from src.vector_store import VectorStore
        from src.search_response_generator import SearchResponseGenerator
        
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