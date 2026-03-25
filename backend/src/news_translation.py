import os
from typing import Optional
from pydantic import BaseModel, Field
from langchain.agents import create_agent
from src.prompts import get_translation_prompt
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI

# Load environment variables from .env file
load_dotenv()

class TranslatedArticle(BaseModel):
    """Structured output for translated news articles (any genre)."""
    original_language: str = Field(description="Original language (English)")
    target_language: str = Field(description="Target language for translation")
    original_heading: str = Field(description="Original English heading")
    original_body: str = Field(description="Original English article body")
    translated_heading: str = Field(default="", description="Translated heading in target language")
    translated_body: str = Field(default="", description="Translated body in target language with cultural context")
    local_context: str = Field(default="", description="Additional local context relevant to target region")
    translation_notes: Optional[str] = Field(default=None, description="Any important notes about cultural adaptations made")


class VernacularNewsTranslator:
    """
    AI-powered vernacular news translator using LangChain agents.
    Works with any type of news (business, politics, sports, tech, entertainment, etc.).
    Supports Hindi, Tamil, Telugu, Bengali, and Assamese.
    Uses Gemini 2.5 Flash with structured response format.
    """
    
    def __init__(self, api_key: Optional[str] = None):
        """Initialize the translator with Azure OpenAI, falling back to Gemini when configured."""
        azure_api_key = os.getenv("AZURE_OPENAI_API_KEY")
        azure_endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        azure_deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME")
        azure_api_version = os.getenv("AZURE_OPENAI_API_VERSION")

        gemini_api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
        gemini_model = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")

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
            raise RuntimeError(
                "Translation provider not configured. "
                "Set AZURE_OPENAI_API_KEY/AZURE_OPENAI_ENDPOINT/AZURE_OPENAI_DEPLOYMENT_NAME/AZURE_OPENAI_API_VERSION "
                "or set GEMINI_API_KEY."
            )

        self.model = model

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
        Translate a news article into specified Indian language with cultural adaptation.
        Works with any genre: business, politics, sports, technology, entertainment, etc.
        
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

Please translate this news article into {language_name} with cultural adaptation:

HEADING: {article_heading}

BODY:
{article_body}

Remember to:
1. NOT provide literal word-for-word translation - adapt concepts for local cultural context
2. Use region-specific terminology appropriate to the news genre
3. Add local context and references relevant to the region
4. Include local parallels and comparable references where applicable
5. Explain foreign concepts through {language_name} cultural lens
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

            # Guard against partial structured output from some providers.
            if not translated_article.translated_heading:
                translated_article.translated_heading = article_heading
            if not translated_article.translated_body:
                translated_article.translated_body = article_body
            
            return translated_article
            
        except Exception as e:
            # Fallback: use raw model output and map into the expected shape.
            try:
                raw = self.model.invoke(translation_request)
                raw_content = getattr(raw, "content", "")

                if isinstance(raw_content, list):
                    raw_text = "\n".join(
                        str(part.get("text", "")) if isinstance(part, dict) else str(part)
                        for part in raw_content
                    ).strip()
                else:
                    raw_text = str(raw_content).strip()

                translated_heading = raw_text.splitlines()[0][:200] if raw_text else article_heading
                translated_body = raw_text if raw_text else article_body

                return TranslatedArticle(
                    original_language="English",
                    target_language=language_name,
                    original_heading=article_heading,
                    original_body=article_body,
                    translated_heading=translated_heading,
                    translated_body=translated_body,
                    local_context="",
                    translation_notes="Fallback translation used due to structured parsing failure."
                )
            except Exception:
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
        language="bengali"
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