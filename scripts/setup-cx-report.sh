#!/usr/bin/env bash
# Install Python deps + Chromium for CX Playwright PDFs (annual + CSAT/NPS/CES).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPORT_DIR="${CX_REPORT_ROOT:-$ROOT/pdf-files/cx_report}"
PYTHON="${CX_REPORT_PYTHON_BOOTSTRAP:-python3}"

if [[ ! -f "$REPORT_DIR/requirements.txt" ]]; then
  echo "Missing $REPORT_DIR/requirements.txt" >&2
  exit 1
fi

if ! command -v "$PYTHON" >/dev/null 2>&1; then
  echo "Python not found: $PYTHON" >&2
  exit 1
fi

PY_VER="$("$PYTHON" -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
cd "$REPORT_DIR"
rm -rf .venv

if ! "$PYTHON" -m venv .venv; then
  echo >&2
  echo "Failed to create .venv (ensurepip / venv missing on this host)." >&2
  echo "On Debian/Ubuntu install the matching package, then re-run this script:" >&2
  echo "  sudo apt update && sudo apt install -y python${PY_VER}-venv" >&2
  echo "Then:" >&2
  echo "  cd \"$ROOT\" && ./scripts/setup-cx-report.sh" >&2
  exit 1
fi

# shellcheck disable=SC1091
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m playwright install --with-deps chromium || python -m playwright install chromium
echo "CX report Python env ready at $REPORT_DIR/.venv"
echo "Set CX_REPORT_PYTHON=$REPORT_DIR/.venv/bin/python if needed."
echo "Annual + one-page metric PDFs use this tree (build_report.py --type=csat|nps|ces)."
