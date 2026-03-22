from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.news_translation import VernacularNewsTranslator
from src.news_summarization import NewsVideoGenerator
from fastapi.staticfiles import StaticFiles
app = FastAPI()

# ✅ CORS (important for React)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==============================
# 📦 Request Models
# ==============================

class TranslationRequest(BaseModel):
    heading: str
    body: str


class VideoRequest(BaseModel):
    article: str
    title: str | None = "Generated Video"




# ✅ Serve audio folder
app.mount("/audio", StaticFiles(directory="audio"), name="audio")
# ==============================
# 🏠 Root Route
# ==============================

@app.get("/")
def home():
    return {"message": "FastAPI backend running"}


# ==============================
# 🌐 Translation API
# ==============================

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
            "message": "Translation failed. Ensure GEMINI_API_KEY is set."
        }


# ==============================
# 🎬 Video Generation API
# ==============================

@app.post("/generate-video")
def generate_video(request_data: VideoRequest):
    try:
        generator = NewsVideoGenerator()
        result = generator.generate_video(
            request_data.article,
            request_data.title
        )

        return {"status": "success", "data": result}

    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
    



    