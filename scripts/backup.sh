#!/bin/bash
# ============================================================
# scripts/backup.sh — Automated database backup to S3
# Add to crontab: 0 2 * * * /opt/taxiflow/scripts/backup.sh
# ============================================================

set -euo pipefail

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

source /opt/taxiflow/.env

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="taxiflow_backup_${TIMESTAMP}.sql.gz"
BACKUP_DIR="/tmp/taxiflow_backups"
RETENTION_DAYS=30

mkdir -p $BACKUP_DIR

log "Starting database backup..."

# Dump database
docker compose -f /opt/taxiflow/docker-compose.yml exec -T postgres \
  pg_dump -U "${POSTGRES_USER:-taxiflow}" "${POSTGRES_DB:-taxiflow_prod}" \
  | gzip > "${BACKUP_DIR}/${BACKUP_FILE}"

log "✅ Database dumped: ${BACKUP_FILE} ($(du -sh "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1))"

# Upload to S3 if configured
if [ -n "${AWS_ACCESS_KEY_ID:-}" ] && [ -n "${AWS_S3_BUCKET:-}" ]; then
  AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY_ID}" \
  AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY}" \
  aws s3 cp "${BACKUP_DIR}/${BACKUP_FILE}" \
    "s3://${AWS_S3_BUCKET}/backups/db/${BACKUP_FILE}" \
    --region "${AWS_S3_REGION:-eu-west-2}"
  log "✅ Backup uploaded to S3"
else
  log "⚠️  S3 not configured — backup stored locally only"
fi

# Remove local backups older than 7 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
log "✅ Local cleanup done"

log "Backup complete: ${BACKUP_FILE}"
