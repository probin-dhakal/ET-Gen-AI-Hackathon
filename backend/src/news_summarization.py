import os
import time
import re
from typing import List
from pydantic import BaseModel
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
from pydub import AudioSegment
import requests
import azure.cognitiveservices.speech as speechsdk

load_dotenv()

AudioSegment.converter = "/opt/homebrew/bin/ffmpeg"
AudioSegment.ffprobe = "/opt/homebrew/bin/ffprobe"


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
# 🎬 GENERATOR
# ==============================

class NewsVideoGenerator:
    def __init__(self):
        os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

        # Scene generator
        self.agent = create_agent(
            model=init_chat_model("google_genai:gemini-2.5-flash"),
            response_format=VideoScript
        )

        # Narration generator (PLAIN TEXT ONLY)
        self.narration_model = init_chat_model("google_genai:gemini-2.5-flash")


    # ==============================
    # 🧠 SCENES
    # ==============================

    def generate_script(self, article):
        prompt = f"""
Create EXACTLY 5 short scenes for a news video.

Rules:
- Each scene max 10 words
- Add highlight (2-3 words)
- Add image_prompt
- No narration, just visual text

Article:
{article}
"""
        result = self.agent.invoke({
            "messages": [{"role": "user", "content": prompt}]
        })

        return result["structured_response"]


    # ==============================
    # 🎙️ NARRATION (DYNAMIC LENGTH)
    # ==============================

    def generate_narration(self, article):
        prompt = f"""
Write a professional news narration.

STRICT:
- Duration between 50 to 90 seconds
- Smooth storytelling
- Start with a greeting (like: Good evening / Welcome)
- No instructions, no labels

Article:
{article}
"""

        result = self.narration_model.invoke(prompt)

        narration = result.content.strip()

        # remove any accidental prompt leakage
        narration = re.sub(r'(Article:.*)', '', narration, flags=re.DOTALL)

        return narration


    # ==============================
    # 🎨 IMAGE
    # ==============================

    def generate_image(self, prompt, index):
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{os.getenv('CF_ACCOUNT_ID')}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"

            headers = {
                "Authorization": f"Bearer {os.getenv('CF_API_TOKEN')}",
                "Content-Type": "application/json"
            }

            data = {
                "prompt": f"{prompt}, cinematic, news, realistic, 16:9"
            }

            res = requests.post(url, headers=headers, json=data)

            os.makedirs("../remotion-server/public", exist_ok=True)
            path = f"../remotion-server/public/image_{index}.png"

            with open(path, "wb") as f:
                f.write(res.content)

            return f"image_{index}.png"

        except:
            return "fallback.jpg"


    # ==============================
    # 🎧 AUDIO (AZURE)
    # ==============================

    def generate_audio(self, narration):
        speech_config = speechsdk.SpeechConfig(
            subscription=os.getenv("AZURE_SPEECH_KEY"),
            region=os.getenv("AZURE_SPEECH_REGION")
        )

        speech_config.set_speech_synthesis_output_format(
            speechsdk.SpeechSynthesisOutputFormat.Audio16Khz128KBitRateMonoMp3
        )

        speech_config.speech_synthesis_voice_name = "en-IN-NeerjaNeural"

        output = "../remotion-server/public/audio.mp3"
        os.makedirs("../remotion-server/public", exist_ok=True)

        audio_config = speechsdk.audio.AudioOutputConfig(filename=output)

        synthesizer = speechsdk.SpeechSynthesizer(
            speech_config=speech_config,
            audio_config=audio_config
        )

        result = synthesizer.speak_text_async(narration).get()

        if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
            raise Exception("Azure TTS failed")

        audio = AudioSegment.from_mp3(output)
        duration = len(audio) / 1000

        # ✅ enforce 50–90 sec
        if duration < 50:
            narration += " Thank you for watching."
            return self.generate_audio(narration)

        if duration > 90:
            narration = " ".join(narration.split()[:180])
            return self.generate_audio(narration)

        return "audio.mp3", duration


    # ==============================
    # 🎬 MAIN
    # ==============================

    def generate_video(self, article, title):
        script = self.generate_script(article)

        narration = self.generate_narration(article)
        audio_file, duration = self.generate_audio(narration)

        scenes = []

        # 🎯 INTRO SCENE
        if narration.lower().startswith(("good", "welcome")):
            scenes.append({
                "text": "Welcome to today's news",
                "highlight": "Breaking News",
                "image": "image_0.png"
            })

        # 🎯 MAIN SCENES
        for i, s in enumerate(script.scenes[:5]):
            img = self.generate_image(s.image_prompt, i % 3)

            scenes.append({
                "text": s.text,
                "highlight": s.highlight,
                "image": img
            })

        frames = int(duration * 30)

        payload = {
            "title": title,
            "scenes": scenes,
            "audio": audio_file,
            "durationInFrames": frames
        }

        return self.send_to_remotion(payload)


    def send_to_remotion(self, payload):
        res = requests.post("http://localhost:3001/render", json=payload)

        if res.status_code != 200:
            print(res.text)
            raise Exception("Remotion failed")

        return res.json()