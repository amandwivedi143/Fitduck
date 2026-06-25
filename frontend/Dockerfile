# ---------- Frontend (React + Vite, served by nginx) ----------
# Build the static bundle with Node, then serve it with nginx.
FROM node:20-alpine AS build
WORKDIR /app

# Install deps with cached layer (lockfile changes less often than source).
COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:alpine
# nginx serves the SPA on 5173 and proxies /api to the gateway container,
# mirroring the Vite dev-server proxy in vite.config.js.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 5173
