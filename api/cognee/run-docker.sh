#!/bin/bash
set -e

docker build -t startracker-cognee:dev . && \
docker run -it --rm \
    --name startracker-cognee-dev \
    -p 8000:8000 \
    startracker-cognee:dev
