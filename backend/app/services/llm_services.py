from openai import OpenAI
import os

# OpenAI-compatible client pointing to the local Ollama endpoint.
client = OpenAI(
    base_url="http://localhost:11434/v1",
    api_key="ollama"
)

SYSTEM_PROMPT = """
Tu es un assistant IA connecté à un explorateur de fichiers.
"""

def ask_llm(message: str):
    
    # Send system + user messages to the configured chat model.
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