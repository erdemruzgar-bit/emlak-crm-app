#!/bin/bash
# Full deploy: pre-deploy doğrulama → release.sh (yedek+migrate+build+tag+restart) → post-deploy smoke+E2E.
#
# release.sh'in atlanma riskini kaldırır: deploy.sh sadece release.sh çağırır,
# her sürüm bir yedek + git tag alır. Drive'a otomatik kopya gider, 90 gün retention.
#
# Kullanım:
#   ./scripts/deploy.sh "kısa sürüm açıklaması"
#   DRY_RUN=1 ./scripts/deploy.sh "test"   # pre-deploy çalıştırır, release.sh'i atlar
#
# Önkoşul: tüm değişiklikler commit edilmiş olmalı (release.sh kontrol eder).

set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -t 1 ]]; then
  GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

step() { echo -e "\n${BOLD}${YELLOW}▶ $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
die()  { echo -e "${RED}✗ $1${RESET}"; exit 1; }

MESSAGE="${1:-}"
if [[ -z "$MESSAGE" ]]; then
  die "Sürüm açıklaması zorunlu. Kullanım: ./scripts/deploy.sh \"kısa açıklama\""
fi

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

START=$(date +%s)

# --- 1) Pre-deploy zinciri (HTTP smoke + E2E atla; restart sonrası çalışacak)
step "Aşama 1: Pre-deploy doğrulama (typecheck + lint baseline + build + DB + HTTP smoke)"
SKIP_HTTP=1 SKIP_E2E=1 bash scripts/pre-deploy.sh || die "Pre-deploy başarısız, deploy iptal — release.sh çağrılmadı"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo -e "\n${YELLOW}DRY_RUN=1 — release.sh atlandı, yedek alınmadı.${RESET}"
  exit 0
fi

# --- 2) release.sh: YEDEK + migrate + build + tag + restart + Drive
step "Aşama 2: Sürüm yayını (release.sh) — yedek + git tag + restart"
echo -e "${BOLD}Bu adım atlanamaz — her deploy bir yedek alır.${RESET}"
bash scripts/release.sh "$MESSAGE" || die "Release başarısız (yedeklemede problem olabilir, log'a bak)"

# --- 3) Servisin gerçekten ayakta olmasını doğrula
step "Aşama 3: Servis sağlık kontrolü (max 30s)"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "http://127.0.0.1:3000/api/auth/csrf" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    ok "Servis ayakta (${i}s)"
    break
  fi
  if [[ "$i" == "30" ]]; then
    die "Servis 30s içinde ayağa kalkmadı — log: sudo journalctl -u emlak-crm -n 50 — ROLLBACK için: ./scripts/rollback.sh"
  fi
  sleep 1
done

# --- 4) Post-deploy HTTP smoke
step "Aşama 4: Post-deploy HTTP smoke"
if bash scripts/healthcheck/http-smoke.sh "${HTTP_BASE_URL:-http://127.0.0.1:3000}"; then
  ok "HTTP smoke geçti"
else
  die "HTTP smoke başarısız — ROLLBACK düşün: ./scripts/rollback.sh"
fi

# --- 5) Post-deploy E2E (Playwright)
step "Aşama 5: Post-deploy E2E"
if [[ "${SKIP_E2E:-}" == "1" ]]; then
  echo -e "${YELLOW}E2E atlandı (SKIP_E2E=1)${RESET}"
elif ! ldconfig -p | grep -q libgbm.so.1; then
  echo -e "${YELLOW}⚠ Chromium sistem deps yok — E2E atlandı.${RESET}"
elif [[ ! -f "$HOME/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell" ]]; then
  echo -e "${YELLOW}⚠ Chromium binary yok — E2E atlandı.${RESET}"
else
  if npx playwright test --reporter=list 2>&1; then
    ok "E2E geçti — yeni kod davranışsal olarak doğru"
  else
    die "E2E başarısız — yeni kod runtime bug çıkardı. ROLLBACK: ./scripts/rollback.sh"
  fi
fi

END=$(date +%s)
ELAPSED=$((END - START))
echo -e "\n${GREEN}${BOLD}✓ DEPLOY TAMAM — ${ELAPSED}s${RESET}"
echo -e "  ${BOLD}Servis:${RESET} https://crm.artinvertsment.com"
echo -e "  ${BOLD}Geri dönmek:${RESET} ls /home/crmadmin/backups → ./scripts/rollback.sh <TAG>"
