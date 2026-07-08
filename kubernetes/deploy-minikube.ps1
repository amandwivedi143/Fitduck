# Deploy FitTrack to Minikube (PowerShell)
$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$RootDir = Split-Path -Parent $ScriptDir

Write-Host "==> Starting Minikube (8GB RAM recommended)..."
minikube start --memory=8192 --cpus=4 --driver=docker

Write-Host "==> Enabling ingress addon..."
minikube addons enable ingress

Write-Host "==> Creating namespace..."
kubectl apply -f (Join-Path $ScriptDir "00-namespace.yaml")

$envFile = Join-Path $RootDir ".env"
if (Test-Path $envFile) {
    Write-Host "==> Creating secrets from .env..."
    kubectl create secret generic fittrack-secrets `
        -n fittrack `
        --from-env-file=$envFile `
        --dry-run=client -o yaml | kubectl apply -f -
} else {
    Write-Host "WARNING: No .env found. Copy .env.example to .env first."
    kubectl apply -f (Join-Path $ScriptDir "01-secrets.example.yaml")
}

Write-Host "==> Applying Kubernetes manifests..."
kubectl apply -f (Join-Path $ScriptDir "02-configmap-nginx.yaml")
kubectl apply -f (Join-Path $ScriptDir "03-rabbitmq.yaml")
kubectl apply -f (Join-Path $ScriptDir "04-eureka.yaml")
kubectl apply -f (Join-Path $ScriptDir "05-configserver.yaml")
Start-Sleep -Seconds 30
kubectl apply -f (Join-Path $ScriptDir "06-userservice.yaml")
kubectl apply -f (Join-Path $ScriptDir "07-activity-service.yaml")
kubectl apply -f (Join-Path $ScriptDir "08-ai-service.yaml")
kubectl apply -f (Join-Path $ScriptDir "09-aihelper.yaml")
Start-Sleep -Seconds 60
kubectl apply -f (Join-Path $ScriptDir "10-gateway.yaml")
kubectl apply -f (Join-Path $ScriptDir "11-frontend.yaml")
kubectl apply -f (Join-Path $ScriptDir "12-ingress.yaml")

Write-Host "==> Waiting for pods..."
kubectl wait --for=condition=ready pod -l app=frontend -n fittrack --timeout=300s
kubectl get pods -n fittrack

$minikubeIp = minikube ip
Write-Host ""
Write-Host "FitTrack deployed!"
Write-Host "  Frontend: http://${minikubeIp}:30080"
Write-Host "  k6 test:  k6 run -e BASE_URL=http://${minikubeIp}:30080 k6/load-test.js"
