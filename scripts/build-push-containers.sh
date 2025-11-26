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

# Verify we're in the repository root and Containerfile exists
if [[ ! -f "Containerfile" ]]; then
  echo "❌ Error: Containerfile not found. Please run this script from the repository root."
  exit 1
fi

# Remove existing images with the same tags to ensure clean build
echo "Removing existing images with same tags (if any)..."
podman rmi "$IMAGE_LATEST" 2>/dev/null || true
podman rmi "$IMAGE_COMMIT" 2>/dev/null || true

# Build the podman image using the Containerfile
echo "Building podman image $IMAGE_LATEST..."
echo "Build context: $(pwd)"
echo "Containerfile: Containerfile"
# Context is repository root, Containerfile is Containerfile
# Match GitHub Actions workflow: context: ., file: Containerfile
# Use --no-cache to ensure fresh build matching GitHub Actions (can be removed for faster builds)
podman build --no-cache -f Containerfile -t "$IMAGE_LATEST" .

# Verify the image was built correctly
echo "Verifying image CMD..."
podman inspect "$IMAGE_LATEST" --format '{{.Config.Cmd}}' || echo "Warning: Could not inspect image CMD"

# Tag with commit hash
echo "Tagging image as $IMAGE_COMMIT..."
podman tag "$IMAGE_LATEST" "$IMAGE_COMMIT"

# Push both tags to GHCR
echo "Pushing podman image $IMAGE_LATEST..."
podman push "$IMAGE_LATEST"

echo "Pushing podman image $IMAGE_COMMIT..."
podman push "$IMAGE_COMMIT"

echo "✅ Build and push completed successfully."

