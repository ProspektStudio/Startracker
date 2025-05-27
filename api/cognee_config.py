import os
from dotenv import load_dotenv

load_dotenv()

COGNEE_CONFIG = {
    "llm": {
        "provider": "gemini",
        "model": "gemini-pro",
        "api_key": os.getenv('GOOGLE_API_KEY'),
    },
    "embedding": {
        "provider": "vertexai",
        "model": "textembedding-gecko@latest",
        "api_key": os.getenv('GOOGLE_API_KEY'),
        "project_id": os.getenv('GOOGLE_CLOUD_PROJECT'),
        "location": "us-central1"
    }
}