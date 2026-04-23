#!/bin/bash
# ART CRM — Rollback Script
# Kullanım: ./scripts/rollback.sh <tag>
# Şema-only rollback: veri korunur, sadece şema değişiklikleri (yeni tablo/kolon) geri alınır.

set -euo pipefail

APP_DIR="/home/crmadmin/emlak-crm-app"
BACKUP_ROOT="/home/crmadmin/backups"
DB_CONTAINER="emlak-crm-db"
SERVICE="emlak-crm"

red()    { echo -e "\e[31m$*\e[0m"; }
green()  { echo -e "\e[32m$*\e[0m"; }
yellow() { echo -e "\e[33m$*\e[0m"; }
blue()   { echo -e "\e[34m$*\e[0m"; }
bold()   { echo -e "\e[1m$*\e[0m"; }

TARGET="${1:-}"
if [ -z "$TARGET" ]; then
  red "HATA: Hedef tag gerekli"
  echo "Kullanım: $0 <tag>"
  echo ""
  echo "Mevcut sürümler:"
  ls -1t "$BACKUP_ROOT" 2>/dev/null | grep -v current | head -10
  exit 1
fi

BACKUP_DIR="$BACKUP_ROOT/$TARGET"
if [ ! -d "$BACKUP_DIR" ]; then
  red "HATA: $BACKUP_DIR bulunamadı"
  echo "Mevcut sürümler:"
  ls -1t "$BACKUP_ROOT" 2>/dev/null | grep -v current | head -10
  exit 1
fi

cd "$APP_DIR"

CURRENT_TAG=$(readlink "$BACKUP_ROOT/current" 2>/dev/null | xargs basename 2>/dev/null || echo "?")

bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "  GERİ DÖNÜŞ"
bold "  Şu anki: $CURRENT_TAG"
bold "  Hedef:   $TARGET"
bold "  Mesaj:   $(cat $BACKUP_DIR/message.txt 2>/dev/null || echo ?)"
bold "  Tarih:   $(cat $BACKUP_DIR/timestamp.txt 2>/dev/null || echo ?)"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

echo ""
yellow "Yapılacaklar:"
echo "  1. Şema farkı hesaplanacak (şu anki → $TARGET)"
echo "  2. SQL sana gösterilecek, onay isteyecek"
echo "  3. DB şeması geri alınacak (yeni tablolar DROP)"
echo "  4. Müşteri, mülk, kullanıcı VERİSİ KORUNACAK"
echo "  5. Kod $TARGET commit'ine çekilecek"
echo "  6. Uploads arşivden geri yüklenecek"
echo "  7. Servis restart edilecek"
echo ""
read -p "Devam? [y/N] " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "İptal"
  exit 0
fi

# ─── 1. Şema diff SQL'i üret ───
echo ""
blue "▸ 1/6  Şema farkı hesaplanıyor"
set -a; source .env; set +a

DIFF_SQL=$(mktemp /tmp/rollback-diff-XXXXXX.sql)
npx prisma migrate diff \
  --from-schema-datamodel prisma/schema.prisma \
  --to-schema-datamodel "$BACKUP_DIR/schema.prisma" \
  --script > "$DIFF_SQL" 2>&1 || true

if [ ! -s "$DIFF_SQL" ] || grep -q "No difference" "$DIFF_SQL"; then
  yellow "     • Şema farkı yok (veya aynı state)"
else
  echo ""
  yellow "═══ Üretilen SQL ═══"
  cat "$DIFF_SQL"
  yellow "════════════════════"

  # Destructive kontrol — DROP COLUMN'ları veya table'ları not et
  if grep -iqE "DROP COLUMN|DROP CONSTRAINT" "$DIFF_SQL"; then
    red ""
    red "UYARI: SQL kolon/constraint siliyor — mevcut veride kayıp olabilir!"
  fi
  echo ""
  read -p "Bu SQL'i DB'ye uygula? [y/N] " -r
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    rm "$DIFF_SQL"
    echo "İptal — hiçbir şey değişmedi"
    exit 0
  fi
fi

# ─── 2. DB'ye uygula ───
blue "▸ 2/6  Şema farkı DB'ye uygulanıyor"
if [ -s "$DIFF_SQL" ] && ! grep -q "No difference" "$DIFF_SQL"; then
  docker exec -i "$DB_CONTAINER" psql -U emlak emlak_crm < "$DIFF_SQL"
  green "     ✓ Şema güncellendi"
fi

# ─── 3. _prisma_migrations temizliği ───
blue "▸ 3/6  Prisma migration kayıtları senkronize ediliyor"
if [ -f "$BACKUP_DIR/migrations.txt" ]; then
  VALID_LIST=$(awk '{printf "'\''%s'\'',", $0}' "$BACKUP_DIR/migrations.txt" | sed 's/,$//')
  if [ -n "$VALID_LIST" ]; then
    docker exec -i "$DB_CONTAINER" psql -U emlak emlak_crm -c "
      DELETE FROM _prisma_migrations WHERE migration_name NOT IN ($VALID_LIST);
    " > /dev/null
    green "     ✓ Geçersiz migration kayıtları silindi"
  fi
fi

# ─── 4. Kod geri al ───
blue "▸ 4/6  Kod $TARGET tag'ine alınıyor"
git checkout "$TARGET" 2>&1 | tail -2
green "     ✓ Git HEAD = $TARGET"

# ─── 5. Uploads restore ───
blue "▸ 5/6  Uploads arşivden geri yükleniyor"
if [ -f "$BACKUP_DIR/uploads.tar.gz" ]; then
  # Mevcut uploads'ı yan yedeğe al
  if [ -d "public/uploads" ]; then
    mv public/uploads "public/uploads.before-rollback.$(date +%s)"
  fi
  mkdir -p public
  tar xzf "$BACKUP_DIR/uploads.tar.gz" -C public
  green "     ✓ Uploads geri yüklendi (eski versiyon .before-rollback.* olarak saklandı)"
else
  yellow "     • Uploads arşivi yok, atlandı"
fi

# ─── 6. Build + restart ───
blue "▸ 6/6  npm install, build, restart"
if ! git config user.email > /dev/null 2>&1; then
  LAST_AUTHOR=$(git log -1 --format="%an" 2>/dev/null || echo "Deployer")
  LAST_EMAIL=$(git log -1 --format="%ae" 2>/dev/null || echo "deployer@localhost")
  export GIT_COMMITTER_NAME="$LAST_AUTHOR"
  export GIT_COMMITTER_EMAIL="$LAST_EMAIL"
fi
npm ci --silent 2>&1 | tail -3
npx prisma generate > /dev/null 2>&1
npm run build 2>&1 | tail -3
RESTART_SUCCEEDED=0
if sudo -n systemctl restart "$SERVICE" 2>/dev/null; then
  RESTART_SUCCEEDED=1
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
    exit 1
  fi
else
  yellow "     ⚠ Servis restart atlandı — manuel: sudo systemctl restart $SERVICE"
fi

# current symlink güncelle
ln -sfn "$BACKUP_DIR" "$BACKUP_ROOT/current"

rm -f "$DIFF_SQL"

echo ""
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
green "  ✓ $TARGET sürümüne geri dönüldü"
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Tekrar ileri almak için git HEAD'i başka bir tag'e çekin:"
echo "  git checkout <sonraki-tag>  && ./scripts/release.sh \"Geri alındı\""
