from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import requests

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