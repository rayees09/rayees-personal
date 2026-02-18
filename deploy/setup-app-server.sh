#!/bin/bash
# Setup script for EC2 App Server (Ubuntu 22.04)
# Run as: sudo bash setup-app-server.sh

set -e

echo "=== Installing dependencies ==="
apt-get update
apt-get install -y python3.11 python3.11-venv python3-pip nginx certbot python3-certbot-nginx git

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt-get install -y nodejs

echo "=== Creating app user ==="
useradd -m -s /bin/bash appuser || true

echo "=== Setting up application directory ==="
mkdir -p /var/www/family-app
chown appuser:appuser /var/www/family-app

echo "=== Clone or copy your code to /var/www/family-app ==="
echo "Then run: sudo bash /var/www/family-app/deploy/install-app.sh"
