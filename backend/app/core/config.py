from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://skillforge:skillforge@localhost:5432/skillforge"
    anthropic_api_key: str = ""
    judge0_rapidapi_key: str = ""
    judge0_base_url: str = "https://judge0-ce.p.rapidapi.com"
    judge0_rapidapi_host: str = "judge0-ce.p.rapidapi.com"

    # behavioral thresholds shared by frontend expectations and backend metrics
    idle_threshold_seconds: int = 20
    snapshot_interval_seconds: int = 25

    class Config:
        env_file = ".env"


settings = Settings()
