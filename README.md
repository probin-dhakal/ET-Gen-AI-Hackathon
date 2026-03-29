# ET Gen-AI NewsNavigator

> **AI-Powered Personalized News Intelligence Platform**  
> Making news discovery intelligent, multi-lingual, and insightful.

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
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-azure-resource.openai.azure.com/
AZURE_OPENAI_API_VERSION=2024-08-01-preview
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-5.4-nano

# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/et_news
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=40

# Vector Store Configuration
VECTOR_STORE_PATH=db/news_navigator_vectors
SENTENCE_TRANSFORMER_MODEL=all-MiniLM-L6-v2
ENABLE_VECTOR_INDEXING=true

# Azure Services
AZURE_SPEECH_KEY=your_azure_speech_api_key_here
AZURE_SPEECH_REGION=your_azure_speech_region_here

# External APIs
PEXELS_API_KEY=your_pexels_api_key_here

# Cloudflare Configuration (Optional)
CF_ACCOUNT_ID=your_cloudflare_account_id_here
CF_API_TOKEN=your_cloudflare_api_token_here

# Feature Flags
ENABLE_VIDEO_GENERATION=true
ENABLE_TRANSLATION=true

# Performance Settings
REQUEST_TIMEOUT_SECONDS=30
LLM_TIMEOUT_SECONDS=30
CACHE_TTL_SECONDS=3600
MAX_CONCURRENT_REQUESTS=10000


# Services URLs
REMOTION_SERVER_URL=http://localhost:3000


```

#### Frontend (.env)

```bash
VITE_API_URL=http://localhost:8000
VITE_PEXELS_API_KEY=your-pexels-key
```

## AI Agents & Intelligent Engines

The **Neural Ninjas** architecture uses a multi-agent orchestration layer to transform static news into continuous business intelligence.

---

### Overview

Our system redefines how users consume news by leveraging AI agents that:
- Personalize content
- Build contextual narratives
- Provide expert-level insights
- Generate multimedia outputs
- Enable multilingual accessibility

---

### 1. Personalization Engine

Shifts from a broadcasting model to an individual-centric relevance engine.

#### Components

- **Persona Matcher**
  - Uses user profile data to filter out irrelevant articles  
  - Reduces information overload  

- **Relevance Ranker**
  - Prioritizes high-impact news  
  - Example: Policy changes for founders > generic headlines  

- **Article Fetcher**
  - Automates content discovery  
  - Eliminates manual search friction  

---

### 2. Unified Story Arc Engine

Solves contextual blindness by converting fragmented news into a continuous narrative.

#### Components

- **Timeline Agent**
  - Detects events automatically  
  - Creates a chronological “story spine”  

- **Story Intelligence Agent**
  - Analyzes sentiment and narrative shifts  
  - Tracks how public perception evolves over time  

- **Prediction Engine**
  - Forecasts potential future developments  
  - Based on historical patterns and trends  

---

### 3. News Navigator (Grounded AI Expert)

An in-thread AI expert providing context-aware explanations.

#### Components

- **Synthesis Agent**
  - Uses FAISS Vector Database  
  - Combines current news with historical context  

- **Fact-Grounded Chatbot**
  - Provides precise, reliable answers  
  - Anchored in retrieved data  

---

### 4. AI News Video Studio

A Video-as-Code system for rapid content generation.

#### Components

- **LLM Scene Generator**
  - Converts articles into structured 5-scene scripts  

- **Visual Generation Agent**
  - Generates AI visuals per scene  
  - Uses Cloudflare integrations  

- **Narration Agent**
  - Produces professional voiceovers  
  - Powered by Azure Text-to-Speech  

---

### 5. Vernacular Business News Engine

Enables context-aware transcreation, not just translation.

#### Components

- **Context-Aware Processor**
  - Analyzes heading, body, and summary together  
  - Ensures accurate understanding before translation  

- **Prompt Tuning Agent**
  - Injects local business language and idioms  
  - Preserves financial terminology (e.g., Bull Market)  

---

### Key Highlights

- Multi-agent architecture for modular scalability  
- Context-driven intelligence instead of raw news feeds  
- Highly personalized user experience  
- Automated multimedia generation  
- Multilingual, culturally aware delivery  

---





## Architecture Highlights

### Tech Stack

- **Frontend**: React, React Router, Zustand, Tailwind CSS
- **Backend**: FastAPI (Python), SQLite, FAISS vector DB
- **AI/ML**: GPT-5.4-Nano, LangChain, LangGraph
- **Services**: Remotion.js (video), Pexels API (images)


### Performance

- **Search Latency**: <200ms (semantic) vs 500ms (traditional)
- **API Response**: <500ms for personalized feeds
- **Video Generation**: 45-60 seconds per article

---



## Project Stats

![Lines of Code](https://img.shields.io/badge/Lines%20of%20Code-50K%2B-blue)
![Files](https://img.shields.io/badge/Files-200%2B-blue)
![Test Coverage](https://img.shields.io/badge/Coverage-85%25-brightgreen)
![API Endpoints](https://img.shields.io/badge/API%20Endpoints-25%2B-blue)
![Languages Supported](https://img.shields.io/badge/Languages-6-blue)

---

<div align="center">

**Made with ❤️ by the Neural Ninjas**

</div>
