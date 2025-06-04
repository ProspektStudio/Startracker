import os
from dotenv import load_dotenv
from google import genai
from rag_agent import RagAgent

load_dotenv()

# Common Config

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_MODEL_PROVIDER = "google_genai"

BASE_PROMPT = """You are an expert in the topic of satellites and space stations.
You are here to answer any questions you have regarding the topic.
Give a short one-paragraph answer with the most recent information."""

def generate_prompt(group: str, name: str):
  prompt = f"Give me information about {name}"
  return prompt

# Gemini Config

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def gemini_content_stream(group: str, name: str):
  prompt = generate_prompt(group, name)
  
  contents = [
    {"parts": [{"text": BASE_PROMPT + "\n" + prompt}]}
  ]

  return gemini_client.models.generate_content_stream(
      model=GEMINI_MODEL,
      contents=contents
  )

# RAG Agent Config

rag_satellite_agent = RagAgent(
    base_prompt=BASE_PROMPT,
    llm_model=GEMINI_MODEL,
    llm_model_provider=GEMINI_MODEL_PROVIDER
)

async def rag_content_stream(group: str, name: str):
    prompt = generate_prompt(group, name)
    async for chunk in rag_satellite_agent.ask(prompt):
        if chunk:
            yield chunk
