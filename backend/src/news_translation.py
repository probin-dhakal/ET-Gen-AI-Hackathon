import os
from typing import Optional
from pydantic import BaseModel, Field
from langchain.agents import create_agent
from prompts import get_translation_prompt
from dotenv import load_dotenv
from langchain.chat_models import init_chat_model


# Load environment variables from .env file
load_dotenv()

class TranslatedArticle(BaseModel):
    """Structured output for translated business news."""
    original_language: str = Field(description="Original language (English)")
    target_language: str = Field(description="Target language for translation")
    original_heading: str = Field(description="Original English heading")
    original_body: str = Field(description="Original English article body")
    translated_heading: str = Field(description="Translated heading in target language")
    translated_body: str = Field(description="Translated body in target language with cultural context")
    local_context: str = Field(description="Additional local context relevant to target region")
    translation_notes: Optional[str] = Field(description="Any important notes about cultural adaptations made")


class VernacularNewsTranslator:
    """
    AI-powered vernacular business news translator using LangChain agents.
    Supports Hindi, Tamil, Telugu, Bengali, and Assamese.
    Uses Gemini 2.5 Flash with structured response format.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the translator with create_agent using Gemini 2.5 Flash."""
        api_key = api_key or os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        os.environ["GOOGLE_API_KEY"] = api_key
        model = init_chat_model("google_genai:gemini-2.5-flash-lite")

        self.agent = create_agent(
            model=model,
            response_format=TranslatedArticle, 
        )
       
    
    def translate_article(
        self,
        article_heading: str,
        article_body: str,
        language: str
    ) -> TranslatedArticle:
        """
        Translate a business news article into specified Indian language with cultural adaptation.
        
        Args:
            article_heading: The original English article heading
            article_body: The original English article body/content
            language: Target language (hindi, tamil, telugu, bengali, assamese)
        
        Returns:
            TranslatedArticle: Structured translation with local context and cultural adaptation
        """
        
        # Get language-specific prompt
        prompt_config = get_translation_prompt(language)
        system_prompt = prompt_config["system"]
        language_name = prompt_config["language_name"]
        
        # Construct translation request
        translation_request = f"""{system_prompt}

Please translate this business news article into {language_name} with cultural adaptation:

HEADING: {article_heading}

BODY:
{article_body}

Remember to:
1. NOT provide literal word-for-word translation - adapt concepts for local context
2. Use region-specific business terminology
3. Add local economic context and references
4. Include local business parallels and comparable companies
5. Explain foreign concepts through {language_name} lens
6. Maintain original facts and figures exactly as stated"""
        
        # Invoke agent with structured response
        try:
            result = self.agent.invoke({
                "messages": [
                    {"role": "user", "content": translation_request}
                ]
            })
            
            # Extract structured response directly
            translated_article = result["structured_response"]
            
            return translated_article
            
        except Exception as e:
            raise RuntimeError(f"Translation failed: {str(e)}")
    
    def translate_batch(
        self,
        articles: list[dict],
        language: str
    ) -> list[TranslatedArticle]:
        """
        Translate multiple articles at once.
        
        Args:
            articles: List of dicts with 'heading' and 'body' keys
            language: Target language
        
        Returns:
            List of TranslatedArticle objects
        """
        results = []
        for article in articles:
            translated = self.translate_article(
                article_heading=article.get("heading", ""),
                article_body=article.get("body", ""),
                language=language
            )
            results.append(translated)
        return results


# Example usage
if __name__ == "__main__":
    # Initialize translator with LangChain create_agent
    translator = VernacularNewsTranslator()
    
    # Sample business news article
    sample_heading = "Union Budget 2026: Major Tax Reforms and Economic Push Announced"
    sample_body = """
    The Finance Minister today announced a comprehensive budget with significant tax reforms aimed at boosting economic growth.
    Key highlights include: personal income tax slab reduction of 2%, increased FDI limits in manufacturing at 35%, and a new Rs. 50,000 crore 
    infrastructure fund. The market indices surged on the announcement, with Sensex gaining 1,200 points. Analysts predict this will attract 
    multinational corporations and accelerate the Make in India initiative. The budget also focuses on digital payments and fintech startups, 
    allocating Rs. 5,000 crore for innovation hubs across tier-2 cities.
    """
    
    # Translate to Assamese using LangChain structured agent
    print("Translating article to Assamese using LangChain create_agent...")
    result = translator.translate_article(
        article_heading=sample_heading,
        article_body=sample_body,
        language="assamese"
    )
    
    # Format output
    output = "=" * 80 + "\n"
    output += f"TRANSLATED TO: {result.target_language}\n"
    output += "=" * 80 + "\n"
    output += f"\nOriginal Heading: {result.original_heading}\n"
    output += f"\nTranslated Heading: {result.translated_heading}\n"
    output += f"\nTranslated Body:\n{result.translated_body}\n"
    output += f"\nLocal Context: {result.local_context}\n"
    output += f"\nTranslation Notes: {result.translation_notes}\n"
    output += "=" * 80
    
    # Print to console
    print(output)
    
    # Save to file
    output_file = "/tmp/translation_response.txt"
    with open(output_file, "w", encoding="utf-8") as f:
        f.write(output)
    print(f"\n✓ Response saved to: {output_file}")