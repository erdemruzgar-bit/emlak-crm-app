#!/bin/bash
# ART CRM — Releases Listesi
# Kullanım: ./scripts/releases.sh [--detail]

set -euo pipefail

BACKUP_ROOT="/home/crmadmin/backups"

red()    { echo -e "\e[31m$*\e[0m"; }
green()  { echo -e "\e[32m$*\e[0m"; }
yellow() { echo -e "\e[33m$*\e[0m"; }
blue()   { echo -e "\e[34m$*\e[0m"; }
bold()   { echo -e "\e[1m$*\e[0m"; }
dim()    { echo -e "\e[2m$*\e[0m"; }

CURRENT_TAG=$(readlink "$BACKUP_ROOT/current" 2>/dev/null | xargs basename 2>/dev/null || echo "")

bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
bold "  ART CRM — Sürüm Geçmişi"
if [ -n "$CURRENT_TAG" ]; then
  bold "  Şu an aktif: $(green $CURRENT_TAG)"
fi
bold "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

if [ ! -d "$BACKUP_ROOT" ] || [ -z "$(ls -A $BACKUP_ROOT 2>/dev/null | grep -v current)" ]; then
  yellow "Henüz hiç sürüm yok. İlk sürüm için:"
  echo "  ./scripts/release.sh \"İlk baseline\""
  exit 0
fi

# Tag isimlerini tarihe göre ters sırala
for TAG in $(ls -1 "$BACKUP_ROOT" | grep -v current | sort -r); do
  DIR="$BACKUP_ROOT/$TAG"
  MSG=$(cat "$DIR/message.txt" 2>/dev/null || echo "?")
  TS=$(cat "$DIR/timestamp.txt" 2>/dev/null || echo "?")
  SHA=$(cat "$DIR/git-sha.txt" 2>/dev/null | cut -c1-8 || echo "?")
  DB_SIZE=$(du -h "$DIR/db.sql" 2>/dev/null | cut -f1 || echo "?")
  UP_SIZE=$(du -h "$DIR/uploads.tar.gz" 2>/dev/null | cut -f1 || echo "—")

  if [ "$TAG" = "$CURRENT_TAG" ]; then
    echo -n "$(green "● $TAG") "
    green "(AKTİF)"
  else
    echo "○ $TAG"
  fi
  dim "    $TS · git:$SHA · db:$DB_SIZE · uploads:$UP_SIZE"
  echo "    \"$MSG\""
  echo ""
done

echo ""
echo "Komutlar:"
echo "  Geri dön:    ./scripts/rollback.sh <tag>"
echo "  Yeni sürüm:  ./scripts/release.sh \"Açıklama\""
