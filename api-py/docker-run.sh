#!/bin/bash
set -e

docker build -t startracker-api:dev . && \
docker run -it --rm --name startracker-api-dev \
           -v $(pwd)/chroma_db:/app/chroma_db \
           -p 8000:8000 \
           startracker-api:dev
