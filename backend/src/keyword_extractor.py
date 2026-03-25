"""
Keyword Extraction from Article Headings.
Extracts clean, unique keywords suitable for Postgres storage.
Uses Azure OpenAI LLM and Sentence Transformers for embeddings.
"""

import os
from typing import List
from pydantic import BaseModel, Field
from langchain.agents import create_agent
from langchain_openai import AzureChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

load_dotenv()


class ExtractedKeywords(BaseModel):
    """Structured output for keyword extraction from article headings."""
    nucleus_summary: str = Field(
        description="5-sentence summary capturing the NEW information in this article"
    )
    keywords: List[str] = Field(
        description="List of 3-7 unique, clean keywords/story arcs (no duplicates, no extra context)"
    )
    confidence_score: float = Field(
        description="Confidence score 0-1 for keyword extraction quality"
    )


class HeadingKeywordExtractor:
    """
    Extracts clean keywords from news article headings using LLM.
    Ensures keywords are suitable for Postgres UNIQUE constraint.
    Uses Azure OpenAI for LLM and Sentence Transformers for embeddings.
    """
    
    def __init__(self):
        """Initialize extractor with Azure/Gemini model; fallback to heuristic mode when unavailable."""
        self.agent = None

        azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
        azure_api_version = os.getenv("AZURE_OPENAI_API_VERSION")

        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

        try:
            if azure_api_key and azure_endpoint and azure_deployment and azure_api_version:
                model = AzureChatOpenAI(
                    azure_endpoint=azure_endpoint,
                    api_key=azure_api_key,
                    azure_deployment=azure_deployment,
                    api_version=azure_api_version,
                    temperature=0.7,
                    max_tokens=None,
                    timeout=None,
                    max_retries=2
                )
            elif gemini_api_key:
                model = ChatGoogleGenerativeAI(
                    model=gemini_model,
                    google_api_key=gemini_api_key,
                    temperature=0.7,
                )
            else:
                model = None

            if model is not None:
                self.agent = create_agent(
                    model=model,
                    response_format=ExtractedKeywords,
                )
        except Exception:
            # Keep extractor usable even if model initialization fails.
            self.agent = None

    def _fallback_extraction(self, article_heading: str, article_body: str = None) -> ExtractedKeywords:
        """Heuristic extraction used when LLM provider is unavailable/quota-exhausted."""
        text = f"{article_heading} {article_body or ''}".strip()
        tokens = [
            token.strip(".,:;!?()[]{}\"'`")
            for token in text.split()
        ]
        stopwords = {
            "the", "and", "for", "with", "from", "this", "that", "into", "over", "under",
            "about", "amid", "after", "before", "will", "have", "has", "had", "was", "were",
            "are", "is", "of", "in", "on", "to", "by", "at", "as", "an", "a", "or"
        }
        filtered = [t for t in tokens if len(t) > 2 and t.lower() not in stopwords]

        phrases = []
        for i in range(len(filtered) - 1):
            phrase = f"{filtered[i]} {filtered[i + 1]}"
            if phrase not in phrases:
                phrases.append(phrase)
            if len(phrases) >= 5:
                break

        if not phrases and article_heading:
            phrases = [article_heading[:40].strip()]

        nucleus = (
            (article_body or "").strip()[:350]
            or article_heading.strip()[:200]
            or "Summary unavailable"
        )

        return ExtractedKeywords(
            nucleus_summary=nucleus,
            keywords=phrases[:5],
            confidence_score=0.35
        )
    
    def extract_keywords_from_heading(
        self,
        article_heading: str,
        article_body: str = None
    ) -> ExtractedKeywords:
        """
        Extract keywords from article heading and optional body.
        Keywords are clean and ready for database storage.
        
        Args:
            article_heading: The article heading/title
            article_body: Optional article body for context
        
        Returns:
            ExtractedKeywords: nucleus_summary and list of clean keywords
        """
        
        body_context = f"\n\nARTICLE BODY:\n{article_body}" if article_body else ""
        
        extraction_prompt = f"""You are a news keyword extraction expert. Your job is to:

1. Read the article heading and optional body
2. EXTRACT the "nucleus" - what is NEW and UNIQUE in this story (5 sentences max)
3. IDENTIFY story arcs (recurring themes across days/weeks) like:
   - "Union Budget 2026"
   - "RBI Rate Hike"
   - "Tech IPO Wave"
   - "Kashmir Tensions"
   - "Cricket World Cup"

RULES FOR KEYWORDS:
✓ 3-7 keywords maximum per article
✓ Each keyword is 2-4 words maximum (e.g., "Budget 2026", NOT "The Union Budget of India 2026")
✓ NO duplicates in your list
✓ NO generic terms like "News", "Report", "Statement"
✓ NO proper names ONLY - must include context (e.g., "Modi's Budget Policy" not just "Modi")
✓ Suitable for a database UNIQUE constraint (capital-sensitive, exact match)
✓ CAN contain numbers: "Budget 2026", "Q4 Earnings", "5G Rollout"

EXAMPLE:
Heading: "RBI raises repo rate by 50 bps amid inflation concerns"
Keywords: ["RBI Rate Hike", "Monetary Policy", "Inflation 2026"]

Heading: "Indian startups secure $5B in Q3 funding despite market slowdown"
Keywords: ["Startup Funding Wave", "Q3 Tech IPO", "Market Slowdown"]

Now extract from this article:

HEADING: {article_heading}
This is the article body for additional context (use only for neucleus summary):
{body_context}

Return ONLY best clean keywords that are unique to this story arc, and a 5-sentence nucleus summary."""

        try:
            if self.agent is None:
                return self._fallback_extraction(article_heading, article_body)

            result = self.agent.invoke({
                "messages": [
                    {"role": "user", "content": extraction_prompt}
                ]
            })
            
            keywords_obj = result["structured_response"]
            
            # Clean keywords: strip whitespace, remove empty strings
            cleaned_keywords = [k.strip() for k in keywords_obj.keywords if k.strip()]
            keywords_obj.keywords = cleaned_keywords
            
            return keywords_obj
            
        except Exception as e:
            # If provider fails (e.g., quota/config), keep pipeline functional.
            return self._fallback_extraction(article_heading, article_body)
    
    def extract_batch(
        self,
        articles: List[dict]
    ) -> List[ExtractedKeywords]:
        """
        Extract keywords from multiple articles.
        
        Args:
            articles: List of dicts with 'heading' and optional 'body' keys
        
        Returns:
            List of ExtractedKeywords objects
        """
        results = []
        for article in articles:
            result = self.extract_keywords_from_heading(
                article_heading=article["heading"],
                article_body=article.get("body", None)
            )
            results.append(result)
        return results


if __name__ == "__main__":
    # Example usage
    extractor = HeadingKeywordExtractor()
    
    sample_heading = "Union Budget 2026: Income tax relief for middle class, hike for super-rich"
    sample_body = """
    Finance Minister presents landmark budget with focus on tax relief and infrastructure.
    Middle class taxpayers to see 5% reduction in tax slabs. Super-wealthy face new 45% bracket.
    Infrastructure spending to increase by 20% with focus on rural development.
    """
    
    print("🔍 Extracting keywords from heading...\n")
    result = extractor.extract_keywords_from_heading(
        article_heading=sample_heading,
        article_body=sample_body
    )
    
    print(f"✅ Nucleus Summary:\n{result.nucleus_summary}\n")
    print(f"📌 Keywords: {result.keywords}\n")
    print(f"📊 Confidence: {result.confidence_score}\n")
