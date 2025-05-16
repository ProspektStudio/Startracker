from fastapi import FastAPI, Query
from dotenv import load_dotenv
import os
from google import genai
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
from rag_agent import RagAgent
from uvicorn.logging import logging as uvicorn_logging

logger = uvicorn_logging.getLogger("uvicorn")

app = FastAPI()

# set up the gemini client
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = "gemini-2.0-flash"
gemini_client = genai.Client(api_key=GEMINI_API_KEY)

# RagAgent Config

topic = 'Satellites'

embeddings_model = "text-embedding-004"
webpage_documents = [
    'https://www.nasa.gov/general/what-is-a-satellite/',
    'https://en.wikipedia.org/wiki/Satellite'
]

llm_model_provider = "google_genai"
llm_model = GEMINI_MODEL
rag_agent = RagAgent(
    topic=topic,
    llm_model=llm_model,
    llm_model_provider=llm_model_provider,
    embeddings_model=embeddings_model,
    webpage_documents=webpage_documents,
    logger=logger
)
logger.info("RAG Agent initialized")

# set cors
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/hello")
async def read_root():
    return {"message": "Hello World"} 

@app.get("/api/satellite-info")
async def get_satellite_info(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    response = gemini_client.models.generate_content(model=GEMINI_MODEL, contents=f"Give me information about the satellite {name} in the group {group}")
    return {
        "satellite_info": response.text
    }

@app.get("/api/satellite-info-stream")
async def get_satellite_info_stream(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    async def generate_satellite_info_stream(prompt):
        try:
            for chunk in gemini_client.models.generate_content_stream(
                model=GEMINI_MODEL,
                contents=prompt
            ):
                if chunk.text:
                    yield chunk.text
                    await asyncio.sleep(0) # Simulate work and allow event loop to switch
        except Exception as e:
            print(f"An error occurred: {e}")
            yield f"Error: {e}\n\n"

    prompt = f"Give me information about the satellite {name} in the group {group}"

    return StreamingResponse(
        generate_satellite_info_stream(prompt),
        media_type="text/event-stream"
    )

@app.get("/api/satellite-info-rag")
async def get_satellite_info_rag(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    response = rag_agent.ask(f"Give me information about the satellite {name} in the group {group}")
    return {
        "satellite_info": response.text
    }
