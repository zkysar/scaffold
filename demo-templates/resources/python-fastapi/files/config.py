from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    api_title: str = "{{API_TITLE}}"
    api_version: str = "{{API_VERSION}}"
    port: int = int("{{PORT}}")

settings = Settings()