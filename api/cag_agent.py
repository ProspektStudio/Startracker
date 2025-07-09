# Cache-Augmented Generation (CAG)

import logging
from doc_loader import load_webpages
from typing import Optional, List
from google import genai
from google.genai import types
import asyncio

logger = logging.getLogger(__name__)

LLM_TEMPERATURE = 0.0

_cached_content_name = None

class CagAgent:
    def __init__(
        self,
        base_prompt: str,
        llm_model: Optional[str] = "gemini-1.5-flash-001"
    ):
        global _cached_content_name
            
        logger.info(f"Initializing CAG Agent...")
        
        # Initialize the client
        self.client = genai.Client()
        self.model_name = llm_model
        
        # Initialize components
        # 1. Load and preprocess documents with caching
        if _cached_content_name is None:
            logger.info("No cached content found. Loading and splitting documents to create cache.")
            cleaned_docs = load_webpages()
            
            # Extract page content for caching
            contents_for_cache = [doc.page_content for doc in cleaned_docs]
            
            # Create cached content
            try:
                cache = self.client.caches.create(
                    model=self.model_name,
                    config=types.CreateCachedContentConfig(
                        contents=contents_for_cache,
                        system_instruction=base_prompt,
                    ),
                )
                _cached_content_name = cache.name
                logger.info(f"Cached content created with name: {cache.name}")
            except Exception as e:
                logger.error(f"Error creating cached content: {e}")
                raise
        else:
            logger.info(f"Using cached content: {_cached_content_name}")
        
        logger.info(f"CAG Agent initialized with system prompt from cached content.")

    async def ask(self, prompt: str):
        """
        Sends a prompt to the agent and streams the final LLM response.
        """
        logger.info(f"User Prompt: {prompt}")
        
        try:
            # Generate content using the cached content
            stream = self.client.models.generate_content_stream(
                model=self.model_name,
                contents=prompt,
                config=types.GenerateContentConfig(
                    cached_content=_cached_content_name,
                    temperature=LLM_TEMPERATURE
                ),
            )

            for chunk in stream:
              if chunk.text:
                yield chunk.text
                await asyncio.sleep(0)
        except Exception as e:
            logger.error(f"Error in CAG ask: {e}")
            yield f"Error: {str(e)}"
