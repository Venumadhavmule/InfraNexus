from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # === Feature Toggles ===
    KUZU_ENABLED: bool = False
    REDIS_ENABLED: bool = False
    MEILI_ENABLED: bool = False
    ETL_ENABLED: bool = False

    # Kuzu
    KUZU_DB_PATH: str = "./data/kuzu"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"

    # Meilisearch
    MEILI_URL: str = "http://localhost:7700"
    MEILI_MASTER_KEY: str = "infranexus-dev-key"

    # ServiceNow
    SNOW_INSTANCE: str = ""
    SNOW_USERNAME: str = ""
    SNOW_PASSWORD: str = ""

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # CORS
    CORS_ORIGINS: list[str] = Field(default=["http://localhost:3000"])

    # Rate Limiting
    RATE_LIMIT_PER_MIN: int = 100

    # Cache TTLs (seconds)
    CACHE_NEIGHBORHOOD_TTL: int = 300
    CACHE_CI_TTL: int = 600
    CACHE_SEARCH_TTL: int = 60

    # ETL
    ETL_SYNC_INTERVAL_MIN: int = 30
    ETL_STATE_PATH: str = "./data/etl_state.json"
    ETL_BOOTSTRAP_IF_EMPTY: bool = True

    # Graph Defaults
    MAX_NODES_DEFAULT: int = 500
    MAX_NODES_LIMIT: int = 2000
    DEGREE_THRESHOLD_DEFAULT: int = 50


settings = Settings()
