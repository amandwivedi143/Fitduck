#!/bin/bash
# ============================================================
# deploy.sh — One-command setup for Oracle Cloud (Ubuntu ARM)
# ============================================================
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# Run this on a fresh Ubuntu VM. It will:
#   1. Install Docker + Docker Compose
#   2. Check for project directory
#   3. Prompt for .env values
#   4. Build and start all services
#
# Databases are external: TiDB Cloud + MongoDB Atlas
# ============================================================

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${GREEN}=== Fitness Web Microservices — Deployment Script ===${NC}"
echo ""

# ---- 1. Install Docker if not present ----
if ! command -v docker &>/dev/null; then
    echo -e "${YELLOW}Docker not found. Installing...${NC}"
    sudo apt-get update
    sudo apt-get install -y ca-certificates curl gnupg
    sudo install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    sudo chmod a+r /etc/apt/keyrings/docker.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    sudo usermod -aG docker $USER
    echo -e "${GREEN}Docker installed. You may need to log out and back in.${NC}"
    # Apply docker group without logout
    if ! sg docker -c "true" 2>/dev/null; then
        echo -e "${YELLOW}Docker group not active yet. Running with sudo for this session...${NC}"
        alias docker='sudo docker'
        alias docker compose='sudo docker compose'
    fi
else
    echo -e "${GREEN}Docker already installed.${NC}"
fi

# ---- 2. Check for project directory ----
PROJECT_DIR="$(pwd)"
if [ ! -f "docker-compose.yml" ]; then
    echo -e "${RED}docker-compose.yml not found in current directory.${NC}"
    echo -e "${YELLOW}Clone your repo first:${NC}"
    echo "  git clone <your-repo-url> fitness-app"
    echo "  cd fitness-app"
    exit 1
fi

# ---- 3. Check .env exists ----
if [ ! -f ".env" ]; then
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo -e "${YELLOW}.env created from .env.example — EDIT IT BEFORE CONTINUING!${NC}"
        echo ""
        echo "Required values to fill in:"
        echo "  SPRING_DATASOURCE_URL — TiDB Cloud JDBC URL"
        echo "  DB_USERNAME           — TiDB Cloud username"
        echo "  DB_PASSWORD           — TiDB Cloud password"
        echo "  MONGODB_URI           — MongoDB Atlas connection URI"
        echo "  GOOGLE_CLIENT_ID      — Google OAuth2 client ID"
        echo "  GOOGLE_CLIENT_SECRET — Google OAuth2 client secret"
        echo "  APP_JWT_SECRET        — random 32+ char string (run: openssl rand -base64 32)"
        echo "  GEN_AI_KEY            — Groq API key"
        echo ""
        echo -e "${RED}Aborting. Edit .env, then run this script again.${NC}"
        exit 1
    else
        echo -e "${RED}.env.example not found. Cannot create .env${NC}"
        exit 1
    fi
fi

# ---- 4. Validate .env ----
source .env
MISSING=0

if [ "$SPRING_DATASOURCE_URL" = "" ] || [[ "$SPRING_DATASOURCE_URL" == *"your_tidb"* ]]; then
    echo -e "${RED}ERROR: SPRING_DATASOURCE_URL is not set in .env${NC}"
    MISSING=1
fi
if [ "$DB_USERNAME" = "" ] || [ "$DB_USERNAME" = "your_tidb_username.root" ]; then
    echo -e "${RED}ERROR: DB_USERNAME is not set in .env${NC}"
    MISSING=1
fi
if [ "$DB_PASSWORD" = "" ] || [ "$DB_PASSWORD" = "your_tidb_password" ]; then
    echo -e "${RED}ERROR: DB_PASSWORD is not set in .env${NC}"
    MISSING=1
fi
if [ "$MONGODB_URI" = "" ] || [[ "$MONGODB_URI" == *"username:password"* ]]; then
    echo -e "${RED}ERROR: MONGODB_URI is not set in .env${NC}"
    MISSING=1
fi
if [ "$GOOGLE_CLIENT_ID" = "" ] || [[ "$GOOGLE_CLIENT_ID" == *"your-google"* ]]; then
    echo -e "${RED}ERROR: GOOGLE_CLIENT_ID is not set in .env${NC}"
    MISSING=1
fi
if [ "$APP_JWT_SECRET" = "" ]; then
    echo -e "${RED}ERROR: APP_JWT_SECRET is not set in .env${NC}"
    MISSING=1
fi
if [ "$GEN_AI_KEY" = "" ] || [ "$GEN_AI_KEY" = "your-groq-api-key-here" ]; then
    echo -e "${RED}ERROR: GEN_AI_KEY is not set in .env${NC}"
    MISSING=1
fi

if [ "$MISSING" = "1" ]; then
    echo -e "${RED}Aborting. Fix the values above in .env and re-run.${NC}"
    exit 1
fi

echo -e "${GREEN}All env vars validated.${NC}"

# ---- 5. Build and start ----
echo ""
echo -e "${YELLOW}Building all images (this takes 5-10 min on first run)...${NC}"
docker compose build --parallel

echo ""
echo -e "${YELLOW}Starting all services...${NC}"
docker compose up -d

# ---- 6. Wait and check ----
echo ""
echo -e "${YELLOW}Waiting for services to start (health checks)...${NC}"
sleep 10

echo ""
echo -e "${GREEN}=== Service Status ===${NC}"
docker compose ps

echo ""
echo -e "${GREEN}=== Checking container logs (last 5 lines each) ===${NC}"
docker compose logs --tail=5

echo ""
echo -e "${GREEN}=============================================${NC}"
echo -e "${GREEN} Deployment complete!${NC}"
echo -e "${GREEN}=============================================${NC}"
echo ""
echo "Your app should be accessible at: http://$(hostname -I | awk '{print $1}')"
echo ""
echo "External databases in use:"
echo "  TiDB Cloud    — ${SPRING_DATASOURCE_URL}"
echo "  MongoDB Atlas — configured"
echo ""
echo "Useful commands:"
echo "  docker compose logs -f          # Watch all logs"
echo "  docker compose logs -f gateway   # Watch gateway logs only"
echo "  docker compose ps               # Check service health"
echo "  docker compose down             # Stop everything"
echo "  docker compose up -d --build    # Rebuild and restart"
