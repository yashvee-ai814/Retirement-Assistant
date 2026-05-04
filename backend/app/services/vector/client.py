from functools import lru_cache

import chromadb
from langchain_chroma import Chroma
from langchain_ollama import OllamaEmbeddings

from ...core.config import settings

COLLECTION_NAME = "pension_docs"


@lru_cache(maxsize=1)
def get_embeddings() -> OllamaEmbeddings:
    return OllamaEmbeddings(
        model=settings.OLLAMA_EMBED_MODEL,
        base_url=settings.OLLAMA_BASE_URL,
    )


@lru_cache(maxsize=1)
def get_chroma_client() -> chromadb.HttpClient:
    return chromadb.HttpClient(host=settings.CHROMA_HOST, port=settings.CHROMA_PORT)


def get_vector_store() -> Chroma:
    return Chroma(
        client=get_chroma_client(),
        collection_name=COLLECTION_NAME,
        embedding_function=get_embeddings(),
    )
