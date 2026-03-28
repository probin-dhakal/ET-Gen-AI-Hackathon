# ET Gen-AI NewsNavigator - System Architecture Document

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Communication](#component-communication)
4. [Agent Roles & Responsibilities](#agent-roles--responsibilities)
5. [Tool Integrations](#tool-integrations)
6. [Error Handling & Resilience](#error-handling--resilience)
7. [Data Flow](#data-flow)
8. [API Endpoints](#api-endpoints)

---

## System Overview

**ET Gen-AI NewsNavigator** is a modern, AI-powered news platform that delivers personalized, multi-language news experiences with intelligent insights. The system processes 2000+ articles using semantic understanding, LLM agents, and vector embeddings to provide users with:

- **Personalized feeds** based on user personas
- **Semantic search** across article collections
- **AI-generated video summaries** of articles
- **Story arc analysis** with sentiment tracking
- **Multi-language translation** (6 Indian languages)
- **Intelligent Q&A** on article content

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                USER LAYER                                    │
├──────────────────────────────────────────────────────────────────────────────┤
│  Web Browser (React)  │  Mobile App (Future)  │  API Clients                │
└────────────────┬──────────────────────────┬──────────────────────────────────┘
                 │                          │
                 └──────────────┬───────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY LAYER (FastAPI)                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │  CORS Middleware  │  Rate Limiting  │  Request Validation           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└────────────────────┬────────────────────────────────────────────────────────┘
                     │
        ┌────────────┼────────────┬──────────────────┐
        ▼            ▼            ▼                  ▼
┌──────────────┐ ┌──────────────┐ ┌───────────────┐ ┌─────────────────┐
│  ARTICLE     │ │   SEARCH     │ │   TRANSLATION │ │   VIDEO GEN     │
│  MANAGER     │ │   ENGINE     │ │   SERVICE     │ │   SERVICE       │
│              │ │              │ │               │ │                 │
│ • Add        │ │ • Semantic   │ │ • Gemini API  │ │ • Remotion.js   │
│ • Process    │ │ • Keyword    │ │ • Multi-lang  │ │ • MP4 output    │
│ • Fetch      │ │ • Vector DB  │ │ • Cache       │ │ • Background    │
└────┬─────────┘ └────┬─────────┘ └───┬───────────┘ │   music         │
     │                │                │            └─────────────────┘
     │                └────────┬────────┘
     │                         │
     └────────────┬────────────┘
                  ▼
     ┌────────────────────────────────────┐
     │   AGENT ORCHESTRATION LAYER        │
     │   (LangChain + LangGraph)          │
     │                                    │
     │  ┌────────────────────────────┐   │
     │  │   Router Agent             │   │
     │  │   (Route queries)          │   │
     │  └────────────┬───────────────┘   │
     │               │                   │
     │  ┌────────────┴──────────┬────────┐
     │  ▼                       ▼        │
     │ ┌────────────┐    ┌─────────────┐│
     │ │ Search     │    │Intelligence ││
     │ │ Agent      │    │ Agent       ││
     │ │(Semantic)  │    │(Analysis)   ││
     │ └────────────┘    └─────────────┘│
     │       │                 │        │
     │       └────────┬────────┘        │
     │                ▼                 │
     │      ┌──────────────────────┐   │
     │      │ Response Generator   │   │
     │      │ (Formatting, Refs)   │   │
     │      └──────────────────────┘   │
     └────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        ▼             ▼             ▼
    ┌────────┐   ┌────────┐   ┌─────────────┐
    │Database│   │Vector  │   │External APIs│
    │(PG)    │   │Store   │   │             │
    │        │   │(FAISS) │   │ • Gemini    │
    │Articles│   │        │   │ • Pexels    │
    │Keywords│   │Embeds  │   │ • Remotion  │
    │Transla │   │        │   │   (video)   │
    └────────┘   └────────┘   └─────────────┘
```

---

## Component Communication

### 1. **Frontend → Backend Communication**

```
┌─────────────────┐
│   React App     │
│  (Zustand      │
│   State)        │
└────────┬────────┘
         │
         │ HTTP/REST (axios)
         │
         ▼
┌─────────────────────────────────────┐
│  FastAPI Backend                    │
│  - CORS enabled for localhost:5173  │
│  - JSON request/response            │
│  - Async endpoints                  │
└──────────┬──────────────────────────┘
           │
           │ (Returns JSON)
           ▼
┌─────────────────┐
│   React UI      │
│  (Component    │
│   render)       │
└─────────────────┘
```

**Key Endpoints Used by Frontend:**

- `GET /api/articles/latest` - Top news feed
- `GET /api/feed/personalized/{persona_id}` - Personalized news
- `GET /api/articles/search/{query}` - Semantic search
- `GET /api/articles/category/{category}` - Category-based articles
- `POST /api/search` - Advanced search with AI ranking
- `GET /api/translations/{article_id}/{language}` - Multi-language content
- `POST /generate-video` - Video generation request
- `GET /api/keywords/trending` - Trending keywords

### 2. **Backend → Database Communication**

```
FastAPI Handler
       │
       │ (SQL Queries)
       ▼
┌─────────────────────────────┐
│  SQLAlchemy ORM             │
│  - Connection pooling       │
│  - Query optimization       │
└──────────┬──────────────────┘
           │
           ▼
┌─────────────────────────────┐
│  PostgreSQL Database        │
│  - articles table           │
│  - keywords table           │
│  - article_keywords table   │
│  - translations table       │
└─────────────────────────────┘
```

### 3. **Backend → Vector Store Communication**

```
FastAPI Handler
       │
       │ (Article text)
       ▼
┌──────────────────────────┐
│  Embedding Generation    │
│  (Gemini embedding-001)  │
└──────────┬───────────────┘
           │
           ▼ (Embedding vector)
┌──────────────────────────┐
│  FAISS Index             │
│  - Semantic search       │
│  - Similarity matching   │
│  - k-NN queries          │
└──────────────────────────┘
```

### 4. **Backend → LLM Communication**

```
FastAPI Handler / Agent
       │
       │ (Prompt + context)
       ▼
┌────────────────────────────┐
│  LangChain / LangGraph     │
│  - Agent orchestration     │
│  - Tool calling            │
│  - Prompt engineering      │
└──────────┬─────────────────┘
           │
           ▼
┌────────────────────────────┐
│  Google GenAI (Gemini)     │
│  - generate() for LLM      │
│  - embedContent() for vec  │
│  - Multi-turn conversations│
└────────────────────────────┘
```

---

## Agent Roles & Responsibilities

### 4-Tier Agent System

#### **Tier 1: Router Agent**

**Role:** Query classification and routing  
**Responsibilities:**

- Classify user query intent (search, Q&A, video request, translation)
- Extract entities (article ID, persona, language, keywords)
- Route to appropriate specialized agent
- Handle error cases and fallbacks

**Example Flow:**

```
User Input: "Show me startup news about AI funding"
    │
    ▼
Router Agent
    │
    ├─ Classification: "Search + Personalization"
    ├─ Entity Extraction: {query: "AI funding", persona: "startup_founder"}
    │
    ▼
Route to: Search Agent + Filter by startup persona
```

---

#### **Tier 2: Search Agent**

**Role:** Information retrieval and ranking  
**Responsibilities:**

- Execute semantic search using vector embeddings
- Perform keyword-based filtering
- Apply persona-based re-ranking
- Handle pagination and result limits
- Manage cache for frequent queries

**Algorithm:**

```python
1. Embed user query → embedding_vector
2. Query FAISS index with embedding_vector → top_k results (k=100)
3. Apply persona filters → (persona_interests, recent_categories)
4. Re-rank by relevance score + recency + persona_fit
5. Return top results with pagination
```

**Cache Strategy:**

- TTL: 1 hour for trending searches
- LRU eviction when size > 10K items
- Hits on seasonal queries (e.g., "budget", "election")

---

#### **Tier 3: Intelligence Agent**

**Role:** Deep analysis and insights  
**Responsibilities:**

- Story arc generation (timeline of related articles)
- Sentiment shift analysis across time
- Contrarian perspective identification
- Prediction generation (what to watch next)
- Context synthesis from multiple sources

**Tools Used:**

- Vector search (find related articles)
- LLM analysis (sentiment, implications)
- Time-series analysis (trends)
- Keyword extraction (themes)

**Story Arc Generation Process:**

```
Input: {article_id, article_text}
    │
    ├─ Extract keywords → {finance, startup, funding, AI}
    ├─ Vector search (keywords) → related_articles
    ├─ Sort by date → timeline
    ├─ Analyze sentiment per article → sentiment_shifts
    ├─ Identify turning points → "Now" vs "Predicted"
    │
    ▼
Output: {
    timeline: [{date, article, sentiment, implications}],
    now: "Current mainstream narrative",
    predicted: "Expected development within 30 days"
}
```

---

#### **Tier 4: Response Generator**

**Role:** Format and deliver insights  
**Responsibilities:**

- Format responses (JSON, markdown, plain text)
- Add citations with article references
- Support multi-language output
- Generate summaries with key points
- Handle streaming responses for long content

**Key Outputs:**

- Search results (articles + snippets)
- Deeper dive answers with citations
- Translated content in 6 languages
- Video generation triggers
- Story arc narratives

---

## Tool Integrations

### Core Tools

| Tool                      | Purpose                            | Integration              | Error Handling                     |
| ------------------------- | ---------------------------------- | ------------------------ | ---------------------------------- |
| **Google Gemini 1.5 Pro** | LLM backbone, generation, analysis | `langchain-google-genai` | Retry (3x), timeout 30s → fallback |
| **FAISS Vector DB**       | Semantic search, embeddings        | In-memory (CPU)          | Fallback to keyword search         |
| **PostgreSQL**            | Article/metadata storage           | SQLAlchemy ORM           | Connection retry, cached fallback  |
| **Pexels API**            | Article images                     | Direct HTTP calls        | Use placeholder image on failure   |
| **Remotion.js**           | Video generation                   | Separate Node.js service | Retry, queue management            |
| **Google Translate API**  | Multi-language support             | langchain wrapper        | Fallback to pre-translated content |

### Tool Calling Pattern (LangGraph)

```python
@tool
def semantic_search(query: str, k: int = 5) -> List[Article]:
    """Search articles using semantic similarity"""
    embeddings = embed(query)
    results = faiss_index.search(embeddings, k)
    return format_results(results)

@tool
def analyze_sentiment(text: str) -> Dict:
    """Analyze sentiment using LLM"""
    prompt = f"Analyze sentiment of: {text}"
    response = llm.generate(prompt)
    return parse_sentiment(response)

@tool
def extract_keywords(text: str) -> List[str]:
    """Extract keywords using LLM"""
    prompt = f"Extract key topics from: {text}"
    keywords = llm.generate(prompt)
    return parse_keywords(keywords)

# Agent executes tools in sequence or in parallel
agent = create_tool_calling_agent(tools=[
    semantic_search,
    analyze_sentiment,
    extract_keywords
])
```

---

## Error Handling & Resilience

### 1. **LLM Timeout & Rate Limiting**

```python
class ResilientLLMClient:
    def generate(self, prompt: str, max_retries: int = 3) -> str:
        for attempt in range(max_retries):
            try:
                response = llm.generate_content(
                    prompt,
                    generation_config=genai.types.GenerationConfig(
                        temperature=0.7,
                        max_output_tokens=1000
                    ),
                    timeout=30  # 30 second timeout
                )
                return response.text
            except TimeoutError:
                if attempt == 0:
                    # Retry with longer timeout
                    continue
                elif attempt == 1:
                    # Try with cache
                    cached = self.cache.get(hash(prompt))
                    if cached:
                        return cached
                    continue
                else:
                    # Fallback response
                    return "Analysis unavailable. Please try again."
            except RateLimitError:
                # Exponential backoff
                wait_time = 2 ** attempt
                sleep(wait_time)
                continue
```

### 2. **Database Connection Resilience**

```python
class ResilientDatabaseManager:
    def __init__(self):
        self.engine = create_engine(
            DATABASE_URL,
            pool_size=20,
            max_overflow=40,
            pool_pre_ping=True,  # Verify connection before use
            pool_recycle=3600,   # Recycle connections every hour
            connect_args={"connect_timeout": 5}
        )

    def execute_with_retry(self, query_func, max_retries=3):
        for attempt in range(max_retries):
            try:
                return query_func()
            except OperationalError as e:
                if attempt < max_retries - 1:
                    sleep(2 ** attempt)  # Exponential backoff
                    continue
                else:
                    # Return cached or fallback data
                    return self.get_cached_results()
```

### 3. **Vector Store Fallback**

```python
class ResilientVectorSearch:
    def search(self, query: str, k: int = 5):
        try:
            # Attempt semantic search
            embeddings = self.embed_query(query)
            vector_results = self.faiss_index.search(embeddings, k)
            return vector_results
        except Exception as e:
            logger.warning(f"Vector search failed: {e}, falling back to keyword search")
            # Fallback to keyword-based search
            return self.keyword_search(query, k)
```

### 4. **Circuit Breaker Pattern**

```python
from pybreaker import CircuitBreaker

video_breaker = CircuitBreaker(
    fail_max=5,           # Open circuit after 5 failures
    reset_timeout=60,     # Try to recover after 60 seconds
    listeners=[...],
    name="video_generation"
)

@video_breaker
def generate_video(article_text: str) -> str:
    response = requests.post(
        "http://localhost:3000/api/render",
        json={"text": article_text},
        timeout=120
    )
    return response.json()["videoUrl"]
```

### 5. **Request-Level Error Handling**

```python
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Catch all exceptions and return appropriate error responses"""
    logger.error(f"Unhandled exception: {exc}")

    error_mapping = {
        TimeoutError: (503, "Service temporarily unavailable"),
        RateLimitError: (429, "Too many requests"),
        ValidationError: (400, "Invalid input"),
        NotFoundError: (404, "Resource not found")
    }

    status_code, message = error_mapping.get(type(exc), (500, "Internal server error"))
    return JSONResponse(
        status_code=status_code,
        content={
            "error": message,
            "request_id": request.headers.get("X-Request-ID"),
            "timestamp": datetime.utcnow().isoformat()
        }
    )
```

### 6. **Health Checks & Monitoring**

```python
@app.get("/api/health")
async def health_check():
    """Detailed health check with component status"""
    checks = {
        "database": check_database(),
        "vector_store": check_faiss(),
        "llm_service": check_gemini_api(),
        "cache": check_redis(),
        "video_service": check_remotion()
    }

    overall_status = "healthy" if all(checks.values()) else "degraded"

    return {
        "status": overall_status,
        "timestamp": datetime.utcnow().isoformat(),
        "components": checks
    }
```

---

## Data Flow

### End-to-End: User Personalized Feed Request

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER REQUEST                                         │
│ GET /api/feed/personalized/startup_founder             │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 2. ROUTER AGENT                                         │
│ - Validate persona_id                                   │
│ - Extract: persona="startup_founder"                    │
│ - Route to: Search Agent                                │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 3. SEARCH AGENT                                         │
│ - Query keywords from startup persona:                  │
│   {VC, SaaS, Competitors, Funding, Ecosystem}          │
│ - Vector search: embed(keywords) → FAISS search        │
│ - Get top 100 results                                   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 4. RESULT FILTERING & RE-RANKING                        │
│ - Filter by: recent (24h), relevant categories         │
│ - Score by: relevance, recency, engagement (views)     │
│ - Take top 50 articles                                  │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 5. DATA ENRICHMENT                                      │
│ - Fetch article thumbnails from Pexels                 │
│ - Compute engagement scores                             │
│ - Get related keyword tags                              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 6. RESPONSE FORMATTING                                  │
│ - Response Generator formats:                           │
│   {articles: [...], persona: {...}, timestamp: ...}    │
│ - Add metadata: total_count, next_page_token           │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 7. CLIENT RECEIVES                                      │
│ HTTP 200 JSON with personalized feed                    │
└─────────────────────────────────────────────────────────┘
```

### End-to-End: Deeper Dive Q&A Request

```
┌─────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                           │
│ POST /api/search                                        │
│ {article_id: "123", question: "What are the risks?"}   │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 2. ROUTER AGENT                                         │
│ - Classify: "Q&A on specific article"                   │
│ - Extract: {article_id, question}                       │
│ - Route to: Intelligence Agent                          │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 3. FETCH ARTICLE CONTEXT                                │
│ - Query DB: SELECT * FROM articles WHERE id='123'      │
│ - Load full text, metadata, keywords                    │
│ - Get related articles via vector search                │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 4. INTELLIGENCE AGENT (LLM Prompt)                      │
│ Prompt Template:                                        │
│ "You are a financial news expert.                       │
│  Article: {article_text}                                │
│  Related context: {related_articles}                    │
│  User Question: {question}                              │
│  Provide answer with specific citations."              │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 5. LLM GENERATION (Gemini)                              │
│ - Generate answer with citations                        │
│ - Extract referenced sources                            │
│ - Format response with markdown                         │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 6. RESPONSE FORMATTING                                  │
│ - Add related articles                                  │
│ - Add source citations                                  │
│ - Format for UI rendering                               │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│ 7. CLIENT RESPONSE                                      │
│ {answer: "...", citations: [...], related: [...]}      │
└─────────────────────────────────────────────────────────┘
```

---

## API Endpoints

### Core Endpoints

#### **Articles**

- `GET /api/articles/latest?limit=50&offset=0` - Latest articles
- `GET /api/articles/{article_id}` - Article details
- `POST /api/articles/add` - Add single article
- `POST /api/articles/add-and-process` - Add + process with AI

#### **Search & Discovery**

- `GET /api/feed/latest` - Global latest feed
- `GET /api/feed/personalized/{persona_id}` - Personalized feed
- `GET /api/articles/search/{query}` - Keyword search
- `POST /api/search` - Advanced search with AI ranking
- `GET /api/articles/category/{category}` - By category

#### **Translation**

- `GET /api/translations/{article_id}/{language}` - Translated content
- Supported: English, Hindi, Tamil, Telugu, Bengali, Assamese

#### **Video Generation**

- `POST /generate-video` - Generate 60-sec video brief

#### **Keywords & Trends**

- `GET /api/keywords/trending` - Trending keywords
- `GET /api/keywords` - All keywords
- `GET /api/keywords/{keyword_id}/articles` - Articles by keyword

#### **Story Intelligence**

- `GET /api/story-arc/{article_id}` - Story arc analysis
- `GET /api/sentiment-shifts/{keyword}` - Sentiment tracking

#### **System**

- `GET /api/health` - Health check
- `GET /api/personas` - Available personas

---

## Assumptions & Constraints

| Item                  | Assumption               | Impact                         |
| --------------------- | ------------------------ | ------------------------------ |
| **Article Volume**    | ~500 new articles/day    | Cache invalidation hourly      |
| **Concurrent Users**  | Max 10K concurrent       | Connection pooling (20)        |
| **Response Time SLA** | <500ms for API responses | Timeout: 30s for heavy ops     |
| **LLM Cost**          | ~$0.05 per request       | Caching & batch processing     |
| **Vector Index Size** | 2000-5000 articles       | In-memory FAISS (CPU)          |
| **Database Size**     | ~50GB annual growth      | Partitioning after 1M articles |

---

## Future Enhancements

1. **Real-time Updates** - WebSocket support for live news feeds
2. **ML-based Personalization** - Collaborative filtering beyond personas
3. **Multi-modal Search** - Image/video search support
4. **GraphQL API** - Flexible query language
5. **Distributed Caching** - Redis for multi-instance deployments
6. **Advanced Analytics** - User behavior tracking & dashboards
7. **A/B Testing Framework** - Feature rollout & validation
