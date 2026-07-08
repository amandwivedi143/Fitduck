#!/usr/bin/env bash
set -e

DOCKERHUB_USER="2201920100047"
TAG="latest"

build_and_push() {
  local service="$1"

  echo "Building and pushing: $service"

  cd "$service"
  docker build -t "$DOCKERHUB_USER/$service:$TAG" .
  docker push "$DOCKERHUB_USER/$service:$TAG"
  cd ..
}

build_and_push "eureka"
build_and_push "configserver"
build_and_push "userservice"
build_and_push "activity-status"
build_and_push "aiservice"
build_and_push "aihelper"
build_and_push "gateway"

echo "All images built and pushed successfully."