import os
from dotenv import load_dotenv
from google import genai
from rag_agent import RagAgent

load_dotenv()

# Common Config

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_MODEL_PROVIDER = "google_genai"

def generate_prompt(group: str, name: str):
  return f"Give me information about the satellite {name} in the group {group}"

# Gemini Config

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def gemini_content_stream(group: str, name: str):
  prompt = generate_prompt(group, name)

  return gemini_client.models.generate_content_stream(
      model=GEMINI_MODEL,
      contents=prompt
  )

# RAG Agent Config

rag_satellite_agent = RagAgent(
    topic='Satellites',
    llm_model=GEMINI_MODEL,
    llm_model_provider=GEMINI_MODEL_PROVIDER
)

def rag_content_stream(group: str, name: str):
  prompt = generate_prompt(group, name)

  return rag_satellite_agent.ask(prompt)
