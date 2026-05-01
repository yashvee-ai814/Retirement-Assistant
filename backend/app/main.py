from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.config import settings
from .core.logger import get_logger
from .core.middleware import RequestLoggingMiddleware
from .db.database import init_db
from .vector.ingest import ingest_startup_documents
from .router.auth import auth_router
from .router.chat import chat_router
from .router.documents import documents_router
from .router.profile import profile_router

logger = get_logger("retirement.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Retirement Assistant API starting — model: %s", settings.OLLAMA_MODEL)
    await init_db()
    logger.info("Database initialised")
    await ingest_startup_documents()
    logger.info("Startup document ingestion complete")
    yield
    logger.info("Retirement Assistant API stopped")


app = FastAPI(title="Retirement Assistant API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(RequestLoggingMiddleware)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(documents_router)
app.include_router(profile_router)


@app.get("/health")
async def health():
    return {"status": "ok", "model": settings.OLLAMA_MODEL}
