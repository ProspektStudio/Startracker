# Retrieval augmented generation (RAG)
# https://python.langchain.com/docs/concepts/rag/

from langchain_core.tools import tool
from langchain_core.vectorstores import InMemoryVectorStore
from langchain_google_vertexai import VertexAIEmbeddings
from langchain_community.document_loaders import WebBaseLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain.chat_models import init_chat_model
from langchain_core.messages import HumanMessage # <-- Add this import
from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from uvicorn.logging import logging as uvicorn_logging

logger = uvicorn_logging.getLogger("uvicorn")

EMBEDDINGS_MODEL = "text-embedding-004"
WEB_PAGES_FILE = "webpages.txt"

SYSTEM_PROMPT_FOR_COMBINED_TOOL = """You have access to the following tools:
1.  **`combined_search`**: Use this tool to provide a comprehensive response that combines both document-specific information and general knowledge. This tool will:
    * First search the document collection for relevant information
    * Then supplement the response with additional general knowledge
    * Present both pieces of information in a unified response
"""

def load_webpages(webpage_documents_file: str):
    webpage_documents = []
    with open(webpage_documents_file, "r") as f:
        for line in f:
            webpage_documents.append(line.strip())
    return webpage_documents

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
        
        # Load and process documents if provided
        web_pages = load_webpages(WEB_PAGES_FILE)
        loader = WebBaseLoader(web_paths=web_pages)
        docs = loader.load()
        text_splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
        all_splits = text_splitter.split_documents(docs)
        _ = self.vector_store.add_documents(documents=all_splits)
        logger.info(f"Loaded {len(all_splits)} document chunks into vector store")
        
        # 2. Set up language model
        self.llm = init_chat_model(
          llm_model,
          model_provider=llm_model_provider,
          temperature=0.0
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
        
        logger.info(f"RAG Agent initialized with system prompt: \n{system_prompt}")

    def generate_combined_tool(self):
        @tool(response_format="content_and_artifact")
        def combined_search(query: str) -> tuple[str, list]:
            """
            Use this tool to get a comprehensive response by combining both document retrieval
            and general knowledge. This tool will first search the document collection and then
            supplement with general knowledge if needed.
            """
            logger.info(f"Performing combined search for query: {query}")
            
            # First, try to retrieve from documents
            retrieved_docs = self.vector_store.similarity_search(query, k=3)
            doc_content = ""
            
            if retrieved_docs:
                doc_content = "\n\n".join(
                    (f"Source: {doc.metadata.get('source', 'Unknown source')}\n"
                     f"Content: {doc.page_content}")
                    for doc in retrieved_docs
                )
            
            # Then, get general knowledge response
            message = HumanMessage(content=f"User query: {query}\nPlease provide additional general knowledge that complements the following document information:\n{doc_content}")
            try:
                general_knowledge = self.llm.invoke([message]).content
                
                # Combine both responses
                combined_response = f"Document Information:\n{doc_content}\n\nAdditional General Knowledge:\n{general_knowledge}"
                return combined_response, retrieved_docs
            except Exception as e:
                logger.error(f"Error in combined search: {e}")
                return f"Error: {str(e)}", []
        
        return combined_search

    def ask(self, prompt: str):
        logger.info(f"Sending prompt to system: {prompt}")
        return self.agent_executor.stream(
            {"messages": [{"role": "user", "content": prompt}]},
            stream_mode="values",
            config={"configurable": {"thread_id": "default"}} # Or a unique thread_id per session
        )
