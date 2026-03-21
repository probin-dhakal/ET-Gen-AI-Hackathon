from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests
from src.news_translation import VernacularNewsTranslator

app = FastAPI()

# CORS (important for React later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request model for translation endpoint
class TranslationRequest(BaseModel):
    heading: str
    body: str

@app.get("/")
def home():
    return {"message": "FastAPI backend running"}

@app.post("/generate-video")
def generate_video(data: dict):
    # Example: send to Remotion server
    remotion_url = "http://localhost:3001/render"

    response = requests.post(remotion_url, json=data)

    return response.json()


@app.post("/translate-news/{language}")
def translate_news(language: str, request_data: TranslationRequest):
    try:
        translator = VernacularNewsTranslator()

        article_heading = request_data.heading
        article_body = request_data.body
        language = language.lower()

        translated_article = translator.translate_article(
            article_heading=article_heading,
            article_body=article_body,
            language=language
        )

        print(f"Translated article: {translated_article}")

        return translated_article
    except Exception as e:
        print(f"Error in translate_news endpoint: {str(e)}")
        return {
            "error": str(e),
            "message": "Translation failed. Ensure GEMINI_API_KEY is set in environment variables."
        }