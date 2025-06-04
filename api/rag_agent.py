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

logger = uvicorn_logging.getLogger("uvicorn")

EMBEDDINGS_MODEL = "text-embedding-004"
WEB_PAGES = [
    'https://www.nasa.gov/general/what-is-a-satellite/',
    'https://en.wikipedia.org/wiki/Satellite',
    'https://www.spacex.com/vehicles/dragon/',
    'https://en.wikipedia.org/wiki/SpaceX_Dragon',
    'https://en.wikipedia.org/wiki/SpaceX_Dragon_2',
    'https://en.wikipedia.org/wiki/SpaceX_Crew-10'
]

class RagAgent:
    def __init__(
        self,
        topic: str,
        llm_model: str = None,
        llm_model_provider: str = None,
        embeddings_model: str = EMBEDDINGS_MODEL,
        webpage_documents: list[str] = WEB_PAGES,
    ):
        if not topic:
            raise ValueError("Topic cannot be empty")
            
        logger.info(f"Initializing RAG Agent for topic: {topic}")
        
        # Core configuration
        system_prompt = """You are an expert in the topic of {topic} and you are here to answer any questions you have regarding the topic.
Use the following pieces of retrieved context to answer the question.
Give as much relevant information as possible.
Context: {context}:"""
        
        # Initialize components
        # 1. Set up embeddings and vector store
        embeddings = VertexAIEmbeddings(model=embeddings_model)
        self.vector_store = InMemoryVectorStore(embeddings)
        
        # Load and process documents if provided
        if webpage_documents:
            loader = WebBaseLoader(web_paths=webpage_documents)
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            all_splits = text_splitter.split_documents(docs)
            _ = self.vector_store.add_documents(documents=all_splits)
            logger.info(f"Loaded {len(all_splits)} document chunks into vector store")
        
        # 2. Set up language model
        llm = init_chat_model(llm_model, model_provider=llm_model_provider)
        
        # 3. Set up memory
        memory = MemorySaver()
        
        # 4. Set up agent with all components
        self.agent_executor = create_react_agent(
            model=llm,
            tools=[self.generate_retrieve_tool()],
            prompt=system_prompt,
            checkpointer=memory
        )
        
        logger.info(f"RAG Agent initialized for topic: {topic}")

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
