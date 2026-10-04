from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    app_env: str = "production"
    app_secret: str
    database_url: str
    google_maps_api_key: str
    cors_origins: str = ""
    overpass_url: str = "https://overpass-api.de/api/interpreter"
    jwt_expire_minutes: int = 60 * 24 * 7

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

settings = Settings()
