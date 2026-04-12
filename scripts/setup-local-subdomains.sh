#!/usr/bin/env bash
# Optional: map api.localhost and app.localhost to loopback when your OS does not resolve *.localhost.
# Many browsers resolve *.localhost to 127.0.0.1 (RFC 6761); if yours does not, run this once.

set -euo pipefail

ENTRIES=("api.localhost" "app.localhost")
HOSTS_FILE="/etc/hosts"
LINE="127.0.0.1 ${ENTRIES[*]}"

if grep -qF "api.localhost" "$HOSTS_FILE" 2>/dev/null && grep -qF "app.localhost" "$HOSTS_FILE" 2>/dev/null; then
  echo "Looks like $HOSTS_FILE already mentions api.localhost / app.localhost."
  exit 0
fi

echo "Add this line to $HOSTS_FILE (requires sudo):"
echo ""
echo "  $LINE"
echo ""
echo "Example:"
echo "  echo '$LINE' | sudo tee -a $HOSTS_FILE"
echo ""
echo "Then use in .env:"
echo "  BASE_URL=http://api.localhost:3000"
echo "  WEB_URL=http://app.localhost:3000"
echo ""
echo "Open the app at WEB_URL (e.g. http://app.localhost:3000/subscribe)."
