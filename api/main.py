from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from uvicorn.logging import logging as uvicorn_logging
from models import gemini_content_stream, rag_content_stream, initialize_rag_agent#, cag_content_stream
from typing import AsyncGenerator, Callable

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


@app.on_event("startup")
async def startup_event():
    """Initialize RAG agent asynchronously on server startup."""
    logger.info("Starting RAG agent initialization in background...")
    # Start initialization as a background task (non-blocking)
    # The server will start immediately, and RAG will be ready when initialization completes
    import asyncio
    
    async def init_with_error_handling():
        try:
            await initialize_rag_agent()
            logger.info("RAG agent initialization completed successfully")
        except Exception as e:
            logger.error(f"RAG agent initialization failed: {e}", exc_info=True)
            # Server continues to run, but RAG endpoints will fail until retried
    
    asyncio.create_task(init_with_error_handling())


@app.get("/api/hello")
async def read_root():
    return {"message": "Hello World"} 


@app.get("/api/satellite-info-llm")
async def get_satellite_info_llm(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    return StreamingResponse(
        generate_satellite_info_stream(name, gemini_content_stream),
        media_type="text/event-stream"
    )


@app.get("/api/satellite-info-rag")
async def get_satellite_info_rag(
    group: str = Query(..., min_length=1, max_length=50),
    name: str = Query(..., min_length=1, max_length=50)
):
    return StreamingResponse(
        generate_satellite_info_stream(name, rag_content_stream),
        media_type="text/event-stream"
    )


# @app.get("/api/satellite-info-cag")
# async def get_satellite_info_cag(
#     group: str = Query(..., min_length=1, max_length=50),
#     name: str = Query(..., min_length=1, max_length=50)
# ):
#     return StreamingResponse(
#         generate_satellite_info_stream(name, cag_content_stream),
#         media_type="text/event-stream"
#     )


async def generate_satellite_info_stream(name: str, content_stream_func: Callable[[str], AsyncGenerator[str, None]]):
    try:
        async for chunk in content_stream_func(name):
            if chunk:
                yield chunk
    except Exception as e:
        print(f"An error occurred: {e}")
        yield f"Error: {e}\n\n"
