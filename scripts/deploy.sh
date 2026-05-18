#!/bin/bash
# ============================================================
# scripts/deploy.sh — One-command production deployment
# Tested on: Ubuntu 22.04 LTS
# Run as: bash scripts/deploy.sh
# ============================================================

set -euo pipefail

YELLOW='\033[0;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

log() { echo -e "${GREEN}[TaxiFlow]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
error() { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

log "🚖 TaxiFlow Production Deployment"
log "=================================="

# ─── SYSTEM REQUIREMENTS ──────────────────────────────────

log "Checking system requirements..."

if ! command -v docker &> /dev/null; then
  log "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  log "✅ Docker installed — you may need to log out and back in"
fi

if ! command -v docker-compose &> /dev/null; then
  log "Installing Docker Compose..."
  sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" \
    -o /usr/local/bin/docker-compose
  sudo chmod +x /usr/local/bin/docker-compose
fi

log "✅ Docker: $(docker --version)"
log "✅ Docker Compose: $(docker compose version)"

# ─── ENVIRONMENT CHECK ────────────────────────────────────

if [ ! -f ".env.production" ]; then
  error ".env.production not found. Copy .env.production.example and fill in values."
fi

log "✅ .env.production found"

# Load env vars
set -a && source .env.production && set +a

# Verify required vars
REQUIRED_VARS=(
  "POSTGRES_PASSWORD"
  "JWT_ACCESS_SECRET"
  "JWT_REFRESH_SECRET"
  "ENCRYPTION_KEY"
  "STRIPE_SECRET_KEY"
  "STRIPE_WEBHOOK_SECRET"
  "SENDGRID_API_KEY"
)

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var:-}" ]; then
    error "Required environment variable $var is not set in .env.production"
  fi
done

log "✅ All required environment variables present"

# ─── CREATE DEPLOY DIRECTORY ──────────────────────────────

DEPLOY_DIR="/opt/taxiflow"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# ─── COPY FILES ───────────────────────────────────────────

log "Copying deployment files..."
cp docker-compose.yml $DEPLOY_DIR/
cp .env.production $DEPLOY_DIR/.env
cp -r docker/ $DEPLOY_DIR/docker/

cd $DEPLOY_DIR

# ─── SSL CERTIFICATES ─────────────────────────────────────

if [ ! -f "docker/ssl/fullchain.pem" ]; then
  warn "SSL certificates not found. Setting up Let's Encrypt..."

  if [ -z "${APP_DOMAIN:-}" ]; then
    warn "APP_DOMAIN not set. Skipping SSL setup — configure manually."
  else
    log "Obtaining SSL certificate for $APP_DOMAIN..."
    docker run --rm \
      -v "$(pwd)/docker/certbot-www:/var/www/certbot" \
      -v "$(pwd)/docker/certbot-conf:/etc/letsencrypt" \
      -p 80:80 \
      certbot/certbot certonly \
      --webroot \
      --webroot-path=/var/www/certbot \
      --email "${EMAIL_FROM}" \
      --agree-tos \
      --no-eff-email \
      -d "${APP_DOMAIN}" \
      -d "api.${APP_DOMAIN}"

    log "✅ SSL certificate obtained"
  fi
fi

# ─── START SERVICES ───────────────────────────────────────

log "Starting services..."
docker compose pull
docker compose up -d postgres redis

log "Waiting for database to be ready..."
sleep 10

# Run migrations
log "Running database migrations..."
docker compose run --rm backend sh -c "node node_modules/.bin/prisma migrate deploy"

# Seed initial data
log "Seeding database..."
docker compose run --rm backend sh -c "node node_modules/.bin/tsx prisma/seed.ts" || true

# Start backend + nginx
docker compose up -d

log "Waiting for services to start..."
sleep 15

# ─── HEALTH CHECK ─────────────────────────────────────────

log "Running health check..."
HEALTH_URL="${APP_URL:-http://localhost:3000}/health"

for i in {1..5}; do
  if curl -sf "$HEALTH_URL" > /dev/null 2>&1; then
    log "✅ Health check passed"
    break
  fi
  if [ $i -eq 5 ]; then
    error "Health check failed after 5 attempts. Check logs: docker compose logs backend"
  fi
  warn "Health check failed (attempt $i/5). Retrying in 5s..."
  sleep 5
done

# ─── POST-DEPLOY INFO ─────────────────────────────────────

log ""
log "🎉 TaxiFlow deployed successfully!"
log "=================================="
log ""
log "API:          ${APP_URL:-http://localhost:3000}"
log "Admin Panel:  ${ADMIN_PANEL_URL:-http://localhost:3001}"
log ""
log "Useful commands:"
log "  View logs:    docker compose logs -f backend"
log "  Restart:      docker compose restart backend"
log "  Stop:         docker compose down"
log "  DB shell:     docker compose exec postgres psql -U taxiflow"
log "  Redis shell:  docker compose exec redis redis-cli"
log ""
warn "Don't forget to:"
warn "  1. Change the super admin password at ${ADMIN_PANEL_URL}/login"
warn "  2. Configure your Stripe webhook endpoint: ${APP_URL}/api/v1/webhooks/stripe"
warn "  3. Set up your domain DNS to point to this server"
