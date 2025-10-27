# KBase Docker Compose Deployment

This guide explains how to deploy KBase using Docker Compose with the pre-built image from GitHub Container Registry.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- A local vault directory for your notes

## Quick Start

1. **Create a vault directory** (if you don't have one already):
   ```bash
   mkdir -p ./kbase-vault
   ```

2. **Configure environment variables** by editing `compose.yaml`:
   - Update `VAULT_PATH: /app/vault` (optional, only if you want to change the internal path)
   - Generate a secure `SECRET_KEY`:
     ```bash
     openssl rand -hex 32
     ```
   - Set a secure `PASSWORD` for authentication

3. **Start the application**:
   ```bash
   docker compose up -d
   ```

4. **Access KBase** at http://localhost:8000

## Configuration

### Required Environment Variables

- `VAULT_PATH`: Path to vault inside container (default: `/app/vault`)
- `SECRET_KEY`: Secret key for JWT signing (generate with `openssl rand -hex 32`)
- `PASSWORD`: Password for authentication

### Optional Environment Variables

- `ACCESS_TOKEN_EXPIRE_MINUTES`: Token expiration time (default: 10080 = 7 days)
- `APP_NAME`: Application name (default: "KBase")
- `APP_VERSION`: Application version (default: "0.1.0")
- `ALGORITHM`: JWT algorithm (default: "HS256")

### Volume Mounts

The `compose.yaml` maps `./kbase-vault` to `/app/vault` inside the container. You can customize this by modifying the volumes section:

```yaml
volumes:
  - /path/to/your/vault:/app/vault
```

## Usage

### Start the service
```bash
docker compose up -d
```

### View logs
```bash
docker compose logs -f
```

### Stop the service
```bash
docker compose down
```

### Restart the service
```bash
docker compose restart
```

### Access the container shell
```bash
docker compose exec kbase bash
```

## Health Check

The container includes a health check that monitors the `/health` endpoint. You can check the status with:

```bash
docker compose ps
```

## Security Considerations

1. **Change the SECRET_KEY**: Never use the default value. Generate a secure key.
2. **Change the PASSWORD**: Use a strong password for authentication.
3. **Network security**: By default, the service is exposed on port 8000. Consider:
   - Using a reverse proxy (nginx, Traefik)
   - Setting up SSL/TLS certificates
   - Restricting network access
4. **File permissions**: Ensure the vault directory has appropriate permissions on the host system.

## Example: Production Deployment with Environment File

Create a `.env` file in the same directory as `compose.yaml`:

```bash
# .env
VAULT_PATH=/app/vault
SECRET_KEY=your-generated-secret-key-here
PASSWORD=your-secure-password-here
```

Then reference variables in your `compose.yaml`:

```yaml
environment:
  VAULT_PATH: /app/vault
  SECRET_KEY: ${SECRET_KEY}
  PASSWORD: ${PASSWORD}
```

## Troubleshooting

### Container won't start

Check the logs:
```bash
docker compose logs kbase
```

Common issues:
- Vault path doesn't exist: Ensure the mounted directory exists
- Permissions error: Check directory permissions
- Invalid SECRET_KEY: Ensure it's properly set

### Health check failures

If the health check is failing:
```bash
docker compose logs kbase | grep -i health
curl http://localhost:8000/health
```

### Cannot access the vault

Ensure the volume mount path matches the VAULT_PATH environment variable.

## Advanced Configuration

### Using a custom network

The compose file creates a `kbase-network`. You can add other services to this network:

```yaml
services:
  nginx:
    image: nginx:alpine
    networks:
      - kbase-network
    # ... other config
```

### Resource limits

Add resource limits to the service:

```yaml
services:
  kbase:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

## Updating the Image

To pull the latest image:

```bash
docker compose pull
docker compose up -d
```

## Backing Up Your Vault

Since your vault is mounted as a volume, it's stored on your host system. To back it up:

```bash
# Stop the container
docker compose down

# Backup the directory
tar -czf kbase-vault-backup-$(date +%Y%m%d).tar.gz ./kbase-vault

# Restart the container
docker compose up -d
```

