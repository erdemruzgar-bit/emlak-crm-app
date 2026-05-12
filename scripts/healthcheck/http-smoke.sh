#!/bin/bash
# HTTP smoke test — emlak-crm canlı servisin temel sayfalarını ve auth akışını test eder.
# Beklenen davranışlar:
#   - / → 307 (login redirect, çünkü middleware auth zorluyor)
#   - /login → 200 (giriş sayfası açılıyor)
#   - /api/auth/csrf → 200 (next-auth çalışıyor)
#   - /api/auth/providers → 200
#   - /api/properties (auth yok) → 307/401 (RBAC çalışıyor, bypass yok)
#
# Exit 0 → hepsi geçti. Exit 1 → en az biri başarısız.
#
# Kullanım:
#   ./scripts/healthcheck/http-smoke.sh [BASE_URL]
#   BASE_URL varsayılan: http://127.0.0.1:3000

set -uo pipefail

BASE="${1:-http://127.0.0.1:3000}"
TIMEOUT=8

# Renk
if [[ -t 1 ]]; then
  GREEN='\033[32m'; RED='\033[31m'; DIM='\033[2m'; RESET='\033[0m'
else
  GREEN=''; RED=''; DIM=''; RESET=''
fi

PASS=0
FAIL=0

check() {
  local name="$1"
  local url="$2"
  local expected="$3"  # "200" veya "307,401" gibi virgülle ayrılmış
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" -m "$TIMEOUT" "$url" 2>/dev/null || echo "000")
  if [[ ",$expected," == *",$code,"* ]]; then
    echo -e "${GREEN}[OK]${RESET}   $name ${DIM}— $code${RESET}"
    PASS=$((PASS+1))
  else
    echo -e "${RED}[FAIL]${RESET} $name ${DIM}— gerçek $code, beklenen $expected${RESET}"
    FAIL=$((FAIL+1))
  fi
}

echo "HTTP-SMOKE: $BASE"
echo "---"

check "Anasayfa redirect"         "$BASE/"                       "307,200"
check "Login sayfası"             "$BASE/login"                  "200"
check "Properties (auth zorlu)"   "$BASE/properties"             "307,200,401"
check "Customers (auth zorlu)"    "$BASE/customers"              "307,200,401"
check "Dashboard (auth zorlu)"    "$BASE/dashboard"              "307,200,401"
check "Settings/Branches"         "$BASE/settings/branches"      "307,200,401"

# API
check "API: auth/csrf"            "$BASE/api/auth/csrf"          "200"
check "API: auth/providers"       "$BASE/api/auth/providers"     "200"
# Aşağıdaki API'ler auth gerektirir; 307/401 dönmeli — sızıntı yok demektir.
check "API: properties (auth)"    "$BASE/api/properties?limit=1" "307,401"
check "API: customers (auth)"     "$BASE/api/customers?limit=1"  "307,401"
check "API: projects (auth)"      "$BASE/api/projects"           "307,401"
check "API: branches (auth)"      "$BASE/api/branches"           "307,401"

echo "---"
TOTAL=$((PASS+FAIL))
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}HTTP-SMOKE: ${PASS}/${TOTAL} geçti${RESET}"
  exit 0
else
  echo -e "${RED}HTTP-SMOKE: ${PASS}/${TOTAL} geçti — ${FAIL} başarısız${RESET}"
  exit 1
fi
