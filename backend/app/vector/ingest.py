import asyncio
import uuid
from datetime import datetime, timezone
from pathlib import Path

from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter

from ..core.logger import get_logger
from ..db.database import AsyncSessionLocal
from ..db.models import Document
from .client import get_vector_store

logger = get_logger("retirement.ingest")

DOCS_DIR = Path(__file__).parent.parent / "data" / "docs"
SPLITTER = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)


async def ingest_pdf_file(file_path: Path, original_name: str, uploaded_by: str | None = None) -> Document:
    doc_id = str(uuid.uuid4())

    def _load_and_embed():
        loader = PyPDFLoader(str(file_path))
        pages = loader.load()
        chunks = SPLITTER.split_documents(pages)
        for i, chunk in enumerate(chunks):
            chunk.metadata["document_id"] = doc_id
            chunk.metadata["filename"] = original_name
            chunk.metadata["page"] = chunk.metadata.get("page", 0)
            chunk.metadata["chunk_index"] = i
        vs = get_vector_store()
        vs.add_documents(chunks)
        return len(chunks)

    chunk_count = await asyncio.get_event_loop().run_in_executor(None, _load_and_embed)

    async with AsyncSessionLocal() as db:
        doc = Document(
            id=doc_id,
            filename=file_path.name,
            original_name=original_name,
            chunk_count=chunk_count,
            status="ingested",
            ingested_at=datetime.now(timezone.utc),
            uploaded_by=uploaded_by,
        )
        db.add(doc)
        await db.commit()
        await db.refresh(doc)
        return doc


async def ingest_startup_documents():
    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    pdf_files = list(DOCS_DIR.glob("*.pdf"))
    if not pdf_files:
        logger.info("No PDFs found in %s — skipping startup ingestion", DOCS_DIR)
        return

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        result = await db.execute(select(Document.filename))
        already_ingested = {row[0] for row in result.fetchall()}

    for pdf_path in pdf_files:
        if pdf_path.name in already_ingested:
            logger.info("Skipping already-ingested document: %s", pdf_path.name)
            continue
        try:
            doc = await ingest_pdf_file(pdf_path, pdf_path.name, uploaded_by="system")
            logger.info("Ingested %s — %d chunks", pdf_path.name, doc.chunk_count)
        except Exception as exc:
            logger.error("Failed to ingest %s: %s", pdf_path.name, exc)
