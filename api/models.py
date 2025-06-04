import os
from dotenv import load_dotenv
from google import genai
from rag_agent import RagAgent

load_dotenv()

# Common Config

GEMINI_MODEL = "gemini-2.0-flash"
GEMINI_MODEL_PROVIDER = "google_genai"

SYSTEM_PROMPT = """You are an expert in the topic of satellites and space stations.
You are here to answer any questions you have regarding the topic.
Give a short one-paragraph answer with the most relevant information.
Use the following pieces of retrieved context to answer the question.
Give as much relevant information as possible.
Context: {context}:"""

def generate_prompt(group: str, name: str):
  prompt = f"Give me information about the satellite {name} in the group {group}"
  return prompt

# Gemini Config

gemini_client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

def gemini_content_stream(group: str, name: str):
  prompt = generate_prompt(group, name)
  
  contents = [
    {"parts": [{"text": SYSTEM_PROMPT + "\n" + prompt}]}
  ]

  return gemini_client.models.generate_content_stream(
      model=GEMINI_MODEL,
      contents=contents
  )

# RAG Agent Config

rag_satellite_agent = RagAgent(
    system_prompt=SYSTEM_PROMPT,
    llm_model=GEMINI_MODEL,
    llm_model_provider=GEMINI_MODEL_PROVIDER
)

def rag_content_stream(group: str, name: str):
  prompt = generate_prompt(group, name)

  return rag_satellite_agent.ask(prompt)
