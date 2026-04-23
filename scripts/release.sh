#!/bin/bash
# ART CRM — Release Script
# Kullanım: ./scripts/release.sh "Sürüm açıklaması"
# Tag formatı: YYYY-MM-DD-vN (aynı gün birden fazla deploy için vN otomatik artar)

set -euo pipefail

APP_DIR="/home/crmadmin/emlak-crm-app"
BACKUP_ROOT="/home/crmadmin/backups"
DB_CONTAINER="emlak-crm-db"
SERVICE="emlak-crm"
RETENTION_DAYS=90  # 3 ay

# ─── Yardımcı fonksiyonlar ───
red()    { echo -e "\e[31m$*\e[0m"; }
green()  { echo -e "\e[32m$*\e[0m"; }
yellow() { echo -e "\e[33m$*\e[0m"; }
blue()   { echo -e "\e[34m$*\e[0m"; }
bold()   { echo -e "\e[1m$*\e[0m"; }

step() {
  echo ""
  blue "▸ $1"
}

# ─── Giriş kontrolleri ───
MESSAGE="${1:-}"
if [ -z "$MESSAGE" ]; then
  red "HATA: Sürüm açıklaması gerekli"
  echo "Kullanım: $0 \"Açıklama buraya\""
  exit 1
fi

cd "$APP_DIR"

# Git temiz mi?
if ! git diff --quiet HEAD 2>/dev/null; then
  red "HATA: Commit edilmemiş değişiklikler var"
  git status --short
  exit 1
fi

# .env var mı?
if [ ! -f .env ]; then
  red "HATA: .env dosyası bulunamadı"
  exit 1
fi

# ─── Tag üret ───
DATE=$(date +%Y-%m-%d)
SAME_DAY_COUNT=$(git tag -l "${DATE}-v*" 2>/dev/null | wc -l)
NEXT_V=$((SAME_DAY_COUNT + 1))
TAG="${DATE}-v${NEXT_V}"
BACKUP_DIR="$BACKUP_ROOT/$TAG"

bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "  Yeni Sürüm: $TAG"
bold "  Açıklama:   $MESSAGE"
bold "  Yedek:      $BACKUP_DIR"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ─── Hata halinde önceki state'e dön ───
PREV_BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
ROLLBACK_ON_FAIL=0

cleanup_on_fail() {
  if [ "$ROLLBACK_ON_FAIL" = "1" ]; then
    red ""
    red "✗ HATA — Başarısız sürüm temizleniyor..."
    # Tag'i sil (branch HEAD'e dokunulmuyor, çünkü yeni commit yapılmadı)
    git tag -d "$TAG" 2>/dev/null || true
    if [ -d "$BACKUP_DIR" ]; then
      rm -rf "$BACKUP_DIR"
      echo "  Eksik backup silindi: $BACKUP_DIR"
    fi
    red "✗ Sürüm $TAG iptal edildi. Branch: ${PREV_BRANCH:-?}"
  fi
}
trap cleanup_on_fail ERR

# ─── 1. Backup klasörü ───
step "1/8  Yedek klasörü oluşturuluyor"
mkdir -p "$BACKUP_DIR"
ROLLBACK_ON_FAIL=1

# ─── 2. DB yedeği ───
step "2/8  Veritabanı yedekleniyor"
docker exec "$DB_CONTAINER" pg_dump -U emlak emlak_crm > "$BACKUP_DIR/db.sql"
DB_SIZE=$(du -h "$BACKUP_DIR/db.sql" | cut -f1)
green "     ✓ $BACKUP_DIR/db.sql ($DB_SIZE)"

# ─── 3. Uploads yedeği ───
step "3/8  Uploads yedekleniyor"
if [ -d "public/uploads" ] && [ "$(ls -A public/uploads 2>/dev/null)" ]; then
  tar czf "$BACKUP_DIR/uploads.tar.gz" -C public uploads
  UP_SIZE=$(du -h "$BACKUP_DIR/uploads.tar.gz" | cut -f1)
  green "     ✓ $BACKUP_DIR/uploads.tar.gz ($UP_SIZE)"
else
  yellow "     • uploads boş, atlandı"
fi

# ─── 4. Schema + metadata ───
step "4/8  Şema ve metadata kaydediliyor"
cp prisma/schema.prisma "$BACKUP_DIR/schema.prisma"
git rev-parse HEAD > "$BACKUP_DIR/git-sha.txt"
echo "$MESSAGE" > "$BACKUP_DIR/message.txt"
date -Iseconds > "$BACKUP_DIR/timestamp.txt"
# Hangi migration'lar uygulandı?
ls prisma/migrations | grep -v migration_lock.toml > "$BACKUP_DIR/migrations.txt" 2>/dev/null || true
green "     ✓ schema.prisma, git-sha, message, migrations listesi"

# ─── 5. Migration uygula ───
step "5/8  Veritabanı migration uygulanıyor"
set -a; source .env; set +a
npx prisma generate > /dev/null 2>&1
MIGRATE_OUT=$(npx prisma migrate deploy 2>&1)
echo "$MIGRATE_OUT" | tail -5
if echo "$MIGRATE_OUT" | grep -q "No pending migrations"; then
  yellow "     • Yeni migration yok (baseline)"
else
  green "     ✓ Migration uygulandı"
fi

# ─── 6. Build ───
step "6/8  Next.js build"
npm run build 2>&1 | tail -3
green "     ✓ Build tamamlandı"

# ─── 7. Git tag ───
step "7/8  Git tag: $TAG"
# Identity yoksa son commit'teki yazardan türet (config değiştirmeden)
if ! git config user.email > /dev/null 2>&1; then
  LAST_AUTHOR=$(git log -1 --format="%an" 2>/dev/null || echo "Deployer")
  LAST_EMAIL=$(git log -1 --format="%ae" 2>/dev/null || echo "deployer@localhost")
  export GIT_COMMITTER_NAME="$LAST_AUTHOR"
  export GIT_COMMITTER_EMAIL="$LAST_EMAIL"
fi
git tag -a "$TAG" -m "$MESSAGE"
green "     ✓ Tag oluşturuldu (push için: git push origin $TAG)"

# ─── 8. Servis restart ───
step "8/8  Servis yeniden başlatılıyor"
RESTART_SUCCEEDED=0
# Önce şifresiz dene
if sudo -n systemctl restart "$SERVICE" 2>/dev/null; then
  RESTART_SUCCEEDED=1
# Interaktif terminal varsa şifre sorabilir
elif [ -t 0 ]; then
  if sudo systemctl restart "$SERVICE"; then
    RESTART_SUCCEEDED=1
  fi
fi

if [ "$RESTART_SUCCEEDED" = "1" ]; then
  sleep 2
  if systemctl is-active --quiet "$SERVICE"; then
    green "     ✓ Servis aktif"
  else
    red "     ✗ Servis başlatılamadı!"
    systemctl status "$SERVICE" --no-pager | tail -10
    exit 1
  fi
else
  yellow "     ⚠ Servis restart atlandı (sudo alınamadı)"
  yellow "       Manuel çalıştır: sudo systemctl restart $SERVICE"
fi

ROLLBACK_ON_FAIL=0  # Başarılı, artık auto-rollback çalışmasın
trap - ERR

# ─── Güncel sembolik link ───
ln -sfn "$BACKUP_DIR" "$BACKUP_ROOT/current"

# ─── 90 günden eski yedekleri temizle ───
step "Bonus: 90 günden eski yedekler temizleniyor"
DELETED=$(find "$BACKUP_ROOT" -maxdepth 1 -type d -name "20*-v*" -mtime +$RETENTION_DAYS -exec rm -rf {} \; -print 2>/dev/null | wc -l)
if [ "$DELETED" -gt 0 ]; then
  yellow "     • $DELETED eski yedek silindi"
else
  echo "     • Silinecek eski yedek yok"
fi

echo ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
green "  ✓ Sürüm $TAG başarıyla çıkarıldı"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Geri dönmek için: ./scripts/rollback.sh $TAG"
echo "Listelemek için:  ./scripts/releases.sh"
