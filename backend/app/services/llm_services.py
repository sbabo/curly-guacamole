from openai import OpenAI
import os

client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

SYSTEM_PROMPT = """
Tu es un assistant IA connecté à un explorateur de fichiers.
"""

def ask_llm(message: str):
    
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

    return response.choices[0].message.content