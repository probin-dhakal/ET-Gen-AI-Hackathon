import os
import time
from typing import List
from pydantic import BaseModel
from langchain.agents import create_agent
from langchain.chat_models import init_chat_model
from dotenv import load_dotenv
from gtts import gTTS
from pydub import AudioSegment
import requests

load_dotenv()

AudioSegment.converter = "/opt/homebrew/bin/ffmpeg"
AudioSegment.ffprobe = "/opt/homebrew/bin/ffprobe"


class Scene(BaseModel):
    text: str
    highlight: str
    image_prompt: str


class VideoScript(BaseModel):
    summary: str
    scenes: List[Scene]


class NewsVideoGenerator:
    def __init__(self):
        os.environ["GOOGLE_API_KEY"] = os.getenv("GEMINI_API_KEY")

        self.agent = create_agent(
            model=init_chat_model("google_genai:gemini-2.5-flash"),
            response_format=VideoScript
        )

    # 🧠 Generate scenes
    def generate_script(self, article):
        prompt = f"""
Convert article into professional news video script.

STRICT:
- 6 to 8 scenes
- Each max 12 words
- Add highlight (2-4 words)
- Add image_prompt (visual scene description)

Article:
{article}
"""
        result = self.agent.invoke({
            "messages": [{"role": "user", "content": prompt}]
        })

        return result["structured_response"]

    # 🎨 Cloudflare Image
    def generate_image(self, prompt, index):
        try:
            url = f"https://api.cloudflare.com/client/v4/accounts/{os.getenv('CF_ACCOUNT_ID')}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"

            headers = {
                "Authorization": f"Bearer {os.getenv('CF_API_TOKEN')}",
                "Content-Type": "application/json"
            }

            data = {
                "prompt": f"{prompt}, cinematic lighting, realistic, news style, 16:9"
            }

            res = requests.post(url, headers=headers, json=data)

            if res.status_code != 200:
                print("CF error:", res.text)
                return "fallback.jpg"

            os.makedirs("../remotion-server/public", exist_ok=True)

            file_path = f"../remotion-server/public/image_{index}.png"

            with open(file_path, "wb") as f:
                f.write(res.content)

            return f"image_{index}.png"

        except Exception as e:
            print("Image error:", e)
            return "fallback.jpg"

    # 🎙️ Audio
    def generate_audio(self, scenes):
        text = " ".join([s["text"] for s in scenes])

        path = "../remotion-server/public/audio.mp3"
        os.makedirs("../remotion-server/public", exist_ok=True)

        tts = gTTS(text)
        tts.save(path)

        audio = AudioSegment.from_mp3(path)
        duration = len(audio) / 1000

        return "audio.mp3", duration

    def send_to_remotion(self, payload):
        res = requests.post("http://localhost:3001/render", json=payload)

        if res.status_code != 200:
            print(res.text)
            raise Exception("Remotion failed")

        return res.json()

    # 🎬 MAIN
    def generate_video(self, article, title):
        script = self.generate_script(article)

        scenes = []

        for i, s in enumerate(script.scenes):
            if i < 3:
                img = self.generate_image(s.image_prompt, i)
                time.sleep(1)
            else:
                img = f"image_{i % 3}.png"

            scenes.append({
                "text": s.text,
                "highlight": s.highlight,
                "image": img
            })

        audio_file, duration = self.generate_audio(scenes)

        frames = int(duration * 30)

        payload = {
            "title": title,
            "scenes": scenes,
            "audio": audio_file,
            "durationInFrames": frames
        }

        return self.send_to_remotion(payload)