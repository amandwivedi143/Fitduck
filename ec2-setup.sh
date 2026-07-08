#!/usr/bin/env bash
# ============================================================
# EC2 Free-Tier Bootstrap — Fitness Web Microservices
# ============================================================
# Run this script on a fresh Amazon Linux 2023 EC2 instance:
#   chmod +x ec2-setup.sh && ./ec2-setup.sh
#
# Prerequisites:
#   - EC2 t2.micro or t3.micro (1 GB RAM, free tier)
#   - Security group: open port 80 (HTTP) inbound
#   - SSH access with your key pair
# ============================================================
set -euo pipefail

echo "============================================"
echo "  EC2 Free-Tier Setup for Fitness App"
echo "============================================"

# ---------- 1. System updates ----------
echo "[1/7] Updating system..."
sudo dnf update -y

# ---------- 2. Install Docker ----------
echo "[2/7] Installing Docker..."
sudo dnf install -y docker
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# ---------- 3. Install Docker Compose ----------
echo "[3/7] Installing Docker Compose..."
DOCKER_COMPOSE_VERSION="2.32.4"
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL "https://github.com/docker/compose/releases/download/v${DOCKER_COMPOSE_VERSION}/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version

# ---------- 4. Add 2 GB swap (critical for 1 GB RAM) ----------
echo "[4/7] Creating 2 GB swap file..."
if [ ! -f /swapfile ]; then
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile swap swap defaults 0 0' | sudo tee -a /etc/fstab
else
  echo "  Swap already exists, skipping..."
fi
echo "  Swap status:"
  free -h | grep -i swap
}

# ---------- 5. Tune kernel for low memory ----------
echo "[5/7] Tuning kernel for low memory..."
sudo sysctl -w vm.swappiness=60
sudo sysctl -w vm.overcommit_memory=1
# Persist
grep -q 'vm.swappiness=60' /etc/sysctl.conf || echo 'vm.swappiness=60' | sudo tee -a /etc/sysctl.conf
grep -q 'vm.overcommit_memory=1' /etc/sysctl.conf || echo 'vm.overcommit_memory=1' | sudo tee -a /etc/sysctl.conf

# ---------- 6. Clone / copy project ----------
echo "[6/7] Setting up project directory..."
PROJECT_DIR="/home/ec2-user/fitness_web_microservices"
if [ -d "$PROJECT_DIR" ]; then
  echo "  Project directory exists, pulling latest..."
  cd "$PROJECT_DIR"
  git pull || true
else
  echo "  Clone your repo here or copy files to: $PROJECT_DIR"
  mkdir -p "$PROJECT_DIR"
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f "$PROJECT_DIR/.env" ] && [ -f "$PROJECT_DIR/.env.example" ]; then
  echo "  Creating .env from .env.example — EDIT THIS WITH YOUR CREDENTIALS!"
  cp "$PROJECT_DIR/.env.example" "$PROJECT_DIR/.env"
fi

# ---------- 7. Build and start ----------
echo "[7/7] Building and starting services..."
echo "  ⚠  This will take 15-30 minutes on first build (Maven downloads)."
cd "$PROJECT_DIR"

# NOTE: You must re-login (or run: newgrp docker) for docker group
echo ""
echo "============================================"
echo "  ✅ Setup complete!"
echo "============================================"
echo ""
echo "  Next steps:"
echo "    1. Log out and SSH back in (for docker group)"
echo "    2. cd ~/fitness_web_microservices"
echo "    3. Edit .env with your real credentials"
echo "    4. docker compose up -d --build"
echo ""
echo "  Check status:  docker compose ps"
echo "  View logs:     docker compose logs -f <service>"
echo "  Stop all:      docker compose down"
echo ""
echo "  Memory usage:  watch -n 2 free -h"
echo "============================================"
