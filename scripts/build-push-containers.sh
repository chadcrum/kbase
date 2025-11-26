#!/usr/bin/env bash

# Exit on any error, treat unset variables as errors, and pipe failures as errors
set -euo pipefail

# Load environment variables from .env if present (ignore if missing)
if [[ -f ".env" ]]; then
  # shellcheck disable=SC1091
  source .env
fi

# Ensure required environment variables are set
: "${GITHUB_TOKEN:?GITHUB_TOKEN is required in .env or environment}"
: "${GITHUB_REPOSITORY:?GITHUB_REPOSITORY is required (owner/repo)}"

# Optional tag, default to 'latest'
TAG="${TAG:-latest}"

# Docker image name
IMAGE="ghcr.io/${GITHUB_REPOSITORY}:${TAG}"

# Log in to GitHub Container Registry
echo "Logging into GHCR..."
# Use the token as password; username can be any non-empty string (github.actor works in CI)
USERNAME="${GITHUB_ACTOR:-github}"  # fallback for local use
echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$USERNAME" --password-stdin

# Build the Docker image using the Containerfile
echo "Building Docker image $IMAGE..."
# Context is repository root, Dockerfile is Containerfile
docker build -f Containerfile -t "$IMAGE" .

# Push the image to GHCR
echo "Pushing Docker image $IMAGE..."
docker push "$IMAGE"

echo "✅ Build and push completed successfully."

