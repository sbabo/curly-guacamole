"""
Entrée principale de l'application backend FastAPI pour Guacamol.
Author: Samuel Babo
Date : 2026-05-15"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.api.chat import router as chat_router
from src.api.files import router as files_router

# Main FastAPI application instance.
app = FastAPI()

# CORS setup to allow the frontend to call the API during development.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register feature routers.
app.include_router(chat_router)
app.include_router(files_router)

@app.get("/")
async def root():
    """Root endpoint for health check."""
    return {"status": "ok"}
