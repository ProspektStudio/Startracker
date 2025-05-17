#!/bin/bash
set -e

docker build -t startracker-api:dev . && docker run -p 8000:8000 startracker-api:dev