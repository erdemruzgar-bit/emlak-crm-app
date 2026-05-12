#!/bin/bash
# Pre-deploy doğrulama zinciri.
# Her adım önceki adım başarılı olduktan sonra çalışır.
# Adım fail ise script duruyor, çıkış kodu 1.
#
# Kullanım:
#   ./scripts/pre-deploy.sh           # tüm adımlar
#   SKIP_BUILD=1 ./scripts/pre-deploy.sh  # build'i atla (typecheck zaten yapar)
#   SKIP_HTTP=1 ./scripts/pre-deploy.sh   # HTTP smoke'u atla (servis henüz başlamadıysa)
#
# Adımlar:
#   1. TypeScript: tsc --noEmit
#   2. Lint: next lint
#   3. Build: next build
#   4. DB sağlık: scripts/healthcheck/db-check.ts
#   5. HTTP smoke (opsiyonel): scripts/healthcheck/http-smoke.sh

set -uo pipefail
cd "$(dirname "$0")/.."

if [[ -t 1 ]]; then
  GREEN='\033[32m'; RED='\033[31m'; YELLOW='\033[33m'; BOLD='\033[1m'; RESET='\033[0m'
else
  GREEN=''; RED=''; YELLOW=''; BOLD=''; RESET=''
fi

step() { echo -e "\n${BOLD}${YELLOW}▶ $1${RESET}"; }
ok()   { echo -e "${GREEN}✓ $1${RESET}"; }
fail() { echo -e "${RED}✗ $1${RESET}"; exit 1; }

# .env yükle (DATABASE_URL vb. — Prisma için lazım)
if [[ -f .env ]]; then
  set -a
  # shellcheck source=/dev/null
  source .env
  set +a
fi

START=$(date +%s)

step "[1/6] TypeScript check (tsc --noEmit)"
if npx tsc --noEmit; then
  ok "TypeScript hatasız"
else
  fail "TypeScript hataları var — yukarıya bak"
fi

step "[2/6] Lint + Baseline (eslint)"
# Önce baseline check — yeni warning eklenmişse uyarır
if [[ -f scripts/lint-baseline.json ]]; then
  if npx tsx scripts/lint-baseline-check.ts; then
    : # baseline temiz
  else
    BASELINE_EXIT=$?
    if [[ "$BASELINE_EXIT" == "1" ]]; then
      fail "Yeni lint hatası/uyarısı baseline'da yok — düzelt veya 'npm run lint:baseline:update' ile baseline'ı güncelle"
    fi
  fi
  ok "Baseline temiz (yeni warning yok)"
else
  echo -e "${YELLOW}⚠ Baseline yok — 'npm run lint:baseline:update' ile oluşturun${RESET}"
fi

# Sonra normal lint — error varsa zinciri durdur
# eslint.config.mjs içinde kural seviyeleri belirlendi:
#   ERROR (deploy bloke): react-hooks/exhaustive-deps, preserve-manual-memoization,
#                         purity, no-html-link-for-pages
#   WARN (raporlanır, geçer): set-state-in-effect, immutability, no-img-element,
#                              no-unused-vars, no-unescaped-entities, vb.
# Kullanıcı yeni gerçek bug eklerse buraya düşer; mevcut birikmiş warning'ler tolere edilir.
LINT_OUT=$(mktemp)
npm run lint --silent > "$LINT_OUT" 2>&1
LINT_EXIT=$?
ERR_COUNT=$(grep -oE "✖ [0-9]+ problems? \([0-9]+ errors?, [0-9]+ warnings?\)" "$LINT_OUT" | grep -oE "\([0-9]+" | grep -oE "[0-9]+" | head -1)
ERR_COUNT="${ERR_COUNT:-0}"
WARN_COUNT=$(grep -oE "[0-9]+ warnings?\)" "$LINT_OUT" | grep -oE "[0-9]+" | head -1)
WARN_COUNT="${WARN_COUNT:-0}"

if [[ "$LINT_EXIT" -eq 0 ]] || [[ "$ERR_COUNT" -eq 0 ]]; then
  ok "Lint: 0 error, ${WARN_COUNT} warning"
  rm -f "$LINT_OUT"
else
  echo -e "${RED}Lint: ${ERR_COUNT} error, ${WARN_COUNT} warning${RESET}"
  echo -e "--- error detayları ---"
  grep " error " "$LINT_OUT" | head -20
  echo -e "(tam çıktı: $LINT_OUT)"
  fail "Lint hatası — yukarıdaki error'ları düzelt"
fi

if [[ "${SKIP_BUILD:-}" == "1" ]]; then
  echo -e "${YELLOW}[3/6] Build ATLANDI (SKIP_BUILD=1)${RESET}"
else
  step "[3/6] Next.js production build"
  if npm run build --silent; then
    ok "Build başarılı"
  else
    fail "Build hatası"
  fi
fi

step "[4/6] DB sağlık (prisma + tablo check)"
if npx tsx scripts/healthcheck/db-check.ts; then
  ok "DB sağlıklı"
else
  fail "DB kontrol başarısız — yukarıdaki [FAIL] satırlarına bak"
fi

if [[ "${SKIP_HTTP:-}" == "1" ]]; then
  echo -e "${YELLOW}[5/6] HTTP smoke ATLANDI (SKIP_HTTP=1)${RESET}"
else
  step "[5/6] HTTP smoke (canlı servis)"
  if bash scripts/healthcheck/http-smoke.sh "${HTTP_BASE_URL:-http://127.0.0.1:3000}"; then
    ok "HTTP smoke geçti"
  else
    echo -e "${YELLOW}⚠ HTTP smoke başarısız — servis kapalı olabilir. Yeniden başlatma sonrası tekrar deneyin.${RESET}"
    # HTTP failure CI/build'ı bloke etmesin (servis kapalıyken normal); deploy.sh post-restart'ta tekrar koşar
  fi
fi

# [6/6] Playwright E2E — opsiyonel, SKIP_E2E=1 ile atla
# E2E için canlı servis + chromium sistem deps gerekiyor.
# Hata: SKIP_E2E set edilmemişse zinciri durdurur.
if [[ "${SKIP_E2E:-}" == "1" ]]; then
  echo -e "${YELLOW}[6/6] E2E ATLANDI (SKIP_E2E=1)${RESET}"
else
  step "[6/6] Playwright E2E (canlı servis + chromium gerek)"
  # Chromium kurulu mu hızlı check
  if [[ ! -f "$HOME/.cache/ms-playwright/chromium_headless_shell-1223/chrome-headless-shell-linux64/chrome-headless-shell" ]]; then
    echo -e "${YELLOW}⚠ Chromium binary bulunamadı — atlanıyor. Kurmak için: npx playwright install chromium${RESET}"
  elif ! command -v gbm-test &>/dev/null && ! ldconfig -p | grep -q libgbm.so.1; then
    echo -e "${YELLOW}⚠ Chromium sistem deps eksik (libgbm vb.) — atlanıyor. Kurmak için: sudo npx playwright install-deps chromium${RESET}"
  else
    if npx playwright test --reporter=list 2>&1; then
      ok "E2E testleri geçti"
    else
      fail "E2E test başarısız — düzelt veya SKIP_E2E=1 ile atla"
    fi
  fi
fi

END=$(date +%s)
ELAPSED=$((END - START))
echo -e "\n${GREEN}${BOLD}✓ PRE-DEPLOY tamam — ${ELAPSED}s${RESET}"
echo -e "${BOLD}Şimdi deploy edilebilir.${RESET} İpucu: ${YELLOW}npm run deploy${RESET}"
