#!/bin/bash
set -euo pipefail

if [ "$(id -u)" -ne 0 ]; then
  echo "Tento skript spusti s sudo: sudo bash deploy/install.sh"
  exit 1
fi

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
echo "Adresar appky: $APP_DIR"

git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js nie je najdeny v PATH. Najprv ho nainstaluj (pozri README-DEPLOY.md) a skript spusti znova."
  exit 1
fi
echo "Node.js verzia: $(node -v)"

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  SECRET="$(openssl rand -hex 24)"
  sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SECRET|" "$APP_DIR/.env"
  echo ""
  echo "Vytvoreny $APP_DIR/.env s nahodnym SESSION_SECRET."
  echo "DOPLN prosim ANTHROPIC_API_KEY do tohto suboru pred spustenim:"
  echo "  sudo nano $APP_DIR/.env"
  echo ""
else
  echo "$APP_DIR/.env uz existuje, nemenim ho."
  if ! grep -q "^ANTHROPIC_API_KEY=.\+" "$APP_DIR/.env"; then
    echo "UPOZORNENIE: ANTHROPIC_API_KEY v .env vyzera prazdny - generovanie rozpravok zlyha, kym ho nedoplnis."
  fi
fi

echo "Nastavujem vlastnika suborov na www-data..."
mkdir -p "$APP_DIR/data"
chown -R www-data:www-data "$APP_DIR"

echo "Instalujem systemd sluzbu..."
sed "s|__APP_DIR__|$APP_DIR|g" "$APP_DIR/deploy/bedtime-story-app.service" > /etc/systemd/system/bedtime-story-app.service
systemctl daemon-reload
systemctl enable --now bedtime-story-app

sleep 1
systemctl --no-pager status bedtime-story-app || true

echo ""
echo "Hotovo. Dalsie kroky:"
echo "1. Uisti sa, ze v $APP_DIR/.env je vyplneny ANTHROPIC_API_KEY (ak nebol, doplň ho a spusti: sudo systemctl restart bedtime-story-app)"
echo "2. Pridaj do svojho Apache vhostu riadky z $APP_DIR/deploy/apache-rozpravky.conf a restartuj apache: sudo systemctl restart apache2"
echo "3. Otvor http://tvoj-server/rozpravky/ v prehliadaci."
