"""
This module defines the API endpoints related to chat interactions with the LLM.
Author: Samuel Babot
Date : 2026-05-15
"""

from fastapi import APIRouter
from pydantic import BaseModel

from src.services.llm_services import ask_llm

router = APIRouter()

# Request payload expected by the /chat endpoint.
class ChatRequest(BaseModel):
    """The user's message to be sent to the LLM."""
    message: str

@router.post("/chat")
async def chat(req: ChatRequest):
    """Endpoint to handle chat messages from the frontend."""
    # Forward the user message to the LLM service layer.
    reply = ask_llm(req.message)

    # Keep a minimal JSON response consumed by the frontend.
    return {
        "reply": reply
    }
