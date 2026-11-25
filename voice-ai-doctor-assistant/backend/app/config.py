"""
app/config.py - Application configuration using python-dotenv
"""
import os
from typing import List
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    ELEVENLABS_API_KEY: str = os.getenv("ELEVENLABS_API_KEY", "")
    ELEVENLABS_VOICE_ID: str = os.getenv("ELEVENLABS_VOICE_ID", "")
    DATABASE_URL: str = os.getenv("DATABASE_URL", "./doctor_appointments.db")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
    ]

    def validate(self) -> None:
        """Raise if critical keys are missing."""
        missing = []
        if not self.GEMINI_API_KEY:
            missing.append("GEMINI_API_KEY")
        if not self.ELEVENLABS_API_KEY:
            missing.append("ELEVENLABS_API_KEY")
        if not self.ELEVENLABS_VOICE_ID:
            missing.append("ELEVENLABS_VOICE_ID")
        if missing:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing)}. "
                "Copy .env.example to .env and fill in your API keys."
            )


settings = Settings()
