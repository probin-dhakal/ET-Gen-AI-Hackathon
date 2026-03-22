import requests
import os

url = f"https://api.cloudflare.com/client/v4/accounts/1358732777bcfca9bba886f6bc2d8e62/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0"

headers = {
    "Authorization": f"Bearer cfut_cZdz8DKqqrJsMF6dCrQOLSsRjcRZ17Mtk7FGk4ev89adde00",
    "Content-Type": "application/json"
}

data = {
    "prompt": "AI newsroom, cinematic lighting"
}

res = requests.post(url, headers=headers, json=data)

print(res.status_code)