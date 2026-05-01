from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://retirement:retirement@localhost:5432/retirement_db"
    CHROMA_HOST: str = "localhost"
    CHROMA_PORT: int = 8001
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_MODEL: str = "gpt-oss:120b-cloud"
    OLLAMA_EMBED_MODEL: str = "nomic-embed-text"
    model_config = {"env_file": ".env"}


settings = Settings()
