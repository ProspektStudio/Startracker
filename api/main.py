from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import asyncio
from uvicorn.logging import logging as uvicorn_logging
from langchain.schema import AIMessage
from models import generate_prompt, gemini_content_stream, rag_satellite_agent
logger = uvicorn_logging.getLogger("uvicorn")

app = FastAPI()

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

@app.get("/api/satellite-info-llm")
async def get_satellite_info_llm(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    prompt = generate_prompt(group, name)

    async def generate_satellite_info_stream(prompt):
        try:
            for chunk in gemini_content_stream(prompt):
                if chunk.text:
                    yield chunk.text
                    await asyncio.sleep(0) # Simulate work and allow event loop to switch
        except Exception as e:
            print(f"An error occurred: {e}")
            yield f"Error: {e}\n\n"

    return StreamingResponse(
        generate_satellite_info_stream(prompt),
        media_type="text/event-stream"
    )

@app.get("/api/satellite-info-rag")
async def get_satellite_info_rag(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    prompt = generate_prompt(group, name)

    async def generate_satellite_info_stream(prompt):
        try:
            for chunk in rag_satellite_agent.ask(prompt):
                if "messages" in chunk and chunk["messages"]:
                    message = chunk["messages"][-1]
                    if isinstance(message, AIMessage) or (isinstance(message, dict) and message.get("role") == "assistant"):
                        full_response = message["content"] if isinstance(message, dict) else message.content
                        yield full_response
        except Exception as e:
            print(f"An error occurred: {e}")
            yield f"Error: {e}\n\n"

    return StreamingResponse(
        generate_satellite_info_stream(prompt),
        media_type="text/event-stream"
    )
