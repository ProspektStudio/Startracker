FROM python:3.11-slim
WORKDIR /app

# Create directory for local chroma_db
RUN mkdir -p /app/chroma_db

# Install Poetry
RUN pip install poetry

# Configure Poetry to not create a virtual environment in Docker
RUN poetry config virtualenvs.create false

# Copy application code
COPY . .

# Install dependencies
RUN poetry install --no-interaction --no-ansi

EXPOSE 8000

CMD ["poetry", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
