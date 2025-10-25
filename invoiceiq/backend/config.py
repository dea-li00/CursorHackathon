import os
from typing import List
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # Engine configuration
    ENGINE_PRIORITY: List[str] = os.getenv("ENGINE_PRIORITY", "prebuilt,llm,layout").split(",")
    
    # Azure Document Intelligence
    AZURE_DI_ENDPOINT: str = os.getenv("AZURE_DI_ENDPOINT", "")
    AZURE_DI_KEY: str = os.getenv("AZURE_DI_KEY", "")
    
    # OpenAI
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
    
    # OCR
    TESSERACT_CMD: str = os.getenv("TESSERACT_CMD", "/usr/bin/tesseract")
    
    # App settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production")
    CONF_THRESHOLD_HIGH: float = float(os.getenv("CONF_THRESHOLD_HIGH", "0.90"))
    CONF_THRESHOLD_LOW: float = float(os.getenv("CONF_THRESHOLD_LOW", "0.75"))
    PORT: int = int(os.getenv("PORT", "8000"))
    
    # File storage
    UPLOAD_DIR: str = "uploads"
    EXPORT_DIR: str = "exports"
    
    @property
    def has_azure_di(self) -> bool:
        return bool(self.AZURE_DI_ENDPOINT and self.AZURE_DI_KEY)
    
    @property
    def has_openai(self) -> bool:
        return bool(self.OPENAI_API_KEY)

settings = Settings()
