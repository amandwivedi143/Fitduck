#!/usr/bin/env bash
# Deploy FitTrack to Minikube
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Starting Minikube (8GB RAM recommended)..."
minikube start --memory=8192 --cpus=4 --driver=docker 2>/dev/null || minikube start

echo "==> Enabling ingress addon..."
minikube addons enable ingress

echo "==> Creating namespace..."
kubectl apply -f "$SCRIPT_DIR/00-namespace.yaml"

if [[ -f "$ROOT_DIR/.env" ]]; then
  echo "==> Creating secrets from .env..."
  kubectl create secret generic fittrack-secrets \
    -n fittrack \
    --from-env-file="$ROOT_DIR/.env" \
    --dry-run=client -o yaml | kubectl apply -f -
else
  echo "WARNING: No .env found. Copy .env.example to .env and re-run, or edit kubernetes/01-secrets.example.yaml"
  kubectl apply -f "$SCRIPT_DIR/01-secrets.example.yaml"
fi

echo "==> Applying Kubernetes manifests..."
kubectl apply -f "$SCRIPT_DIR/02-configmap-nginx.yaml"
kubectl apply -f "$SCRIPT_DIR/03-rabbitmq.yaml"
kubectl apply -f "$SCRIPT_DIR/04-eureka.yaml"
kubectl apply -f "$SCRIPT_DIR/05-configserver.yaml"
sleep 30
kubectl apply -f "$SCRIPT_DIR/06-userservice.yaml"
kubectl apply -f "$SCRIPT_DIR/07-activity-service.yaml"
kubectl apply -f "$SCRIPT_DIR/08-ai-service.yaml"
kubectl apply -f "$SCRIPT_DIR/09-aihelper.yaml"
sleep 60
kubectl apply -f "$SCRIPT_DIR/10-gateway.yaml"
kubectl apply -f "$SCRIPT_DIR/11-frontend.yaml"
kubectl apply -f "$SCRIPT_DIR/12-ingress.yaml"

echo ""
echo "==> Waiting for pods..."
kubectl wait --for=condition=ready pod -l app=frontend -n fittrack --timeout=300s || true
kubectl get pods -n fittrack

MINIKUBE_IP=$(minikube ip)
echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  FitTrack deployed to Minikube!                            ║"
echo "╠════════════════════════════════════════════════════════════╣"
echo "║  Frontend (NodePort) : http://${MINIKUBE_IP}:30080         "
echo "║  Ingress (optional)  : http://fittrack.local (add to hosts)"
echo "║  Add to /etc/hosts   : ${MINIKUBE_IP} fittrack.local       "
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Run k6 load test:"
echo "  k6 run -e BASE_URL=http://${MINIKUBE_IP}:30080 k6/load-test.js"
