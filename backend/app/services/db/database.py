from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker

from ...core.config import settings

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)

# Sync engine for LangGraph tool threads (avoids event-loop conflicts with asyncio)
_sync_url = settings.DATABASE_URL.replace("postgresql+asyncpg://", "postgresql+psycopg2://")
sync_engine = create_engine(_sync_url, pool_pre_ping=True)
SyncSessionLocal = sessionmaker(sync_engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from . import models  # noqa: F401 — registers all ORM models before create_all

    async with engine.begin() as conn:
        # Create any tables that don't yet exist (idempotent, never drops/modifies existing)
        await conn.run_sync(Base.metadata.create_all)

        # Idempotent column migrations — safe to run on every startup.
        # create_all handles new tables; these handle new columns on existing tables.
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ"
        ))
        await conn.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS login_count INTEGER NOT NULL DEFAULT 0"
        ))
        # Ensure the login_events table grants full access to the retirement role
        await conn.execute(text(
            "GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO retirement"
        ))
        await conn.execute(text(
            "GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO retirement"
        ))


async def close_engines() -> None:
    """Dispose both async and sync connection pools. Called on application shutdown."""
    await engine.dispose()
    sync_engine.dispose()
