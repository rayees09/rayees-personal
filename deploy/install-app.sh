#!/bin/bash
# Install script - run after copying code to server
# Run as: sudo bash install-app.sh

set -e
APP_DIR="/var/www/family-app"
cd $APP_DIR

echo "=== Setting up Backend ==="
cd backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
pip install gunicorn

echo "=== Setting up Frontend ==="
cd ../frontend
npm install
npm run build

echo "=== Setting up Nginx ==="
cp $APP_DIR/deploy/nginx.conf /etc/nginx/sites-available/family-app
ln -sf /etc/nginx/sites-available/family-app /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

echo "=== Setting up Systemd Service ==="
cp $APP_DIR/deploy/family-app.service /etc/systemd/system/
systemctl daemon-reload
systemctl enable family-app
systemctl start family-app

echo "=== Done! ==="
echo "App running at http://YOUR_SERVER_IP"
echo ""
echo "Next steps:"
echo "1. Update /var/www/family-app/backend/.env with your database URL"
echo "2. Run: sudo systemctl restart family-app"
echo "3. For HTTPS: sudo certbot --nginx -d yourdomain.com"
