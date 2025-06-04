#!/bin/bash
set -e

# require version number as argument
if [ -z "$1" ]; then
    echo "Usage: $0 <version> Current images:"
    docker images | grep us-south1-docker.pkg.dev/prospekt-studio/startracker/startracker-api
    exit 1
fi

version=$1

# build for linux/amd64
docker buildx build --platform linux/amd64 -t startracker-api:${version} .

docker tag startracker-api:${version} us-south1-docker.pkg.dev/prospekt-studio/startracker/startracker-api:${version}

docker push us-south1-docker.pkg.dev/prospekt-studio/startracker/startracker-api:${version}

echo "Pushed startracker-api:${version} to us-south1-docker.pkg.dev/prospekt-studio/startracker/startracker-api:${version}"
