from fastapi import APIRouter
from pydantic import BaseModel

from app.services.llm_services import ask_llm

router = APIRouter()

# Request payload expected by the /chat endpoint.
class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(req: ChatRequest):

    # Forward the user message to the LLM service layer.
    reply = ask_llm(req.message)

    # Keep a minimal JSON response consumed by the frontend.
    return {
        "reply": reply
    }