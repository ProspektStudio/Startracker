import os
from dotenv import load_dotenv
from google import genai
from rag_agent import RagAgent

load_dotenv()

# Common Config

GEMINI_MODEL = "gemini-2.0-flash"

def generate_prompt(group: str, name: str):
  return f"Give me information about the satellite {name} in the group {group}"

# Gemini Config

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def gemini_content_stream(prompt: str):
  return gemini_client.models.generate_content_stream(
      model=GEMINI_MODEL,
      contents=prompt
  )

# RAG Agent Config

topic = 'Satellites'

embeddings_model = "text-embedding-004"
webpage_documents = [
    'https://www.nasa.gov/general/what-is-a-satellite/',
    'https://en.wikipedia.org/wiki/Satellite',
    'https://www.spacex.com/vehicles/dragon/',
    'https://en.wikipedia.org/wiki/SpaceX_Dragon',
    'https://en.wikipedia.org/wiki/SpaceX_Dragon_2',
    'https://en.wikipedia.org/wiki/SpaceX_Crew-10'
]

llm_model_provider = "google_genai"

rag_satellite_agent = RagAgent(
    topic=topic,
    embeddings_model=embeddings_model,
    webpage_documents=webpage_documents,
    llm_model=GEMINI_MODEL,
    llm_model_provider=llm_model_provider
)
