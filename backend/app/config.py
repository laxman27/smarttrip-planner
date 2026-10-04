from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "production"
    app_secret: str
    database_url: str
    google_maps_api_key: str
    cors_origins: str = ""

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
