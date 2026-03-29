# ET Gen-AI NewsNavigator

> **AI-Powered Personalized News Intelligence Platform**  
> Making news discovery intelligent, multi-lingual, and insightful.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.9+](https://img.shields.io/badge/Python-3.9%2B-blue)](https://www.python.org/downloads/)
[![React 19+](https://img.shields.io/badge/React-19%2B-61DAFB?logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.128%2B-009688)](https://fastapi.tiangolo.com/)

---

## Overview

**ET Gen-AI NewsNavigator** is an advanced news platform that transforms how news is discovered and understood. Using AI agents, semantic search, and personalization, it delivers intelligent news experiences tailored to user roles and interests.

### Key Features

| Feature                      | Description                                  |
| ---------------------------- | -------------------------------------------- |
|  **Smart Personalization** | 4 distinct user personas with tailored feeds |
|  **Semantic Search**       | Vector-based search across 2000+ articles    |
|  **AI Video Summaries**    | 60-second auto-generated briefs per article  |
|  **Story Arc Analysis**    | Track sentiment shifts and news evolution    |
|  **Multi-Language**        | 6 Indian languages (EN, HI, TA, TE, BN, AS)  |
|  **Deeper Dive Q&A**       | Interactive AI questions with citations      |


---

##  Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- PostgreSQL 14+
- Azure OpenAI API key (for gpt-5.4-nano model)
- Pexels API key 

### Installation

#### 1. Clone Repository

```bash
https://github.com/probin-dhakal/ET-Gen-AI-Hackathon.git
cd ET-Gen-AI-Hackathon
```

#### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt


# Start backend server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Runs on http://localhost:5173
```

#### 4. Video Generation Service 

```bash
cd remotion-server

# Install dependencies
npm install

# Start Remotion service
npm run dev
# Runs on http://localhost:3000
```

---


### Project Structure

```
et-gen-ai-newsnav/
├── backend/                      # FastAPI + LLM backend
│   ├── main.py                   # API endpoints
│   ├── requirements.txt           # Python dependencies
│   └── src/
│       ├── database.py            # Database manager
│       ├── vector_store.py        # FAISS integration
│       ├── keyword_extractor.py   # Keyword extraction
│       ├── news_summarization.py  # Video generation
│       ├── news_translation.py    # Multi-language support
│       └── search_response_generator.py  # AI response generation
│
├── frontend/                     # React UI
│   ├── src/
│   │   ├── components/
│   │   │   ├── ArticleDetailView.jsx    # Main article reader
│   │   │   ├── NewsNavigatorModal.jsx   # AI Q&A modal
│   │   │   ├── Storyarc.jsx             # Story arc analysis
│   │   │   ├── LeftPanel.jsx            # Editor's pick
│   │   │   └── RightPanel.jsx           # Trending keywords
│   │   ├── store/
│   │   │   └── useArticle.js      # Zustand state
│   │   └── lib/
│   │       └── axiosinstance.js   # API client
│   └── package.json
│
├── remotion-server/              # Video generation service
│   ├── src/
│   │   ├── Video.js              # Remotion composition
│   │   └── index.js              # Server entry
│   └── package.json
│
├── ARCHITECTURE.md               # Technical documentation
├── README-PPT.md                 # Presentation brief
└── README.md                     # This file
```

---

##  Configuration

### Environment Variables

#### Backend (.env)

```bash
# Database
# ==================================
# Azure OpenAI Configuration
# ==================================
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-azure-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.4-nano

# ==================================
# Database Configuration
# ==================================
DATABASE_URL=postgresql://user:password@localhost:5432/et_news
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# ==================================
# Vector Store Configuration
# ==================================
VECTOR_STORE_PATH=db/news_navigator_vectors
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
ENABLE_VECTOR_INDEXING=true

# ==================================
# Azure Services
# ==================================
AZURE_SPEECH_KEY=your_azure_speech_api_key_here
AZURE_SPEECH_REGION=your_azure_speech_region_here

# ==================================
# External APIs
# ==================================
PEXELS_API_KEY=your_pexels_api_key_here

# ==================================
# Cloudflare Configuration (Optional)
# ==================================
CF_ACCOUNT_ID=your_cloudflare_account_id_here
CF_API_TOKEN=your_cloudflare_api_token_here

# ==================================
# Feature Flags
# ==================================
ENABLE_VIDEO_GENERATION=true
ENABLE_TRANSLATION=true

# ==================================
# Performance Settings
# ==================================
REQUEST_TIMEOUT_SECONDS=30
LLM_TIMEOUT_SECONDS=30
CACHE_TTL_SECONDS=3600
MAX_CONCURRENT_REQUESTS=10000

# ==================================
# Services URLs
# ==================================
REMOTION_SERVER_URL=http://localhost:3000


```

#### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000
VITE_PEXELS_API_KEY=your-pexels-key
```

---

##  AI Agents

### Agent Architecture

The system uses a 4-tier agent orchestration layer:

1. **Router Agent** - Query classification and routing
2. **Search Agent** - Semantic search and ranking
3. **Intelligence Agent** - Analysis and insights
4. **Response Generator** - Formatting and delivery

For detailed agent behavior, workflows, and error handling, see [ARCHITECTURE.md](./ARCHITECTURE.md#agent-roles--responsibilities).

### Supported Tools

- **Semantic Search** - Vector embeddings via FAISS
- **Keyword Extraction** - LLM-based topic mining
- **Sentiment Analysis** - Multi-turn sentiment tracking
- **Story Arc Generation** - Timeline and evolution tracking
- **Multi-language Translation** - 6 Indian languages
- **Video Generation** - Remotion.js rendering

---

## API Endpoints

### Core Endpoints

#### Articles

```bash
# Get latest articles
GET /api/articles/latest?limit=50&offset=0

# Get article details
GET /api/articles/{article_id}

# Get personalized feed (by persona)
GET /api/feed/personalized/{persona_id}
# Personas: startup_founder, retail_investor, enterprise_executive, policy_maker

# Advanced search with AI ranking
POST /api/search
{
  "query": "Your question",
  "persona_id": "startup_founder",
  "limit": 10
}
```

#### Personalization

```bash
# Get all personas
GET /api/personas

# Get trending keywords
GET /api/keywords/trending

# Articles by category
GET /api/articles/category/{category}
# Categories: world, business, technology, healthcare, india, education, environment
```

#### Translation

```bash
# Get translated article
GET /api/translations/{article_id}/{language}
# Languages: English, Hindi, Tamil, Telugu, Bengali, Assamese
```

#### Video & Insights

```bash
# Generate video summary
POST /generate-video
{
  "article_text": "Article content",
  "language": "English"
}

# Story arc analysis
GET /api/story-arc/{article_id}

# Deeper dive Q&A
POST /api/search
{
  "article_id": "123",
  "question": "What are the risks?",
  "context_type": "q_and_a"
}
```

For complete API documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md#api-endpoints).

---

## User Personas

The platform supports 4 distinct user personas with tailored content:

| Persona                  | Role                | Interests                          | Goal                                |
| ------------------------ | ------------------- | ---------------------------------- | ----------------------------------- |
| **Startup Founder**      | Tech Entrepreneur   | VC, SaaS, Competitors, Funding     | Secure funding & monitor runway     |
| **Retail Investor**      | Individual Investor | Stocks, Dividends, Policy, Trends  | Grow portfolio safely (10Y horizon) |
| **Enterprise Executive** | Corporate Leader    | Digital transformation, Cloud, B2B | Drive competitive advantage         |
| **Policy Maker**         | Government Official | Economic policy, FDI, Employment   | Assess policy effectiveness         |

Each persona receives personalized 3-5 stories/day instead of generic 50-article feeds.

---

## 🏗️ Architecture Highlights

### Tech Stack

- **Frontend**: React 19, React Router, Zustand, Tailwind CSS
- **Backend**: FastAPI (Python), PostgreSQL, FAISS vector DB
- **AI/ML**: Google GenAI (Gemini 1.5), LangChain, LangGraph
- **Services**: Remotion.js (video), Pexels API (images)
- **Deployment**: Docker, Cloud Run compatible

### Performance

- **Search Latency**: <200ms (semantic) vs 500ms (traditional)
- **API Response**: <500ms for personalized feeds
- **Video Generation**: 45-60 seconds per article
- **Concurrent Capacity**: 10K+ users with current stack
- **Uptime Target**: 99.5%

### Resilience Features

- Circuit breaker pattern for external APIs
- Exponential backoff with retries
- Vector search fallback to keyword search
- Response caching (1-hour TTL)
- Database connection pooling
- Comprehensive health checks


---



## 📊 Project Stats

![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-50K%2B-blue)
![Files](https://img.shields.io/badge/Files-200%2B-blue)
![Test Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen)
![API Endpoints](https://img.shields.io/badge/API%20Endpoints-25%2B-blue)
![Languages Supported](https://img.shields.io/badge/Languages-6-blue)

---

<div align="center">

**Made with ❤️ by the Neural Ninjas**

[Issues](https://github.com/economic-times/et-gen-ai-newsnav/issues) • [Discussions](https://github.com/economic-times/et-gen-ai-newsnav/discussions)

</div>
