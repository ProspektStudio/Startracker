# Retrieval augmented generation (RAG)
# https://python.langchain.com/docs/concepts/rag/

from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage, AIMessageChunk
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from uvicorn.logging import logging as uvicorn_logging
from .doc_loader import load_webpages

logger = uvicorn_logging.getLogger("uvicorn")

# Model and file configuration
EMBEDDINGS_MODEL = "text-embedding-004"

# RAG configuration
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200
SIMILARITY_SEARCH_K = 10
LLM_TEMPERATURE = 0.0

SYSTEM_PROMPT_FOR_COMBINED_TOOL = """
You have access to the following tools:
1.  **`combined_search`**: Use this tool to provide a comprehensive response that combines both document-specific information and general knowledge. This tool will:
    * First search the document collection for relevant information
    * Then supplement the response with additional general knowledge
    * Present both pieces of information in a unified response
"""

class RagAgent:
    def __init__(
        self,
        base_prompt: str,
        llm_model: str = None,
        llm_model_provider: str = None
    ):

        logger.info(f"Initializing RAG Agent...")

        # Initialize components
        # 1. Set up embeddings and vector store
        embeddings = VertexAIEmbeddings(model=EMBEDDINGS_MODEL)
        self.vector_store = InMemoryVectorStore(embeddings)

        # Load and preprocess documents
        cleaned_docs = load_webpages()

        # Split and store cleaned documents
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=CHUNK_SIZE, chunk_overlap=CHUNK_OVERLAP)
        all_splits = text_splitter.split_documents(cleaned_docs)
        _ = self.vector_store.add_documents(documents=all_splits)
        logger.info(f"Split into {len(all_splits)} chunks and loaded into vector store")

        # 2. Set up language model
        self.llm = init_chat_model(
          llm_model,
          model_provider=llm_model_provider,
          temperature=LLM_TEMPERATURE
        )

        # 3. Set up memory
        memory = MemorySaver()

        # 4. Create agent executor
        system_prompt = base_prompt+SYSTEM_PROMPT_FOR_COMBINED_TOOL
        self.agent_executor = create_react_agent(
            model=self.llm,
            tools=[self.generate_combined_tool()],
            prompt=system_prompt,
            checkpointer=memory
        )

        logger.info(f"RAG Agent initialized with system prompt: \n\n{system_prompt}")

    def generate_combined_tool(self):
        @tool(response_format="content_and_artifact")
        def combined_search(query: str) -> tuple[str, list]:
            """
            Use this tool to get a comprehensive response by combining both document retrieval
            and general knowledge. This tool will first search the document collection and then
            supplement with general knowledge if needed.
            """

            # First, try to retrieve from documents
            retrieved_docs = self.vector_store.similarity_search(query, k=SIMILARITY_SEARCH_K)
            doc_content = ""

            if retrieved_docs:
                doc_content = "\n\n".join(
                    (f"Source: {doc.metadata.get('source', 'Unknown source')}\n"
                     f"Content: {doc.page_content}")
                    for doc in retrieved_docs
                )

            # Then, get general knowledge response
            message = HumanMessage(content=query)
            try:
                general_knowledge = self.llm.invoke([message]).content

                # Combine both responses
                combined_response = f"Document Information:\n{doc_content}\n\nAdditional General Knowledge:\n{general_knowledge}"
                logger.info(f"Completed combined search for query")
                return combined_response, retrieved_docs
            except Exception as e:
                logger.error(f"Error in combined search: {e}")
                return f"Error: {str(e)}", []

        return combined_search

    async def ask(self, prompt: str):
        """
        Sends a prompt to the agent and streams the final LLM response.
        """
        logger.info(f"User Prompt: {prompt}")

        # Track if we're in a tool call
        in_tool_call = False

        # `astream_events` provides a stream of events. We're interested in LLM token chunks.
        # `version="v2"` is recommended for richer event data.
        async for event in self.agent_executor.astream_events(
            {"messages": [HumanMessage(content=prompt)]},
            version="v2",
            config={"configurable": {"thread_id": "example_thread"}} # thread_id for memory
        ):
            kind = event["event"]

            if kind == "on_tool_start":
                in_tool_call = True
            elif kind == "on_tool_end":
                in_tool_call = False
            elif kind == "on_chat_model_stream" and not in_tool_call:
                # This event contains chunks from the LLM.
                chunk = event["data"]["chunk"]
                if isinstance(chunk, AIMessageChunk):
                    # Only yield content if we're not in a tool call
                    if chunk.content:
                        yield chunk.content
