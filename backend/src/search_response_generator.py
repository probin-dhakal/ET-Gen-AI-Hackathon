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

        self.agent = create_agent(
            model=model,
            response_format=SearchResponse,
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
        
        generation_prompt = f"""You are an intelligent news analysis assistant. Your task is to:

1. Read the user's search query
2. Analyze the retrieved news articles
3. Generate a comprehensive, contextually relevant response
4. Extract key insights from the articles

USER QUERY:
{user_query}

RETRIEVED ARTICLES:
{articles_context}

Please provide:
1. A comprehensive response (2-3 paragraphs) that directly addresses the user's query using information from the articles
2. 3-5 key insights/takeaways from these articles
3. A confidence score (0-1) reflecting how well the articles answer the query:
   - 1.0: Perfectly answers the query with multiple reliable sources
   - 0.7-0.9: Good coverage of the topic with relevant information
   - 0.4-0.6: Partial coverage, some relevant information found
   - 0.0-0.3: Limited information, articles not directly relevant to query

IMPORTANT RULES:
✓ Be specific and cite information from the articles
✓ Acknowledge if information is limited or incomplete
✓ Maintain journalistic neutrality
✓ Focus on factual information from the articles
✓ If no articles are relevant, indicate low confidence and suggest related topics"""

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
            
            formatted += f"""
ARTICLE {i} (Relevance: {score:.2f})
Title: {heading}
Author: {author}
Source: {source}
Content: {body}...

"""
        
        return formatted
