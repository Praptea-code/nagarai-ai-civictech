from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    HF_NLP_MODEL: str = "facebook/bart-large-mnli"
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"


settings = Settings()
