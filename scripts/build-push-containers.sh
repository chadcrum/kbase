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

# Hard-coded repository
REPOSITORY="ghcr.io/chadcrum/kbase"

# Get short commit hash
COMMIT_HASH=$(git rev-parse --short HEAD)

# Image tags
IMAGE_LATEST="${REPOSITORY}:latest"
IMAGE_COMMIT="${REPOSITORY}:${COMMIT_HASH}"

# Log in to GitHub Container Registry
echo "Logging into GHCR..."
# Use the token as password; username can be any non-empty string (github.actor works in CI)
USERNAME="${GITHUB_ACTOR:-github}"  # fallback for local use
echo "$GITHUB_TOKEN" | podman login ghcr.io -u "$USERNAME" --password-stdin

# Build the podman image using the Containerfile
echo "Building podman image $IMAGE_LATEST..."
# Context is repository root, podmanfile is Containerfile
podman build -f Containerfile -t "$IMAGE_LATEST" .

# Tag with commit hash
echo "Tagging image as $IMAGE_COMMIT..."
podman tag "$IMAGE_LATEST" "$IMAGE_COMMIT"

# Push both tags to GHCR
echo "Pushing podman image $IMAGE_LATEST..."
podman push "$IMAGE_LATEST"

echo "Pushing podman image $IMAGE_COMMIT..."
podman push "$IMAGE_COMMIT"

echo "✅ Build and push completed successfully."

