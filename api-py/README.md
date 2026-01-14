# Python API

## Setup

### Prerequisites
- Python 3.11 or higher
- poetry (Python package manager)
- Docker (optional, for containerized deployment)

### Environment Setup

1. Install dependencies with poetry:
```bash
poetry install
```

3. Set up environment variables:
Create a `.env` file in the api directory with the following variables:
```
LLM_API_KEY="<YOUR_OPENAI_API_KEY>"
```

### Running the API

#### Development Mode
```bash
./dev.sh
```

2. Run the container:
```bash
./docker-run.sh
```

### API Documentation
Once the server is running, you can access the API documentation at:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Project Structure
- `main.py` - FastAPI application entry point
- `models.py` - Data models and schemas
- `rag_agent.py` - RAG (Retrieval-Augmented Generation) implementation
- `cognee_agent.py` - Cognee agent implementation
- `doc_loader.py` - Document loading utilities
