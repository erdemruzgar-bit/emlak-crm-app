#!/bin/bash
# Full deploy: pre-deploy → migrate → restart → post-restart smoke.
# Adımlardan herhangi biri fail ise durur.
#
# Kullanım:
#   ./scripts/deploy.sh           # her şeyi yapar
#   DRY_RUN=1 ./scripts/deploy.sh # migrate/restart YAPMA, sadece pre-deploy çalıştır

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

if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

START=$(date +%s)

# --- 1) Pre-deploy zinciri (HTTP smoke + E2E atla; restart sonrası yeniden çalışacak)
step "Aşama 1: Pre-deploy zinciri"
SKIP_HTTP=1 SKIP_E2E=1 bash scripts/pre-deploy.sh || die "Pre-deploy başarısız, deploy iptal"

if [[ "${DRY_RUN:-}" == "1" ]]; then
  echo -e "\n${YELLOW}DRY_RUN=1 — migrate/restart atlanıyor.${RESET}"
  exit 0
fi

# --- 2) Migration deploy
step "Aşama 2: Prisma migrate deploy"
if npx prisma migrate deploy; then
  ok "Migration uygulandı"
else
  die "Migration başarısız"
fi

# --- 3) Servisi yeniden başlat
step "Aşama 3: emlak-crm servisini yeniden başlat"
if sudo -n systemctl restart emlak-crm 2>/dev/null; then
  ok "Servis restart edildi"
elif sudo systemctl restart emlak-crm; then
  ok "Servis restart edildi"
else
  die "systemctl restart başarısız (sudo yetkisi?)"
fi

# --- 4) Servisin gerçekten ayakta olmasını bekle
step "Aşama 4: Servisi bekle (max 30s)"
for i in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 3 "http://127.0.0.1:3000/api/auth/csrf" 2>/dev/null || echo "000")
  if [[ "$CODE" == "200" ]]; then
    ok "Servis ayakta (${i}s)"
    break
  fi
  if [[ "$i" == "30" ]]; then
    die "Servis 30s içinde ayağa kalkmadı — sudo journalctl -u emlak-crm -n 50 ile log'lara bak"
  fi
  sleep 1
done

# --- 5) Post-restart HTTP smoke
step "Aşama 5: Post-restart HTTP smoke"
if bash scripts/healthcheck/http-smoke.sh "${HTTP_BASE_URL:-http://127.0.0.1:3000}"; then
  ok "HTTP smoke geçti"
else
  die "HTTP smoke başarısız — bir şeyler ters — log'a bak: sudo journalctl -u emlak-crm -n 100"
fi

# --- 6) Post-restart E2E (Playwright — chromium varsa)
step "Aşama 6: Post-restart E2E (opsiyonel)"
if [[ "${SKIP_E2E:-}" == "1" ]]; then
  echo -e "${YELLOW}E2E atlandı (SKIP_E2E=1)${RESET}"
elif ! ldconfig -p | grep -q libgbm.so.1; then
  echo -e "${YELLOW}⚠ Chromium sistem deps yok — E2E atlandı. Kurmak için: sudo npx playwright install-deps chromium${RESET}"
elif [[ ! -f "$HOME/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell" ]]; then
  echo -e "${YELLOW}⚠ Chromium binary yok — E2E atlandı. Kurmak için: npx playwright install chromium${RESET}"
else
  if npx playwright test --reporter=list 2>&1; then
    ok "E2E geçti — yeni kod davranışsal olarak doğru çalışıyor"
  else
    die "E2E başarısız — yeni kod runtime bug çıkardı. Rollback düşünün: ./scripts/rollback.sh (varsa) veya manuel"
  fi
fi

END=$(date +%s)
ELAPSED=$((END - START))
echo -e "\n${GREEN}${BOLD}✓ DEPLOY TAMAM — ${ELAPSED}s${RESET}"
echo -e "  ${BOLD}Servis:${RESET} https://crm.artinvertsment.com"
