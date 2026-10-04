from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "production"
    app_secret: str
    database_url: str
    google_maps_api_key: str
    cors_origins: str = ""
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    jwt_expire_minutes: int = 60 * 24 * 7

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
