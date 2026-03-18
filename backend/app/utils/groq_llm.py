import requests

from backend.app.ia_settings import (
    GROQ_API_KEY,
    GROQ_BASE_URL,
    GROQ_MODEL,
    REQUEST_TIMEOUT,
)


def groq_chat(messages, temperature: float = 0.2, model: str | None = None) -> str:
    """Llamada a Groq usando el endpoint OpenAI-compatible /chat/completions."""
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY no configurado")

    url = f"{GROQ_BASE_URL.rstrip('/')}/chat/completions"
    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": (model or GROQ_MODEL),
        "temperature": float(temperature or 0.2),
        "messages": messages,
    }
    r = requests.post(url, headers=headers, json=payload, timeout=REQUEST_TIMEOUT)
    r.raise_for_status()
    return r.json()["choices"][0]["message"]["content"].strip()
