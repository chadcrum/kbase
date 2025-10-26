<!-- e136cc15-ec41-473d-b321-0084f55ceed0 b3dae8f8-8c52-4eda-a667-31bee899970e -->
# Docker GHCR Automated Build Setup

## Implementation Steps

### 1. Create Multi-Stage Dockerfile

Create `/home/chid/git/kbase/Dockerfile` with:

- **Stage 1 (frontend-builder)**: Build Vue frontend with Node.js
- **Stage 2 (backend)**: Python 3.11 with uv, copy built frontend assets
- Configure FastAPI to serve static files from `/app/dist`
- Expose port 8000
- Use minimal base images for optimization

### 2. Update FastAPI to Serve Static Files

Modify `/home/chid/git/kbase/backend/app/main.py`:

- Add `StaticFiles` mount for frontend assets at root path
- Configure to serve `index.html` as fallback for SPA routing
- Ensure API routes (`/api/v1/*`) take precedence over static files

### 3. Create GitHub Actions Workflow

Create `/home/chid/git/kbase/.github/workflows/docker-publish.yml`:

- Trigger: `push` to `main` branch only (when PRs merge)
- Use `docker/build-push-action@v5` for building
- Use `docker/login-action@v3` for GHCR authentication
- Tag strategy: both `latest` and `sha-${{ github.sha }}`
- Set image to public visibility
- Add permissions for `packages: write` and `contents: read`

### 4. Create .dockerignore File

Create `/home/chid/git/kbase/.dockerignore` to exclude:

- `node_modules/`, `__pycache__/`, `.git/`
- Test files, coverage reports
- Development artifacts
- Environment files (`.env`)

### 5. Update Documentation

Update `/home/chid/git/kbase/README.md`:

- Add Docker deployment section
- Include `docker pull` command from GHCR
- Document required environment variables for container
- Add `docker run` example with volume mounts

Update `/home/chid/git/kbase/docs/architecture-design.md`:

- Add deployment architecture section
- Document Docker image structure
- Explain CI/CD pipeline for automated builds

## Key Technical Details

**Dockerfile Structure:**

```dockerfile
# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Production image
FROM python:3.11-slim
WORKDIR /app
COPY backend/ ./
RUN pip install uv && uv sync
COPY --from=frontend-builder /app/frontend/dist ./dist
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**GitHub Actions Authentication:**

- Uses `GITHUB_TOKEN` (automatically provided)
- Image name: `ghcr.io/${{ github.repository }}:latest`
- Also tagged with: `ghcr.io/${{ github.repository }}:sha-${{ github.sha }}`

**Required Environment Variables for Container:**

- `VAULT_PATH`: Path to notes directory (mount as volume)
- `SECRET_KEY`: JWT signing key
- `PASSWORD`: Authentication password

## Files to Create/Modify

1. Create: `Dockerfile`
2. Create: `.dockerignore`
3. Create: `.github/workflows/docker-publish.yml`
4. Modify: `backend/app/main.py` (add static file serving)
5. Update: `README.md` (Docker deployment section)
6. Update: `docs/architecture-design.md` (deployment architecture)

### To-dos

- [ ] Create multi-stage Dockerfile with frontend builder and Python backend stages
- [ ] Create .dockerignore file to exclude unnecessary files from build context
- [ ] Modify backend/app/main.py to serve frontend static files
- [ ] Create .github/workflows/docker-publish.yml for automated GHCR builds
- [ ] Update README.md with Docker deployment instructions
- [ ] Update docs/architecture-design.md with deployment architecture