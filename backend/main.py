from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from src.news_translation import VernacularNewsTranslator 
from src.news_summarization import NewsVideoGenerator
from src.database import DatabaseManager
from fastapi.staticfiles import StaticFiles
import json
import os
import re

app = FastAPI()

# Vector indexing/search can trigger native-library crashes on some Windows setups.
# Keep it opt-in so core API routes (add/process/translate) remain stable.
VECTOR_INDEXING_ENABLED = os.getenv("ENABLE_VECTOR_INDEXING", "false").lower() == "true"

# Initialize database
db = DatabaseManager()

# ==============================
# 👤 USER PERSONAS FOR PERSONALIZATION
# ==============================
PERSONAS = {
    "startup_founder": {
        "id": "startup_founder",
        "role": "Startup Founder in Tech",
        "interests": ["Venture Capital", "SaaS", "Interest Rates", "Competitor acquisitions", "Funding", "Startup ecosystem"],
        "goal": "Looking for funding and monitoring market runway."
    },
    "retail_investor": {
        "id": "retail_investor",
        "role": "Retail Mutual Fund Investor",
        "interests": ["Mid-cap stocks", "Dividend yields", "Government budgets", "Inflation", "Portfolio management", "Market trends"],
        "goal": "Growing personal wealth safely over 10 years."
    },
    "enterprise_executive": {
        "id": "enterprise_executive",
        "role": "Enterprise Executive",
        "interests": ["Digital transformation", "Cloud infrastructure", "B2B partnerships", "Regulatory compliance", "Enterprise AI", "Market consolidation"],
        "goal": "Drive digital transformation and stay competitive in enterprise market."
    }
}

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
def get_latest_articles(limit: int = Query(20, ge=1, le=100)):
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


@app.get("/api/feed/personalized/{persona_id}")
def get_personalized_feed_articles(persona_id: str, limit: int = 6):
    """
    Get personalized feed articles based on user persona.
    
    Persona-based filtering:
    - Filters articles by interests/keywords relevant to the selected persona
    - Returns articles that match the persona's interests
    
    Available personas:
    - startup_founder: Venture Capital, SaaS, Interest Rates, Competitor acquisitions
    - retail_investor: Mid-cap stocks, Dividend yields, Government budgets, Inflation
    - enterprise_executive: Digital transformation, Cloud infrastructure, B2B partnerships
    """
    try:
        # Validate persona exists
        if persona_id not in PERSONAS:
            raise HTTPException(
                status_code=404, 
                detail=f"Persona '{persona_id}' not found. Available: {list(PERSONAS.keys())}"
            )
        
        persona = PERSONAS[persona_id]
        interests = persona.get("interests", [])
        
        # Get all latest articles
        all_articles = db.get_latest_articles(limit=100)
        
        # Filter articles based on persona interests
        personalized_articles = []
        for article in all_articles:
            # Check if article heading or keywords match persona interests
            article_text = (article.get("heading", "") + " " + article.get("nucleus_summary", "")).lower()
            
            # Count matching interests
            matching_interests = sum(
                1 for interest in interests 
                if interest.lower() in article_text
            )
            
            if matching_interests > 0:
                # Add relevance score based on matched interests
                article["persona_relevance_score"] = matching_interests / len(interests)
                personalized_articles.append(article)
        
        # Sort by relevance and return
        personalized_articles.sort(key=lambda x: x.get("persona_relevance_score", 0), reverse=True)
        personalized_articles = personalized_articles[:limit]
        
        return {
            "persona_id": persona_id,
            "persona_role": persona.get("role"),
            "persona_goal": persona.get("goal"),
            "count": len(personalized_articles),
            "articles": personalized_articles
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/personas")
def list_all_personas():
    """Get list of all available personas."""
    return {
        "count": len(PERSONAS),
        "personas": [
            {
                "id": persona_id,
                "role": persona.get("role"),
                "goal": persona.get("goal"),
                "interests": persona.get("interests", [])
            }
            for persona_id, persona in PERSONAS.items()
        ]
    }



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
        print(language)
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
        # print(article)
        if not article:
            raise HTTPException(status_code=404, detail="Article not found")
        
        # Step 3: Generate translation using VernacularNewsTranslator
        translator = VernacularNewsTranslator()
        translated_article = translator.translate_article(
            article_heading=article.get('heading', ''),
            article_body=article.get('body', ''),
            language=language
        )
        # print(translated_article)
        
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

        print(request_data)
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
# STATS & HEALTH CHECK
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

    def _truncate_words(text: str, max_words: int = 18) -> str:
        words = (text or "").split()
        if len(words) <= max_words:
            return (text or "").strip()
        return " ".join(words[:max_words]).rstrip(".,;:")

    def _to_bullet_lines(text: str, max_items: int = 5) -> list[str]:
        # Split paragraphs/sentences into short bullet candidates.
        if not text:
            return []
        cleaned = re.sub(r"\s+", " ", text).strip()
        raw_parts = re.split(r"[\n\r]+|(?<=[.!?])\s+", cleaned)
        bullets = []
        for part in raw_parts:
            line = part.strip(" -•\t")
            if not line:
                continue
            bullets.append(_truncate_words(line, 18))
            if len(bullets) >= max_items:
                break
        return bullets

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
            user_query = """
Create an intelligence briefing using ONLY bullet points.

Output format:
- Key Event
- Major Development
- Impact / Trend
- Important Numbers or Facts
- What Happens Next

Rules:
- STRICTLY no paragraphs
- Output ONLY the 5 bullets above, in this exact order
- Start each line with "• "
- Maximum 5 bullet points
- Each bullet ≤ 18 words
- Total ≤ 100 words
- No intro/outro text
"""
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

        # Enforce bullet-style output even if upstream model returns paragraphs.
        insights = briefing.get("key_insights", []) if isinstance(briefing, dict) else []
        normalized_insights = []
        for item in insights[:5]:
            if not isinstance(item, str):
                continue
            normalized = _truncate_words(item.strip(" -•\t"), 18)
            if normalized:
                normalized_insights.append(normalized)

        if len(normalized_insights) < 3:
            summary_text = ""
            if isinstance(briefing, dict):
                summary_text = str(briefing.get("response_summary", "") or "")
            normalized_insights = _to_bullet_lines(summary_text, max_items=5)

        if isinstance(briefing, dict):
            briefing["key_insights"] = normalized_insights
            briefing["response_summary"] = "\n".join([f"• {line}" for line in normalized_insights])

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
    




# chinmoy special routes

@app.post("/api/articles/{article_id}/story-intelligence")
def generate_story_intelligence(article_id: int, query: Optional[str] = None):
    """
    Build advanced story intelligence for a keyword cluster around an article.

    Output includes:
    - sentiment_shifts
    - contrarian_perspectives
    - what_to_watch_next
    """

    def _parse_dt(value: Optional[str]) -> datetime:
        if not value:
            return datetime.min
        text = str(value).strip()
        try:
            return datetime.fromisoformat(text.replace("Z", "+00:00"))
        except Exception:
            pass
        try:
            return datetime.strptime(text, "%Y-%m-%d %H:%M:%S")
        except Exception:
            return datetime.min

    try:
        from src.search_response_generator import SearchResponseGenerator

        keyword_data = db.get_keyword_by_article(article_id)
        if not keyword_data:
            raise HTTPException(status_code=404, detail="Keyword cluster not found")

        source_article_id = keyword_data.get("source_article_id")
        source_heading = keyword_data.get("source_heading")
        source_description = keyword_data.get("source_description")
        related_articles = keyword_data.get("related_articles", [])

        search_results = []

        if source_article_id:
            search_results.append({
                "article_id": source_article_id,
                "heading": source_heading or "Source Article",
                "body": source_description or "",
                "search_score": 1.0,
                "source_url": "",
                "author": "",
                "category": "",
                "published_at": ""
            })

        for article in related_articles:
            if not article.get("article_id"):
                continue
            search_results.append({
                "article_id": article.get("article_id"),
                "heading": article.get("title") or "Related Article",
                "body": article.get("summary") or "",
                "search_score": float(article.get("shared_keywords", 0) or 0),
                "source_url": "",
                "author": "",
                "category": "",
                "published_at": article.get("created_at") or ""
            })

        if not search_results:
            return {
                "status": "success",
                "article_id": article_id,
                "message": "No story data available for this cluster",
                "story_intelligence": None
            }

        search_results = sorted(
            search_results,
            key=lambda item: _parse_dt(item.get("published_at"))
        )

        user_query = (query or "").strip() or (
            "Analyze this ongoing business story cluster for sentiment shifts over time, "
            "contrarian perspectives, and what to watch next predictions."
        )

        generator = SearchResponseGenerator()
        intelligence = generator.generate_story_intelligence(
            user_query=user_query,
            search_results=search_results
        )

        if hasattr(intelligence, "model_dump"):
            intelligence_dict = intelligence.model_dump()
        elif hasattr(intelligence, "dict"):
            intelligence_dict = intelligence.dict()
        else:
            intelligence_dict = dict(intelligence)

        return {
            "status": "success",
            "article_id": article_id,
            "query_used": user_query,
            "cluster_articles": len(search_results),
            "story_intelligence": intelligence_dict
        }

    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error generating story intelligence: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Story intelligence generation failed: {str(e)}")
    


@app.post("/api/articles/ask-with-context")
def answer_article_question(
    article_title: str,
    article_description: str,
    article_content: str = "",
    user_query: str = ""
):
    """
    Answer user questions specifically about the current article.
    This endpoint focuses responses on a single article's content.
    
    Args:
        article_title: Title of the current article
        article_description: Description/summary of the article
        article_content: Full content of the article (optional)
        user_query: User's question about this specific article
    
    Returns:
        Response with answer focused on this article's content
    """
    try:
        from src.search_response_generator import SearchResponseGenerator
        
        if not user_query or not user_query.strip():
            return {
                "status": "error",
                "detail": "user_query is required"
            }
        
        # Create a single search result object representing the current article
        article_context = {
            "heading": article_title,
            "body": article_content if article_content.strip() else article_description,
            "search_score": 1.0,  # High score since it's the main article
            "author": "Source",
            "category": "Current Article"
        }
        
        # Format the query to focus on this specific article
        focused_query = f"""Context: The user is asking about a specific article titled "{article_title}".

Article Summary: {article_description}

User's Question: {user_query}

Please provide a comprehensive answer based ONLY on the content of this specific article. Focus your response on:
1. Direct answer to the question from this article
2. Specific details, facts, and quotes from the article
3. How this article relates to the user's question
4. Any conclusions or implications from this article's content

Keep the response clear and focused on this single article."""
        
        # Generate response using SearchResponseGenerator
        generator = SearchResponseGenerator()
        response = generator.generate_response(
            user_query=focused_query,
            search_results=[article_context]
        )
        
        # Convert to dict if needed
        if hasattr(response, "model_dump"):
            response_dict = response.model_dump()
        elif hasattr(response, "dict"):
            response_dict = response.dict()
        else:
            response_dict = dict(response)
        
        return {
            "status": "success",
            "response": response_dict.get("response_summary", ""),
            "insights": response_dict.get("key_insights", []),
            "confidence": response_dict.get("confidence_score", 0.8)
        }
    
    except Exception as e:
        print(f"❌ Error answering article question: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate answer: {str(e)}"
        )


@app.get("/api/articles/{article_id}/story-intelligence")
def get_story_intelligence(article_id: int, query: Optional[str] = None):
    """
    Build structured story intelligence for an ongoing article cluster.

    Returns:
        - sentiment_shifts: chronological sentiment movement with drivers
        - contrarian_perspectives: non-consensus viewpoints
        - what_to_watch_next: forward-looking predictions with watch signals
    """
    try:
        from src.search_response_generator import SearchResponseGenerator

        keyword_data = db.get_keyword_by_article(article_id)
        if not keyword_data:
            raise HTTPException(status_code=404, detail="Keyword cluster not found")

        related_articles = keyword_data.get("related_articles", [])
        if not related_articles:
            return {
                "status": "success",
                "message": "No related articles found",
                "story_intelligence": None
            }

        source_heading = keyword_data.get("source_heading") or "Source Article"
        source_description = keyword_data.get("source_description") or ""

        # Include source article context + related summaries for richer temporal synthesis.
        search_results = [
            {
                "id": keyword_data.get("source_article_id", article_id),
                "heading": source_heading,
                "body": source_description,
                "author": "Unknown",
                "source_url": "cluster-source",
                "published_at": "",
                "search_score": 1.0,
            }
        ]

        for item in related_articles:
            if not item.get("summary"):
                continue
            search_results.append(
                {
                    "id": item.get("article_id"),
                    "heading": item.get("title", "Related Article"),
                    "body": item.get("summary", ""),
                    "author": "Unknown",
                    "source_url": "cluster-related",
                    "published_at": item.get("created_at", ""),
                    "search_score": float(item.get("shared_keywords", 0) or 0),
                }
            )

        user_query = query.strip() if query and query.strip() else (
            "Analyze this ongoing business story: track sentiment shifts over time, surface contrarian "
            "perspectives, and predict what to watch next."
        )

        generator = SearchResponseGenerator()
        intelligence = generator.generate_story_intelligence(
            user_query=user_query,
            search_results=search_results,
        )

        if hasattr(intelligence, "model_dump"):
            intelligence = intelligence.model_dump()
        elif hasattr(intelligence, "dict"):
            intelligence = intelligence.dict()

        return {
            "status": "success",
            "article_id": article_id,
            "query_used": user_query,
            "story_intelligence": intelligence,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Story intelligence generation failed: {str(e)}")



@app.get("/api/articles/{article_id}/timeline")
def get_agentic_timeline_by_article(article_id: int):
    """
    Build an agentic, date-sorted timeline for the given article story cluster.
    This route is separate from /keyword to keep related-article contract unchanged.
    """
    try:
        from src.search_response_generator import SearchResponseGenerator

        keyword_data = db.get_keyword_by_article(article_id)
        if not keyword_data:
            raise HTTPException(status_code=404, detail="Keyword cluster not found")

        related_articles = keyword_data.get("related_articles", [])

        source_article = db.get_full_article(article_id)
        source_ts_raw = None
        if source_article:
            source_ts_raw = source_article.get("published_at") or source_article.get("created_at")

        search_results = [
            {
                "article_id": article_id,
                "heading": keyword_data.get("source_heading") or "Source Article",
                "body": keyword_data.get("source_description") or "",
                "search_score": 1.0,
                "source_url": "cluster-source",
                "author": "Unknown",
                "category": "story-cluster",
                "published_at": source_ts_raw or "",
            }
        ]

        for item in related_articles:
            search_results.append(
                {
                    "article_id": item.get("article_id"),
                    "heading": item.get("title") or "Related Article",
                    "body": item.get("summary") or "",
                    "search_score": float(item.get("shared_keywords") or 0),
                    "source_url": "cluster-related",
                    "author": "Unknown",
                    "category": "story-cluster",
                    "published_at": item.get("created_at") or "",
                }
            )

        generator = SearchResponseGenerator()
        timeline_result = generator.generate_agentic_timeline_events(
            article_heading=keyword_data.get("source_heading") or "Story Cluster",
            search_results=search_results,
        )

        if hasattr(timeline_result, "model_dump"):
            timeline_result = timeline_result.model_dump()
        elif hasattr(timeline_result, "dict"):
            timeline_result = timeline_result.dict()

        events = timeline_result.get("events", []) if isinstance(timeline_result, dict) else []

        def _parse_dt(value: Optional[str]):
            if not value:
                return None
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except Exception:
                try:
                    return datetime.strptime(value, "%Y-%m-%d")
                except Exception:
                    try:
                        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S")
                    except Exception:
                        return None

        events_sorted = sorted(
            events,
            key=lambda event: _parse_dt(event.get("event_date")) or datetime.max,
        )

        return {
            "status": "success",
            "article_id": article_id,
            "story_label": timeline_result.get("story_label") if isinstance(timeline_result, dict) else None,
            "events": events_sorted,
            "event_count": len(events_sorted),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))