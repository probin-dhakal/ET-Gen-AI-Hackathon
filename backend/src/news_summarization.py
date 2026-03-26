import os
import re
import subprocess
import json
from typing import List
from pydantic import BaseModel
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI
import requests

load_dotenv()

# Script → selected language
# Narration → selected language
# Voice → selected voice
# Image → English prompt
# Audio → correct language
# Video → synced


# ==============================
# 🎙️ VOICES
# ==============================

LANGUAGE_VOICES = {
    "english": "en-IN-NeerjaNeural",
    "hindi": "hi-IN-SwaraNeural",
    "bengali": "bn-IN-TanishaaNeural",
    "assamese": "as-IN-YashicaNeural",
    "tamil": "ta-IN-PallaviNeural",
    "telugu": "te-IN-ShrutiNeural"
}

LANGUAGE_VOICES_MALE = {
    "english": "en-US-GuyNeural",
    "hindi": "hi-IN-MadhurNeural",
    "bengali": "bn-IN-BashkarNeural",
    "tamil": "ta-IN-ValluvarNeural",
    "telugu": "te-IN-MohanNeural",
    "assamese": "as-IN-PriyomNeural"
}

# ==============================
# 📦 MODELS
# ==============================

class Scene(BaseModel):
    text: str
    highlight: str
    image_prompt: str


class VideoScript(BaseModel):
    summary: str
    scenes: List[Scene]


# ==============================
# 🔧 UTILS
# ==============================

def get_audio_duration(file_path):
    try:
        cmd = [
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration",
            "-of", "json", file_path
        ]
        result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        data = json.loads(result.stdout)
        return float(data["format"]["duration"])
    except:
        return 0


# ==============================
# 🎬 GENERATOR
# ==============================

class NewsVideoGenerator:
    def __init__(self):
        model = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            temperature=0.7
        )

        self.agent = create_agent(
            model=model,
            response_format=VideoScript
        )

        self.narration_model = init_chat_model("google_genai:gemini-2.5-flash")

    # ==============================
    # 🧠 SCENES (LANGUAGE AWARE)
    # ==============================

    def generate_script(self, article, language):
        result = self.agent.invoke({
            "messages": [{
                "role": "user",
                "content": f"""
Create EXACTLY 5 scenes in {language}.

Each scene:
- max 8 words
- match story flow

Article:
{article}
"""
            }]
        })

        return result["structured_response"]

    # ==============================
    # 🎙️ NARRATION (FIXED LANGUAGE)
    # ==============================

    def generate_narration(self, article, language):
        result = self.narration_model.invoke(f"""
    You are a professional TV news anchor.

    Write a COMPLETE news narration in {language}.

    STRICT RULES:
    - Duration MUST be between 60 to 90 seconds when spoken
    - Do NOT make it short
    - Minimum length: ~120 words
    - Maximum length: ~220 words
    - Start with a strong intro (e.g., "Today's top story...")
    - Explain full news clearly
    - End with a proper closing line (VERY IMPORTANT)
    - Ensure narration feels COMPLETE (no abrupt ending)
    - Do NOT include instructions
    - Do NOT include labels

    Article:
    {article}
    """)

        narration = result.content

        # Clean
        narration = re.sub(r'You are.*', '', narration)
        narration = re.sub(r'Article:.*', '', narration)

        narration = narration.strip()

        print("📝 Narration length:", len(narration.split()), "words")

        return narration

    # ==============================
    # 🎨 IMAGE PROMPT → ENGLISH
    # ==============================

    def generate_cinematic_prompt(self, text):
        try:
            result = self.narration_model.invoke(f"""
Convert to a cinematic image prompt in English.

Scene:
{text}
""")
            return result.content.strip()
        except:
            return text

    def generate_image(self, prompt, index):
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{os.getenv('CF_ACCOUNT_ID')}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"

            headers = {
                "Authorization": f"Bearer {os.getenv('CF_API_TOKEN')}",
                "Content-Type": "application/json"
            }

            res = requests.post(url, headers=headers, json={
                "prompt": f"{prompt}, cinematic lighting, ultra realistic, 16:9"
            })

            os.makedirs("../remotion-server/public", exist_ok=True)

            path = f"../remotion-server/public/image_{index}.png"

            with open(path, "wb") as f:
                f.write(res.content)

            return f"image_{index}.png"

        except:
            return "fallback.jpg"

    # ==============================
    # 🎙️ VOICE SELECT
    # ==============================

    def select_voice(self, article, language):
        article = article.lower()

        serious_keywords = [
            "attack", "blast", "flood", "disaster", "earthquake"
        ]

        # Assamese → only female
        if language == "assamese":
            return LANGUAGE_VOICES["assamese"], "female"

        if any(k in article for k in serious_keywords):
            return LANGUAGE_VOICES_MALE.get(language, "en-US-GuyNeural"), "male"

        return LANGUAGE_VOICES.get(language, "en-IN-NeerjaNeural"), "female"

    # ==============================
    # 🎧 AUDIO
    # ==============================

    def generate_audio(self, narration, article, language):
        import azure.cognitiveservices.speech as speechsdk

        voice, gender = self.select_voice(article, language)

        speech_config = speechsdk.SpeechConfig(
            subscription=os.getenv("AZURE_SPEECH_KEY"),
            region=os.getenv("AZURE_SPEECH_REGION")
        )

        speech_config.speech_synthesis_voice_name = voice

        path = "../remotion-server/public/audio.mp3"
        os.makedirs("../remotion-server/public", exist_ok=True)

        audio_config = speechsdk.audio.AudioOutputConfig(filename=path)

        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=audio_config
        )

        result = synthesizer.speak_text_async(narration).get()

        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            raise Exception("Azure TTS failed")

        duration = get_audio_duration(path)

        print("⏱ Duration:", duration)

        # 🔥 CONTROL RANGE PROPERLY
        if duration < 60:
            print("🔁 Too short → expanding narration")

            narration += f" This is the latest update on this story. Stay tuned for more developments."

            return self.generate_audio(narration, article, language)

        if duration > 90:
            print("🔁 Too long → regenerating shorter narration")

            narration = " ".join(narration.split()[:180])

            return self.generate_audio(narration, article, language)

        print("🎙️ Voice:", voice)

        return "audio.mp3", duration

    # ==============================
    # 🎬 MAIN
    # ==============================

    def generate_video(self, article, title, language="english"):
        script = self.generate_script(article, language)

        narration = self.generate_narration(article, language)

        audio_file, duration = self.generate_audio(narration, article, language)

        scenes = [{
            "text": "Today's Top News",
            "highlight": "Breaking",
            "image": "image_0.png"
        }]

        voice, gender = self.select_voice(article, language)

        anchor = gender  # 🔥 THIS IS CLEAN

        for i, s in enumerate(script.scenes[:5]):
            prompt = self.generate_cinematic_prompt(s.image_prompt)
            img = self.generate_image(prompt, i % 3)

            scenes.append({
                "text": s.text,
                "highlight": s.highlight,
                "image": img
            })

        payload = {
            "title": title,
            "scenes": scenes,
            "audio": audio_file,
            "durationInFrames": int(duration * 30),
            "anchor": anchor
        }

        return self.send_to_remotion(payload)

    def send_to_remotion(self, payload):
        res = requests.post("http://localhost:3001/render", json=payload)

        if res.status_code != 200:
            raise Exception(res.text)

        return res.json()