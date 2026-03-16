#!/usr/bin/env bash
set -euo pipefail

APP_DIR=/opt/schoolpulse
SERVICE_FILE=/etc/systemd/system/schoolpulse.service

echo "Installing base packages..."
apt update
apt install -y nodejs npm smbclient

mkdir -p "$APP_DIR"
cp -R ./* "$APP_DIR"/

if [ ! -f "$APP_DIR/.env" ]; then
  cp "$APP_DIR/.env.example" "$APP_DIR/.env"
  echo "Created $APP_DIR/.env from .env.example"
fi

cp "$APP_DIR/systemd/schoolpulse.service" "$SERVICE_FILE"
systemctl daemon-reload
systemctl enable schoolpulse
systemctl restart schoolpulse || systemctl start schoolpulse

echo "SchoolPulse installed. Edit $APP_DIR/.env and restart with: systemctl restart schoolpulse"
