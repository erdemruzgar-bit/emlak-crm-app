#!/usr/bin/env bash
# Yedek geri-yükleme testi — bir yedeğin GERÇEKTEN geri yüklenebildiğini izole şekilde kanıtlar.
#
# Efemeral bir postgres:16-alpine container'ı başlatır (canlıdan FARKLI isim, host port YOK),
# yedekteki db.sql'i ona yükler, kritik tabloların satır sayısını doğrular ve uploads.tar.gz'yi
# geçici dizine açıp dosya sayar. Bittiğinde container + geçici dizin trap ile MUTLAKA temizlenir.
#
# CANLI 'emlak-crm-db' container'ına ve canlı veritabanına ASLA dokunmaz.
#
# Kullanım:
#   scripts/restore-test.sh [YEDEK_KLASORU]
# Parametre verilmezse en yeni yedek otomatik seçilir:
#   1) /home/crmadmin/backups/current symlink (release yedeği), yoksa
#   2) /home/crmadmin/backups/daily altındaki en yeni günlük yedek.

set -euo pipefail

# ── Sabitler ──
TEST_CONTAINER="emlak-crm-restore-test"   # canlı 'emlak-crm-db'den FARKLI isim
PG_IMAGE="postgres:16-alpine"
PG_USER="emlak"
PG_DB="emlak_crm"
# Sadece test için tek seferlik şifre (efemeral, asla diske yazılmaz).
PG_PASS="restore-test-$(date +%s)-$$"
DAILY_ROOT=/home/crmadmin/backups/daily
CURRENT_LINK=/home/crmadmin/backups/current

TMPDIR=""   # trap için önceden tanımla

# ── Temizlik: efemeral container + geçici dizin her durumda silinir ──
cleanup() {
  local rc=$?
  echo "→ temizlik..."
  docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
  if [ -n "$TMPDIR" ] && [ -d "$TMPDIR" ]; then
    rm -rf "$TMPDIR" || true
  fi
  if [ "$rc" -ne 0 ]; then
    echo "✗ SONUÇ: FAIL (çıkış kodu $rc)"
  fi
  exit "$rc"
}
trap cleanup EXIT
# Beklenmeyen sinyalde de temizlik EXIT trap'ine düşer.
trap 'exit 1' INT TERM

# ── Yedek klasörünü belirle ──
BACKUP_DIR="${1:-}"
if [ -z "$BACKUP_DIR" ]; then
  if [ -e "$CURRENT_LINK" ]; then
    BACKUP_DIR=$(readlink -f "$CURRENT_LINK")
  elif [ -d "$DAILY_ROOT" ]; then
    # En yeni (alfanümerik sıralı tarih klasörü) günlük yedek
    BACKUP_DIR=$(find "$DAILY_ROOT" -mindepth 1 -maxdepth 1 -type d | sort | tail -1)
  fi
fi

if [ -z "$BACKUP_DIR" ] || [ ! -d "$BACKUP_DIR" ]; then
  echo "✗ Yedek klasörü bulunamadı: '${BACKUP_DIR:-<boş>}'"
  exit 1
fi
echo "=== restore-test: $(date -Iseconds) ==="
echo "→ Yedek klasörü: $BACKUP_DIR"

DB_SQL="$BACKUP_DIR/db.sql"
if [ ! -s "$DB_SQL" ]; then
  echo "✗ db.sql yok veya boş: $DB_SQL"
  exit 1
fi
echo "   db.sql: $(du -h "$DB_SQL" | cut -f1)"

# ── Geçici dizin (uploads açımı için) ──
TMPDIR=$(mktemp -d /tmp/emlak-restore-test.XXXXXX)

# ── Efemeral postgres container'ı başlat (host port YOK, --rm) ──
# Eski bir test container'ı kalmışsa önce temizle.
docker rm -f "$TEST_CONTAINER" >/dev/null 2>&1 || true
echo "→ Efemeral DB başlatılıyor ($TEST_CONTAINER, $PG_IMAGE, host portu yok)..."
docker run -d --rm \
  --name "$TEST_CONTAINER" \
  -e POSTGRES_USER="$PG_USER" \
  -e POSTGRES_PASSWORD="$PG_PASS" \
  -e POSTGRES_DB="$PG_DB" \
  "$PG_IMAGE" >/dev/null

# ── DB hazır olana kadar bekle ──
echo "→ DB hazır bekleniyor..."
ready=0
for _ in $(seq 1 60); do
  if docker exec "$TEST_CONTAINER" pg_isready -U "$PG_USER" -d "$PG_DB" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "✗ Efemeral DB 60 sn içinde hazır olmadı"
  exit 1
fi
echo "   ✓ hazır"

# ── db.sql'i efemeral DB'ye yükle ──
echo "→ db.sql yükleniyor..."
# psql hatalarında sürecin durması için ON_ERROR_STOP; pg_dump çıktısı zaten idempotent değil
# ama BOŞ bir DB'ye yüklendiği için temiz uygulanmalı.
if ! cat "$DB_SQL" | docker exec -i \
    -e PGOPTIONS='-c client_min_messages=warning' \
    "$TEST_CONTAINER" psql -v ON_ERROR_STOP=1 -q -U "$PG_USER" -d "$PG_DB" >/dev/null; then
  echo "✗ db.sql yüklenirken psql hata verdi"
  exit 1
fi
echo "   ✓ yüklendi"

# ── Kritik tabloların satır sayılarını doğrula (>0) ──
echo "→ Tablo satır sayıları doğrulanıyor..."
TABLES=(User Customer Property)
all_ok=1
declare -A COUNTS
for t in "${TABLES[@]}"; do
  # PascalCase tablo adları çift tırnak gerektirir; -t -A ile sade sayı al.
  cnt=$(docker exec "$TEST_CONTAINER" psql -t -A -U "$PG_USER" -d "$PG_DB" \
    -c "SELECT COUNT(*) FROM \"$t\";" 2>/dev/null | tr -d '[:space:]' || echo "")
  if ! [[ "$cnt" =~ ^[0-9]+$ ]]; then
    echo "   ✗ $t: sorgu başarısız (tablo yok olabilir)"
    COUNTS[$t]="HATA"
    all_ok=0
  elif [ "$cnt" -le 0 ]; then
    echo "   ✗ $t: $cnt satır (>0 bekleniyordu)"
    COUNTS[$t]="$cnt"
    all_ok=0
  else
    echo "   ✓ $t: $cnt satır"
    COUNTS[$t]="$cnt"
  fi
done

# ── uploads.tar.gz varsa aç ve dosya say ──
UPLOADS_TGZ="$BACKUP_DIR/uploads.tar.gz"
UPLOAD_FILES="(yok)"
if [ -s "$UPLOADS_TGZ" ]; then
  echo "→ uploads.tar.gz açılıyor ($(du -h "$UPLOADS_TGZ" | cut -f1))..."
  if tar xzf "$UPLOADS_TGZ" -C "$TMPDIR" 2>/dev/null; then
    UPLOAD_FILES=$(find "$TMPDIR" -type f | wc -l | tr -d '[:space:]')
    echo "   ✓ $UPLOAD_FILES dosya açıldı"
  else
    echo "   ✗ uploads.tar.gz açılamadı (bozuk olabilir)"
    all_ok=0
  fi
else
  echo "→ uploads.tar.gz yok, atlandı"
fi

# ── Özet ──
echo
echo "================= ÖZET ================="
echo "Yedek      : $BACKUP_DIR"
for t in "${TABLES[@]}"; do
  echo "$t satır  : ${COUNTS[$t]}"
done
echo "uploads dosya: $UPLOAD_FILES"
if [ "$all_ok" -eq 1 ]; then
  echo "SONUÇ: OK — yedek geri yüklenebilir"
  echo "========================================"
  exit 0
else
  echo "SONUÇ: FAIL — yedek doğrulaması başarısız"
  echo "========================================"
  exit 1
fi
