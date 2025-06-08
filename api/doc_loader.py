from uvicorn.logging import logging as uvicorn_logging
from langchain_community.document_loaders import WebBaseLoader

logger = uvicorn_logging.getLogger("uvicorn")

URLS_FILE = "urls.txt"
SEPARATORS = ['\n', '\r', '\t', '|', '•', '→', '←', '↑', '↓', '↔', '↕', '↖', '↗', '↘', '↙']

def load_webpages():
    webpage_urls = []
    with open(URLS_FILE, "r") as f:
        for line in f:
            webpage_urls.append(line.strip())

    # Load and process documents if provided
    logger.info(f"Using {len(webpage_urls)} URLs from {URLS_FILE}")
    
    loader = WebBaseLoader(web_paths=webpage_urls)
    docs = loader.load()
    logger.info(f"Loaded {len(docs)} documents")
    
    # Preprocess documents
    cleaned_docs = []
    for doc in docs:
        # Clean the content
        cleaned_content = _preprocess_content(doc.page_content)
        if cleaned_content:  # Only keep documents with content after cleaning
            doc.page_content = cleaned_content
            cleaned_docs.append(doc)
    logger.info(f"Cleaned {len(cleaned_docs)} documents")
    
    return cleaned_docs

def _preprocess_content(content: str) -> str:
    """
    Simple preprocessing: replace separators with spaces and clean whitespace.
    """
    if not content:
        return ""
        
    # Replace common separators with spaces
    for sep in SEPARATORS:
        content = content.replace(sep, ' ')
        
    # Clean up whitespace: replace multiple spaces with single space
    import re
    content = re.sub(r'\s+', ' ', content)
    
    return content.strip()
