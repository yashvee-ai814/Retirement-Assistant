import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db.database import get_db
from ..db.models import Document
from ..vector.client import get_chroma_client, COLLECTION_NAME
from ..vector.ingest import DOCS_DIR, ingest_pdf_file
from .models import DocumentInfo

documents_router = APIRouter(prefix="/admin", tags=["documents"])


def _doc_to_info(doc: Document) -> DocumentInfo:
    return DocumentInfo(
        id=doc.id,
        original_name=doc.original_name,
        chunk_count=doc.chunk_count,
        status=doc.status,
        ingested_at=doc.ingested_at.isoformat() if doc.ingested_at else None,
        uploaded_by=doc.uploaded_by,
    )


@documents_router.post("/documents", response_model=DocumentInfo)
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
) -> DocumentInfo:
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    DOCS_DIR.mkdir(parents=True, exist_ok=True)
    suffix = str(uuid.uuid4())[:8]
    safe_name = f"{suffix}_{file.filename}"
    file_path = DOCS_DIR / safe_name

    contents = await file.read()
    file_path.write_bytes(contents)

    doc = await ingest_pdf_file(file_path, file.filename, uploaded_by="admin")
    return _doc_to_info(doc)


@documents_router.get("/documents", response_model=list[DocumentInfo])
async def list_documents(db: AsyncSession = Depends(get_db)) -> list[DocumentInfo]:
    result = await db.execute(
        select(Document).order_by(Document.ingested_at.desc().nullslast())
    )
    return [_doc_to_info(d) for d in result.scalars().all()]


@documents_router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Document).where(Document.id == doc_id))
    doc = result.scalar_one_or_none()
    if doc is None:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        client = get_chroma_client()
        collection = client.get_collection(COLLECTION_NAME)
        collection.delete(where={"document_id": doc_id})
    except Exception:
        pass

    file_path = DOCS_DIR / doc.filename
    if file_path.exists():
        file_path.unlink()

    await db.delete(doc)
    await db.commit()
    return {"status": "deleted", "id": doc_id}
