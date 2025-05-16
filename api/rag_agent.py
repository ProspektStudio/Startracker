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
from dotenv import load_dotenv

load_dotenv()
logger = uvicorn_logging.getLogger("uvicorn")

# RagAgent Config

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
llm_model = "gemini-2.0-flash"

class RagAgent:
    def __init__(
        self,
        topic,
        embeddings_model=None,
        webpage_documents=None,
        llm_model=None,
        llm_model_provider=None,
    ):
        self.topic = topic
        self.system_prompt = """You are an expert in the topic of {topic} and you are here to answer any questions you have regarding the topic.
Use the following pieces of retrieved context to answer the question.
Give as much relevant information as possible.
Context: {context}:"""
        self.greeting = f"Hello! I am an expert in {topic}. Ask me any questions you have regarding the topic."
        self.llm_model = llm_model
        self.llm_model_provider = llm_model_provider
        self.embeddings_model = embeddings_model
        self.webpage_documents = webpage_documents
        self.vector_store = None
        self.llm = None
        self.memory = None
        self.agent_executor = None
        self.config = {"configurable": {"thread_id": "def234"}}

        # Initialize components
        self._setup_retrieval()
        self._setup_llm()
        self._setup_memory()
        self._setup_agent()
        
        logger.info(f"RAG Agent initialized for topic: {topic}")

    def _setup_retrieval(self):
        """Set up the retrieval components."""
        embeddings = VertexAIEmbeddings(model=self.embeddings_model)
        self.vector_store = InMemoryVectorStore(embeddings)
        
        if self.webpage_documents:
            loader = WebBaseLoader(web_paths=self.webpage_documents)
            docs = loader.load()
            text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
            all_splits = text_splitter.split_documents(docs)
            _ = self.vector_store.add_documents(documents=all_splits)
            logger.info(f"Loaded {len(all_splits)} document chunks into vector store")
    
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
    
    def _setup_llm(self):
        """Set up the language model."""
        self.llm = init_chat_model(self.llm_model, model_provider=self.llm_model_provider)
    
    def _setup_memory(self):
        """Set up the memory component."""
        self.memory = MemorySaver()
    
    def _setup_agent(self):
        """Set up the agent executor."""
        self.agent_executor = create_react_agent(
            model=self.llm, 
            tools=[self.generate_retrieve_tool()], 
            prompt=self.system_prompt,
            checkpointer=self.memory
        )

    def ask(self, query):
        """Ask the agent the given query."""
        return self.agent_executor.stream(
            {"messages": [{"role": "user", "content": query}]},
            stream_mode="values",
            config=self.config
        )

rag_satellite_agent = RagAgent(
    topic=topic,
    embeddings_model=embeddings_model,
    webpage_documents=webpage_documents,
    llm_model=llm_model,
    llm_model_provider=llm_model_provider
)
