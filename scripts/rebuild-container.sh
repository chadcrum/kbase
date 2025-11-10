#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

if [[ ! -f "${ROOT_DIR}/compose.yaml" && ! -f "${ROOT_DIR}/compose.yml" ]]; then
  echo "compose.yaml not found in ${ROOT_DIR}" >&2
  exit 1
fi

COMPOSE_CMD=(podman compose)

echo "Stopping existing containers (if any)..."
"${COMPOSE_CMD[@]}" down --remove-orphans

echo "Rebuilding containers from compose.yaml..."
"${COMPOSE_CMD[@]}" build --pull

echo "Starting containers..."
"${COMPOSE_CMD[@]}" up -d --force-recreate

echo "Container rebuild complete. Current status:"
"${COMPOSE_CMD[@]}" ps

