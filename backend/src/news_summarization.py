import os
import re
import subprocess
import json
import requests
from typing import List
from pydantic import BaseModel
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI # Updated import

load_dotenv()

# ==============================
# 📦 MODELS
# ==============================

class Scene(BaseModel):
    text: str
    highlight: str
    image_prompt: str

class VideoScript(BaseModel):
    scenes: List[Scene]

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
# 🎬 GENERATOR
# ==============================

class NewsVideoGenerator:
    def __init__(self):
        # Switched from Gemini to Azure OpenAI
        self.llm = AzureChatOpenAI(
            azure_deployment=os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME"),
            api_version=os.getenv("AZURE_OPENAI_API_VERSION"),
            azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
            api_key=os.getenv("AZURE_OPENAI_API_KEY"),
            temperature=0.7
        )

    def get_audio_duration(self, file_path):
        try:
            cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "json", file_path]
            result = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            data = json.loads(result.stdout)
            return float(data["format"]["duration"])
        except Exception:
            return 0

    # ==========================================
    # 🧠 STRUCTURED SCRIPT GENERATION
    # ==========================================

    def generate_visual_script(self, article, narration, language) -> List[Scene]:
        prompt = f"""
        You are a News Video Producer. Based on the NARRATION below, create exactly 5 visual scenes.
        
        For each scene, provide:
        1. 'highlight': A short, punchy 1-2 word heading in {language}.
        2. 'text': A concise summary sentence (max 8 words) describing this part of the news in {language}.
        3. 'image_prompt': A cinematic, highly detailed English prompt for an AI image generator. 
           Style: Professional photojournalism, 8k, realistic, 16:9. No text in image.

        Narration:
        {narration}

        Article Context:
        {article}

        Return ONLY a JSON list with exactly 5 objects.
        Format: [{{"highlight": "...", "text": "...", "image_prompt": "..."}}, ...]
        """
        
        response = self.llm.invoke(prompt)
        content = re.sub(r'```json|```', '', response.content).strip()
        try:
            scenes_data = json.loads(content)
            return [Scene(**s) for s in scenes_data[:5]]
        except Exception as e:
            print(f"JSON Parsing Error: {e}")
            return [Scene(text="Latest Updates", highlight="NEWS", image_prompt="Professional news studio background") for _ in range(5)]

    # ==============================
    # 🎙️ NARRATION
    # ==============================

    def generate_narration(self, article, language):
        intro_map = {
            "english": "Welcome to Economic Times.",
            "hindi": "इकोनॉमिक टाइम्स में आपका स्वागत है।",
            "bengali": "ইকোনমিক টাইমসে আপনাকে স্বাগতম।",
            "assamese": "ইকনমিক টাইমছলৈ আপোনাক স্বাগতম।",
            "tamil": "எகனாமிக் டைம்ஸுக்கு உங்களை வரவேற்கிறோம்.",
            "telugu": "ఎకనామిక్ టైమ్స్‌కు స్వాగతం."
        }
        
        intro = intro_map.get(language, "Welcome to Economic Times.")

        result = self.llm.invoke(f"""
        You are a professional TV news anchor.
        Write a COMPLETE news narration in {language}.
        
        STRICT RULES:
        - Start EXACTLY with: "{intro}"
        - Duration: 60–80 seconds (~150-180 words)
        - Structure: Hook → Key facts → Impact → Outro
        - Do NOT include labels like "Intro:" or brackets.

        Article:
        {article}
        """)
        return result.content.strip()

    # ==============================
    # 🎨 IMAGE GENERATION
    # ==============================

    def generate_image(self, prompt, index):
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{os.getenv('CF_ACCOUNT_ID')}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"
            headers = {"Authorization": f"Bearer {os.getenv('CF_API_TOKEN')}"}

            payload = {
                "prompt": f"{prompt}, professional photojournalism, 8k, sharp focus, cinematic lighting, 16:9",
                "negative_prompt": "text, watermark, logo, blurry, distorted, cartoon",
                "num_steps": 20
            }

            res = requests.post(url, headers=headers, json=payload)
            if res.status_code != 200: return "fallback.jpg"

            os.makedirs("../remotion-server/public", exist_ok=True)
            filename = f"image_{index}.png"
            path = f"../remotion-server/public/{filename}"

            with open(path, "wb") as f:
                f.write(res.content)
            return filename
        except Exception:
            return "fallback.jpg"

    # ==============================
    # 🎧 AUDIO (AZURE TTS)
    # ==============================

    def select_voice(self, article, language):
        article = article.lower()
        serious = ["attack", "blast", "war", "death", "crisis", "accident"]
        
        if language == "assamese": return LANGUAGE_VOICES["assamese"]
        if any(k in article for k in serious):
            return LANGUAGE_VOICES_MALE.get(language, "en-US-GuyNeural")
        return LANGUAGE_VOICES.get(language, "en-IN-NeerjaNeural")

    def generate_audio(self, narration, article, language):
        import azure.cognitiveservices.speech as speechsdk
        
        voice = self.select_voice(article, language)
        speech_config = speechsdk.SpeechConfig(subscription=os.getenv("AZURE_SPEECH_KEY"), region=os.getenv("AZURE_SPEECH_REGION"))
        speech_config.speech_synthesis_voice_name = voice
        
        path = "../remotion-server/public/audio.mp3"
        os.makedirs("../remotion-server/public", exist_ok=True)

        audio_config = speechsdk.audio.AudioOutputConfig(filename=path)
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=speech_config, audio_config=audio_config)
        
        result = synthesizer.speak_text_async(narration).get()
        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            raise Exception("TTS Failed")

        return "audio.mp3", self.get_audio_duration(path)

    # ==============================
    # 🎬 MAIN EXECUTION
    # ==============================

    def generate_video(self, article, title, language="english"):
        print(f"--- Starting Video Generation ({language}) ---")
        
        narration = self.generate_narration(article, language)
        
        print("Generating scene scripts...")
        visual_script = self.generate_visual_script(article, narration, language)
        
        print("Generating audio...")
        audio_file, duration = self.generate_audio(narration, article, language)
        
        print("Generating visuals...")
        final_scenes = []
        for i, scene in enumerate(visual_script):
            img_filename = self.generate_image(scene.image_prompt, i)
            final_scenes.append({
                "image": img_filename,
                "highlight": scene.highlight,
                "text": scene.text
            })

        payload = {
            "title": title,
            "scenes": final_scenes,
            "audio": audio_file,
            "durationInFrames": int(duration * 30)
        }

        print("Sending to Remotion...")
        return self.send_to_remotion(payload)

    def send_to_remotion(self, payload):
        try:
            res = requests.post("http://localhost:3001/render", json=payload, timeout=300)
            return res.json()
        except Exception as e:
            return {"status": "error", "message": str(e)}