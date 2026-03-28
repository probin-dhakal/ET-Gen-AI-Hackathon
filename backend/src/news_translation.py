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
    original_nucleus_summary: str = Field(description="Original English nucleus summary")
    original_body: str = Field(description="Original English article body")
    translated_heading: str = Field(default="", description="Translated heading in target language")
    translated_nucleus_summary: str = Field(default="", description="Translated nucleus summary in target language")
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
        language: str,
        nucleus_summary: str = None
    ) -> TranslatedArticle:
        """
        Translate a news article into specified Indian language with cultural adaptation.
        Works with any genre: business, politics, sports, technology, entertainment, etc.
        
        Args:
            article_heading: The original English article heading
            article_body: The original English article body/content
            nucleus_summary: Optional English nucleus summary
            language: Target language (hindi, tamil, telugu, bengali, assamese)
        
        Returns:
            TranslatedArticle: Structured translation with local context and cultural adaptation
        """
        
        # Get language-specific prompt
        prompt_config = get_translation_prompt(language)
        system_prompt = prompt_config["system"]
        language_name = prompt_config["language_name"]
        
        # Construct translation request
        summary_section = f"\nSUMMARY: {nucleus_summary}\n" if nucleus_summary else "\n"
        
        translation_request = f"""{system_prompt}

Please translate this news article into {language_name} with cultural adaptation:{summary_section}
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
            if not translated_article.translated_nucleus_summary:
                translated_article.translated_nucleus_summary = nucleus_summary or ""
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
                translated_summary = nucleus_summary or ""

                return TranslatedArticle(
                    original_language="English",
                    target_language=language_name,
                    original_heading=article_heading,
                    original_nucleus_summary=nucleus_summary or "",
                    original_body=article_body,
                    translated_heading=translated_heading,
                    translated_nucleus_summary=translated_summary,
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
    Healthcare systems around the world are entering a structural transition period in which demand is rising faster than capacity, costs are growing faster than public budgets, and patient expectations are rising faster than institutional redesign. Policymakers, hospital leaders, insurers, and clinicians increasingly agree that incremental reform is no longer enough. The present phase requires a coordinated redesign of financing, workforce planning, digital infrastructure, and quality governance. In this context, healthcare workforce planning and retention has moved from a specialized policy topic to a central national priority across both developed and emerging economies. A key feature of the current period is demographic pressure. Populations are aging in most middle-income and high-income regions, and life expectancy gains have expanded the number of people living with chronic disease. Diabetes, hypertension, cardiovascular disease, cancer survivorship, chronic respiratory conditions, and neurodegenerative disorders require long-term management rather than episodic treatment. This shifts healthcare demand from one-time interventions toward continuous monitoring, multidisciplinary care plans, rehabilitation, and social support. Governments that budgeted around acute-care models now face multi-year care liabilities that challenge fiscal planning.

Workforce constraints are equally severe. Health systems are struggling with shortages of nurses, primary care physicians, emergency specialists, technicians, and mental-health professionals. Training pipelines are too slow to fill near-term gaps, while migration of skilled personnel from lower-income regions to higher-income labor markets creates uneven capacity across countries.

Burnout and attrition after years of high-intensity service have further reduced staffing resilience. The workforce issue is not only about headcount; it also concerns skill mix, scope-of-practice rules, team-based models, and better deployment of allied professionals who can safely absorb routine clinical tasks. Financial sustainability remains a major policy challenge. Healthcare inflation is driven by pharmaceuticals, diagnostics, specialist procedures, imported devices, insurance leakage, and fragmented procurement practices. Even where total spending is high, outcomes are often uneven because resources are concentrated in tertiary hospitals while preventive and primary systems remain underfunded.

The policy debate increasingly centers on value-based purchasing, pooled procurement, bundled payments, and outcome-linked reimbursement. Decision makers are asking whether current spending produces measurable gains in survival, quality of life, and equity, or merely expands high-cost activity without proportional benefit.

Digital transformation is creating both opportunities and execution risks. Electronic health records, telemedicine, e-prescription systems, remote monitoring, and AI-assisted triage can reduce waiting times, support continuity of care, and improve case prioritization. Yet digital adoption often suffers from low interoperability, poor data standards, and vendor lock-in. Rural and low-income patients may face connectivity barriers that turn digital channels into new forms of exclusion.

Regulators are therefore moving toward standards for interoperability, privacy protections, auditability of clinical AI models, and shared governance frameworks that define accountability when algorithmic recommendations influence treatment choices. Public health preparedness has become a permanent planning function rather than a temporary emergency response layer. Health ministries are strengthening surveillance systems, laboratory networks, genomic sequencing, stockpiles, and surge-capacity protocols to respond to infectious disease outbreaks and climate-linked health shocks. Preparedness now includes logistics design: oxygen distribution, cold-chain reliability, mobile testing capability, and cross-border data exchange arrangements.

Countries that invest in inter-operable emergency systems can reduce mortality not only during pandemics but also during seasonal spikes in respiratory disease, heat emergencies, and disaster-related displacement. Equity and access remain decisive indicators of system quality. In many regions, urban populations receive sophisticated care while peri-urban and rural communities face delayed diagnosis, medicine shortages, and workforce scarcity.

Women, children, older adults, migrant workers, and low-income households often encounter higher out-of-pocket costs and lower service continuity. Health policy is increasingly tied to social protection architecture: transport support, insurance portability, community health worker programs, and localized primary care hubs.


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