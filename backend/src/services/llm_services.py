"""
This module provides a simple interface to interact with a local Ollama LLM instance.
Author: Samuel Babot
Date : 2026-05-15
"""
from openai import OpenAI

# OpenAI-compatible client pointing to the local Ollama endpoint.
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

SYSTEM_PROMPT = """
Tu es un assistant IA connecté à un explorateur de fichiers.
"""

def ask_llm(message: str):
    """Send a message to the LLM and return its response."""
    response = client.chat.completions.create(
        model="llama3",
        messages=[
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            },
            {
                "role": "user",
                "content": message
            }
        ]
    )

    # Return only the assistant text content.
    return response.choices[0].message.content
