"""
Search Response Generator using Azure OpenAI LLM.
Generates contextual responses to user search queries based on retrieved articles.
"""

import os
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from langchain.agents import create_agent
from langchain_openai import AzureChatOpenAI
from dotenv import load_dotenv

load_dotenv()


class SearchResponse(BaseModel):
    """Structured output for search query response."""
    user_query: str = Field(description="The original user query")
    response_summary: str = Field(
        description="Comprehensive response to the user query based on retrieved articles (2-3 paragraphs)"
    )
    key_insights: List[str] = Field(
        description="List of 3-5 key insights/takeaways from the search results"
    )
    confidence_score: float = Field(
        description="Confidence score 0-1 for the response quality based on available articles"
    )


class SentimentShift(BaseModel):
    """Represents a measurable sentiment change in the story arc."""
    time_window: str = Field(description="Time period when shift occurred, e.g., 'Mar 2026 Week 2'")
    sentiment: str = Field(description="Dominant sentiment in that window: positive, neutral, or negative")
    shift_direction: str = Field(description="Direction versus previous window: up, down, or flat")
    shift_driver: str = Field(description="Primary trigger that caused this shift")
    evidence_article_ids: List[int] = Field(default_factory=list, description="Article IDs supporting this shift")


class ContrarianPerspective(BaseModel):
    """Represents an alternative thesis against mainstream narrative."""
    mainstream_view: str = Field(description="Consensus interpretation from most coverage")
    contrarian_view: str = Field(description="Evidence-backed opposing interpretation")
    why_it_matters: str = Field(description="Material impact if contrarian thesis is correct")
    evidence_article_ids: List[int] = Field(default_factory=list, description="Article IDs supporting contrarian case")


class WatchNextPrediction(BaseModel):
    """Represents forward-looking signals and scenario watchlist."""
    prediction: str = Field(description="Specific, testable prediction")
    horizon: str = Field(description="Forecast horizon, e.g., '1-3 months'")
    probability: float = Field(description="Probability from 0 to 1")
    watch_signals: List[str] = Field(default_factory=list, description="Signals to monitor for confirmation")


class StoryIntelligenceResponse(BaseModel):
    """Structured output for advanced story intelligence."""
    user_query: str = Field(description="The original story intelligence query")
    sentiment_shifts: List[SentimentShift] = Field(default_factory=list, description="Timeline sentiment movement")
    contrarian_perspectives: List[ContrarianPerspective] = Field(default_factory=list, description="Non-consensus views")
    what_to_watch_next: List[WatchNextPrediction] = Field(default_factory=list, description="Predictions and watch signals")
    confidence_score: float = Field(description="Confidence score 0-1 for this intelligence output")


class SentimentShift(BaseModel):
    time: str = Field(description="Date/period for the detected shift")
    sentiment: str = Field(description="positive, neutral, or negative")
    shift_score: float = Field(description="Shift intensity between -1 and 1")
    driver: str = Field(description="Main reason for sentiment movement")
    evidence_article_ids: List[int] = Field(description="Article IDs backing this shift")


class ContrarianPerspective(BaseModel):
    mainstream_view: str = Field(description="Common narrative in most coverage")
    contrarian_view: str = Field(description="Counter-argument or minority thesis")
    why_it_matters: str = Field(description="Why the contrarian view can change interpretation")
    evidence_article_ids: List[int] = Field(description="Article IDs supporting this perspective")


class WatchPrediction(BaseModel):
    prediction: str = Field(description="Forward-looking prediction to monitor")
    horizon: str = Field(description="Time horizon, e.g. 1-3 months")
    probability: float = Field(description="Probability between 0 and 1")
    watch_signals: List[str] = Field(description="Observable signals to validate the prediction")


class StoryIntelligenceResponse(BaseModel):
    user_query: str = Field(description="The original user query")
    sentiment_shifts: List[SentimentShift] = Field(description="Timeline of sentiment movement")
    contrarian_perspectives: List[ContrarianPerspective] = Field(description="Non-consensus perspectives")
    what_to_watch_next: List[WatchPrediction] = Field(description="Forward-looking watchlist")
    confidence_score: float = Field(description="Confidence score 0-1 based on coverage quality")


class AgenticTimelineEvent(BaseModel):
    event_date: str = Field(description="Event date in YYYY-MM-DD format")
    event_type: str = Field(description="One of: catalyst, policy, market, risk, narrative")
    title: str = Field(description="Short event title")
    description: str = Field(description="What happened and why it matters")
    source_article_ids: List[int] = Field(default_factory=list, description="Supporting article ids")
    confidence: float = Field(description="Confidence 0-1 for this event")


class AgenticTimelineResponse(BaseModel):
    story_label: str = Field(description="Short label for the story arc")
    events: List[AgenticTimelineEvent] = Field(default_factory=list, description="Chronological timeline events")


class SearchResponseGenerator:
    """
    Generates intelligent responses to search queries using Azure OpenAI LLM.
    Combines semantic search results with LLM reasoning to provide contextualized answers.
    """
    
    def __init__(self):
        """Initialize the generator with Azure OpenAI model."""
        # Get Azure OpenAI configuration
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        if "AZURE_OPENAI_API_KEY" not in os.environ:
            print("⚠️ Warning: AZURE_OPENAI_API_KEY not found in environment variables. Please set it in your .env file.")
            os.environ["AZURE_OPENAI_API_KEY"] = api_key
        
        os.environ["AZURE_OPENAI_API_KEY"] = api_key
        os.environ["AZURE_OPENAI_ENDPOINT"] = os.getenv("AZURE_OPENAI_ENDPOINT")

        # Use Azure OpenAI with LangChain
        model = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            temperature=0.7,
            max_tokens=None,
            timeout=None,
            max_retries=2
        )
        self.model = model

        self.agent = create_agent(
            model=model,
            response_format=SearchResponse,
        )
        self.story_agent = create_agent(
            model=model,
            response_format=StoryIntelligenceResponse,
        )
    
    def generate_response(
        self,
        user_query: str,
        search_results: List[Dict[str, Any]]
    ) -> SearchResponse:
        """
        Generate an intelligent response to a search query based on retrieved articles.
        
        Args:
            user_query: The user's search question/query
            search_results: List of articles retrieved from semantic search containing:
                - article_id: int
                - heading: str
                - body: str (article content)
                - search_score: float (relevance score)
                - source_url: str
                - author: str (optional)
                - category: str (optional)
                - published_at: str (optional)
        
        Returns:
            SearchResponse: Structured response with summary and insights
        """
        
        # Format articles for LLM context
        articles_context = self._format_articles_for_context(search_results)
        
        generation_prompt = f"""You are a professional news reporter with expertise in investigative journalism. Your task is to synthesize multiple articles into a well-crafted news story that answers the user's query with journalistic excellence.

JOURNALISTIC FRAMEWORK - Answer the 5 Ws and H:
• WHO: Identify key people, organizations, or entities involved
• WHAT: Clearly explain what happened/is happening
• WHEN: Provide timeline and temporal context
• WHERE: Specify locations and geographical relevance
• WHY: Explain causes, motivations, and reasons
• HOW: Describe the process or mechanism

USER QUERY:
{user_query}

RETRIEVED ARTICLES:
{articles_context}

RESPONSE REQUIREMENTS:

1. RESPONSE SUMMARY (2-3 paragraphs):
   - Start with a strong lede (opening) that immediately answers the core query
   - Use the inverted pyramid structure: most important info first, supporting details follow
   - Properly attribute all claims to specific sources ("According to [source]...", "Reports indicate...")
   - Include direct quotes only when they significantly strengthen the narrative or provide key context
   - Provide temporal context and recent developments
   - Explain why this matters to the reader (news value/impact)
   - Connect to broader trends or implications when relevant

2. KEY INSIGHTS (3-5 bullet points):
   - Extract concrete facts, figures, and takeaways from articles
   - Focus on what's newsworthy and actionable
   - Each insight should be referenced/traceable to the source material
   - Highlight trends, patterns, or unexpected revelations
   - Include any controversies, conflicts, or opposing viewpoints fairly represented

3. CONFIDENCE SCORE (0-1):
   - 1.0: Multiple authoritative sources providing comprehensive coverage
   - 0.8-0.9: Good coverage from reliable sources addressing all key aspects
   - 0.6-0.7: Adequate information but may lack context or multiple perspectives
   - 0.4-0.5: Limited coverage, some gaps in information or context
   - 0.0-0.3: Insufficient or tangential information; suggest alternative search terms

PROFESSIONAL JOURNALISM STANDARDS:
✓ Accuracy: Verify all facts against source material
✓ Attribution: Always credit information to specific sources
✓ Balance & Fairness: Present multiple perspectives without bias
✓ Context: Provide background information for reader comprehension
✓ Clarity: Use clear, direct language avoiding jargon
✓ Relevance: Focus on news value and reader impact
✓ Transparency: Acknowledge gaps, limitations, or conflicting information
✓ Independence: Maintain objectivity and neutrality"""

        try:
            result = self.agent.invoke({
                "messages": [
                    {"role": "user", "content": generation_prompt}
                ]
            })
            
            response_obj = result["structured_response"]
            
            # Ensure user_query is set
            response_obj.user_query = user_query
            
            return response_obj
            
        except Exception as e:
            raise RuntimeError(f"Search response generation failed: {str(e)}")

    def generate_story_intelligence(
        self,
        user_query: str,
        search_results: List[Dict[str, Any]]
    ) -> StoryIntelligenceResponse:
        """Generate structured story intelligence for narrative tracking use-cases."""

        articles_context = self._format_articles_for_context(search_results)

        story_model = create_agent(
            model=self.model,
            response_format=StoryIntelligenceResponse,
        )

        generation_prompt = f"""You are an investigative business intelligence analyst.

USER QUERY:
{user_query}

RETRIEVED ARTICLES:
{articles_context}

TASK:
Create structured story intelligence for an ongoing business story.

OUTPUT REQUIREMENTS:
1. sentiment_shifts (3-6 entries):
- Track chronological sentiment movement across the story timeline.
- sentiment must be exactly one of: positive, neutral, negative.
- shift_score must be between -1 and 1.
- Each entry needs a concrete driver and evidence_article_ids.

2. contrarian_perspectives (2-4 entries):
- Identify non-consensus or overlooked viewpoints.
- Provide mainstream_view, contrarian_view, why_it_matters, and evidence_article_ids.

3. what_to_watch_next (3-5 entries):
- Provide falsifiable forward-looking predictions.
- Include horizon and probability (0 to 1).
- Include 2-4 practical watch_signals per prediction.

4. confidence_score:
- Reflect source coverage depth and consistency.

QUALITY RULES:
- Use only evidence in provided articles.
- Avoid generic claims and avoid repeating the same thesis.
- Keep statements concise and specific to business outcomes, risk, and catalysts.
"""

        try:
            result = story_model.invoke({
                "messages": [
                    {"role": "user", "content": generation_prompt}
                ]
            })

            response_obj = result["structured_response"]
            response_obj.user_query = user_query
            return response_obj

        except Exception as e:
            raise RuntimeError(f"Story intelligence generation failed: {str(e)}")

    def generate_agentic_timeline_events(
        self,
        article_heading: str,
        search_results: List[Dict[str, Any]]
    ) -> AgenticTimelineResponse:
        """Generate dated timeline events for a story arc from clustered articles."""

        articles_context = self._format_articles_for_context(search_results)
        timeline_agent = create_agent(
            model=self.model,
            response_format=AgenticTimelineResponse,
        )

        generation_prompt = f"""You are a business story intelligence agent.

PRIMARY STORY:
{article_heading}

ARTICLE CLUSTER CONTEXT:
{articles_context}

TASK:
Extract a high-signal timeline of events related to this story.

RULES:
- Return 4 to 10 events.
- Each event_date MUST be in YYYY-MM-DD.
- Events MUST be directly related to the primary story.
- event_type must be one of: catalyst, policy, market, risk, narrative.
- Include source_article_ids for each event.
- Keep title concise and description decision-useful.
- Prefer concrete developments over generic commentary.
"""

        try:
            result = timeline_agent.invoke({
                "messages": [
                    {"role": "user", "content": generation_prompt}
                ]
            })

            return result["structured_response"]
        except Exception as e:
            raise RuntimeError(f"Agentic timeline generation failed: {str(e)}")
    
    def _format_articles_for_context(self, search_results: List[Dict[str, Any]]) -> str:
        """Format search results into readable context for LLM."""
        if not search_results:
            return "No articles retrieved."
        
        formatted = ""
        for i, article in enumerate(search_results, 1):
            heading = article.get('heading', 'No Title')
            body = article.get('body', 'No Content')[:500]  # Limit to 500 chars per article
            score = article.get('search_score', 0)
            source = article.get('source_url', 'Unknown')
            author = article.get('author', 'Unknown Author')
            article_id = article.get('article_id', article.get('id', 'Unknown'))
            category = article.get('category', 'Unknown')
            published_at = article.get('published_at', 'Unknown')
            
            formatted += f"""
ARTICLE {i} (Relevance: {score:.2f})
Article ID: {article_id}
Title: {heading}
Author: {author}
Source: {source}
Category: {category}
Published At: {published_at}
Content: {body}...

"""
        
        return formatted

    def generate_story_intelligence(
        self,
        user_query: str,
        search_results: List[Dict[str, Any]]
    ) -> StoryIntelligenceResponse:
        """Generate advanced story intelligence: sentiment shifts, contrarian views, and watch-next predictions."""

        articles_context = self._format_articles_for_context(search_results)

        generation_prompt = f"""You are a senior business intelligence editor. Build a structured story intelligence output from the provided article cluster.

USER QUERY:
{user_query}

RETRIEVED ARTICLES:
{articles_context}

TASK REQUIREMENTS:
1) sentiment_shifts
- Return 3-6 chronological shifts.
- Infer dominant sentiment by time window from evidence in coverage.
- Use only: positive, neutral, negative for sentiment.
- Use only: up, down, flat for shift_direction.
- Keep shift_driver concrete and evidence-backed.
- Include evidence_article_ids for each shift.

2) contrarian_perspectives
- Return 2-4 contrarian theses that challenge mainstream interpretations.
- Each must include mainstream_view, contrarian_view, and why_it_matters.
- Include evidence_article_ids for each perspective.

3) what_to_watch_next
- Return 3-5 forward-looking predictions.
- Each prediction must be specific and testable.
- Set horizon in business-friendly windows (e.g., 1-3 months, 3-6 months).
- Set probability between 0 and 1.
- Add 2-5 watch_signals per prediction.

QUALITY BAR:
- Avoid speculation unsupported by articles.
- Be explicit about uncertainty.
- Use article IDs for traceability.
- Prefer concise, decision-useful language.
- Output MUST match the schema exactly."""

        try:
            result = self.story_agent.invoke({
                "messages": [
                    {"role": "user", "content": generation_prompt}
                ]
            })

            response_obj = result["structured_response"]
            response_obj.user_query = user_query
            return response_obj

        except Exception as e:
            raise RuntimeError(f"Story intelligence generation failed: {str(e)}")