#!/usr/bin/env bash
# Günlük bağımsız yedek — release.sh'tan ayrı çalışır, deploy olmasa da yedek alır.
# Cron'dan çağrılır. Lokal + Drive'a yazar, 14 günden eskileri siler.
# Başarısızlıkta: durum dosyasına FAIL yazar ve (tanımlıysa) BACKUP_ALERT_CMD ile uyarır.

set -euo pipefail

ROOT=/home/crmadmin/backups/daily
APP=/home/crmadmin/emlak-crm-app
RETENTION_DAYS=14
TAG=$(date -u +%Y-%m-%d)
DIR="$ROOT/$TAG"
LOG=/home/crmadmin/backups/daily-backup.log
STATUS_FILE=/home/crmadmin/backups/daily-backup-status.txt

exec >>"$LOG" 2>&1
echo
echo "=== $(date -Iseconds) — daily-backup: $TAG ==="

# ── Başarısızlık alarmı ──
# Durum dosyasına yazar; BACKUP_ALERT_CMD env'i tanımlıysa onu çağırır (mesaj BACKUP_ALERT_MSG ile).
# Örn cron'da: BACKUP_ALERT_CMD='curl -fsS -m10 https://hc-ping.com/<uuid>/fail -d "$BACKUP_ALERT_MSG"'
notify_fail() {
  local msg="$1"
  echo "✗ HATA: $msg"
  echo "FAIL $(date -Iseconds) — $msg" > "$STATUS_FILE"
  if [ -n "${BACKUP_ALERT_CMD:-}" ]; then
    BACKUP_ALERT_MSG="emlak-crm gunluk yedek BASARISIZ ($TAG): $msg" bash -c "$BACKUP_ALERT_CMD" || true
  fi
}
notify_warn() {
  local msg="$1"
  echo "⚠ UYARI: $msg"
  echo "WARN $(date -Iseconds) — $msg" >> "$STATUS_FILE"
  if [ -n "${BACKUP_ALERT_CMD:-}" ]; then
    BACKUP_ALERT_MSG="emlak-crm yedek UYARI ($TAG): $msg" bash -c "$BACKUP_ALERT_CMD" || true
  fi
}
# Kritik bölümde (lokal yedek tamamlanmadan) beklenmeyen hata olursa alarm ver.
trap 'notify_fail "beklenmeyen hata (satir $LINENO)"' ERR

mkdir -p "$DIR"

echo "→ pg_dump..."
docker exec emlak-crm-db pg_dump -U emlak -d emlak_crm > "$DIR/db.sql"
# pg_dump boş / çok küçük dosya ürettiyse (ör. auth hatası) bunu da başarısızlık say.
if [ ! -s "$DIR/db.sql" ] || [ "$(stat -c%s "$DIR/db.sql")" -lt 1000 ]; then
  notify_fail "pg_dump bos/cok kucuk db.sql uretti"
  exit 1
fi
DB_SIZE=$(du -h "$DIR/db.sql" | cut -f1)
echo "   db.sql: $DB_SIZE"

UP_SIZE=""
if [ -d "$APP/public/uploads" ] && [ -n "$(ls -A "$APP/public/uploads" 2>/dev/null)" ]; then
  echo "→ uploads.tar.gz..."
  tar czf "$DIR/uploads.tar.gz" -C "$APP/public" uploads
  UP_SIZE=$(du -h "$DIR/uploads.tar.gz" | cut -f1)
  echo "   uploads.tar.gz: $UP_SIZE"
fi

# ── Felaket kurtarma metadatası (best-effort; eksiği yedeği FAIL saymaz) ──
# Sır ÇOĞALTMA YOK: .env/dotenv günlük yedeğe EKLENMEZ (zaten release yedeğinde var,
# kullanıcı Drive'da şifreli sır istemiyor). Sadece sırsız yapılandırma dosyaları.
echo "→ kurtarma metadatası (schema/compose/RESTORE/migrations)..."
cp "$APP/prisma/schema.prisma" "$DIR/schema.prisma" 2>/dev/null || echo "   ⚠ schema.prisma kopyalanamadı"
cp "$APP/docker-compose.yml" "$DIR/docker-compose.yml" 2>/dev/null || echo "   ⚠ docker-compose.yml kopyalanamadı"
ls "$APP/prisma/migrations" > "$DIR/migrations.txt" 2>/dev/null || echo "   ⚠ migrations listesi alınamadı"
if [ -f "$APP/scripts/RESTORE-TEMPLATE.md" ]; then
  sed "s/__TAG__/daily-$TAG/g" "$APP/scripts/RESTORE-TEMPLATE.md" > "$DIR/RESTORE.md" \
    || echo "   ⚠ RESTORE.md oluşturulamadı"
else
  echo "   • RESTORE-TEMPLATE.md yok, RESTORE.md atlandı"
fi

date -Iseconds > "$DIR/timestamp.txt"
(cd "$APP" && echo "$(git rev-parse HEAD) ($(git rev-parse --abbrev-ref HEAD))") > "$DIR/git-sha.txt"

# ── Lokal yedek BAŞARILI: durumu hemen OK yaz. Bundan sonraki adımlar best-effort. ──
echo "OK $(date -Iseconds) — db:$DB_SIZE${UP_SIZE:+ uploads:$UP_SIZE}" > "$STATUS_FILE"
trap - ERR  # Drive/retention hatası tüm yedeği FAIL saymaz (lokal yedek zaten alındı).

# ── Bulut + retention (best-effort; hatalar uyarı olarak işlenir) ──
if command -v rclone >/dev/null 2>&1 && rclone listremotes 2>/dev/null | grep -q "^drive:$"; then
  echo "→ Drive: drive:emlak-crm-backups/daily-$TAG"
  if rclone copy "$DIR" "drive:emlak-crm-backups/daily-$TAG" --quiet; then
    echo "   ✓ yüklendi"
  else
    notify_warn "Drive yukleme basarisiz (lokal yedek OK)"
  fi

  echo "→ Drive retention ($RETENTION_DAYS gün)..."
  { rclone lsf "drive:emlak-crm-backups/" --dirs-only 2>/dev/null \
    | grep -E "^daily-[0-9]{4}-[0-9]{2}-[0-9]{2}/$" \
    | while read -r d; do
        date_part=${d#daily-}; date_part=${date_part%/}
        age_days=$(( ($(date -u +%s) - $(date -u -d "$date_part" +%s)) / 86400 ))
        if [ "$age_days" -gt "$RETENTION_DAYS" ]; then
          echo "   - siliniyor: $d ($age_days gün)"
          rclone purge "drive:emlak-crm-backups/$d" 2>&1 | sed 's/^/     /'
        fi
      done; } || echo "   ⚠ Drive retention adimi atlandi"
else
  echo "   • rclone/drive yok, Drive adımı atlandı"
fi

echo "→ Lokal retention ($RETENTION_DAYS gün)..."
find "$ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$RETENTION_DAYS" -print -exec rm -rf {} \; || echo "   ⚠ lokal retention adimi atlandi"

echo "✓ tamam"
