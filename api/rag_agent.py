# Retrieval augmented generation (RAG)
# https://python.langchain.com/docs/concepts/rag/

from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from uvicorn.logging import logging as uvicorn_logging
import pprint

logger = uvicorn_logging.getLogger("uvicorn")

EMBEDDINGS_MODEL = "text-embedding-004"
WEB_PAGES_FILE = "webpages.txt"

def load_webpages(webpage_documents_file: str):
    webpage_documents = []
    with open(webpage_documents_file, "r") as f:
        for line in f:
            webpage_documents.append(line.strip())
    return webpage_documents

class RagAgent:
    def __init__(
        self,
        system_prompt: str,
        llm_model: str = None,
        llm_model_provider: str = None
    ):
        if not system_prompt:
            raise ValueError("System prompt cannot be empty")
            
        logger.info(f"Initializing RAG Agent...")
        
        # Initialize components
        # 1. Set up embeddings and vector store
        embeddings = VertexAIEmbeddings(model=EMBEDDINGS_MODEL)
        self.vector_store = InMemoryVectorStore(embeddings)
        
        # Load and process documents if provided
        if WEB_PAGES_FILE:
            web_pages = load_webpages(WEB_PAGES_FILE)
            loader = WebBaseLoader(web_paths=web_pages)
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            all_splits = text_splitter.split_documents(docs)
            _ = self.vector_store.add_documents(documents=all_splits)
            logger.info(f"Loaded {len(all_splits)} document chunks into vector store")
        else:
            raise Exception("No web pages provided, skipping vector store")
        
        # 2. Set up language model
        llm = init_chat_model(
          llm_model,
          model_provider=llm_model_provider,
          temperature=0.0
        )
        
        # 3. Set up memory
        memory = MemorySaver()
        
        # 4. Set up agent with all components
        self.agent_executor = create_react_agent(
            model=llm,
            tools=[self.generate_retrieve_tool()],
            prompt=system_prompt,
            checkpointer=memory
        )
        
        logger.info(f"RAG Agent initialized with system prompt: \n{system_prompt}")

    def generate_retrieve_tool(self):
        @tool(response_format="content_and_artifact")
        def retrieve(query: str):
            """Retrieve information related to a query."""
            retrieved_docs = self.vector_store.similarity_search(query)
            serialized = "\n\n".join(
                (f"Source: {doc.metadata}\n" f"Content: {doc.page_content}")
                for doc in retrieved_docs
            )
            return serialized, retrieved_docs
        
        return retrieve

    def ask(self, prompt: str):
        """Ask the agent the given query."""
        return self.agent_executor.stream(
            {"messages": [{"role": "user", "content": prompt}]},
            stream_mode="values",
            config={"configurable": {"thread_id": "default"}}
        )
