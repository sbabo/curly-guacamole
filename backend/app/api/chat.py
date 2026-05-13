from fastapi import APIRouter
from pydantic import BaseModel

from app.services.llm_services import ask_llm

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
async def chat(req: ChatRequest):

    reply = ask_llm(req.message)

    return {
        "reply": reply
    }