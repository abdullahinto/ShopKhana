#!/bin/bash

echo "🚀 Starting deployment..."

# Navigate to project directory
cd /ShopKhana || exit

# Pull latest changes from git
echo "🔄 Pulling latest code..."
git pull origin main

# Activate virtual environment
echo "🐍 Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "📦 Installing dependencies..."
pip install -r requirements.txt

# Restart Gunicorn
echo "🔁 Restarting Gunicorn..."
sudo systemctl daemon-reexec
sudo systemctl restart gunicorn

echo "✅ Deployment complete."
