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
def translate_news(language: str, data: dict):
    translator = VernacularNewsTranslator()

    article_heading = data.get("heading", "")
    article_body = data.get("body", "")
    language = language.lower()

    translated_article = translator.translate_article(
        article_heading=article_heading,
        article_body=article_body,
        language=language
    )

    print(f"Translated article: {translated_article}")

    return translated_article