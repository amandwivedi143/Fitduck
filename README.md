# 🏋️ FitTrack — AI-Powered Fitness Microservices

A full-stack fitness tracking platform built with **Spring Cloud microservices**, **Google OAuth2**, **RabbitMQ**, **MongoDB**, **MySQL**, and a bold **React + Material UI** frontend.

## Architecture

```
                          ┌──────────────────────────────────┐
  Frontend (:5173)        │  GATEWAY (:8080)                 │
  React + MUI ──proxy──►  │  Google OAuth2 token-exchange    │
                          │  App JWT (httpOnly cookie)        │
                          │  Routes → backend services        │
                          └────────┬───────┬─────────┬──────┘
                                   │       │         │
                    ┌──────────────▼──┐   ┌──▼───────────────┐
                    │ USER-SERVICE    │   │ ACTIVITY-SERVICE │
                    │ :8081  MySQL    │   │ :8082  MongoDB   │
                    └───────────────┬┘   └──────┬───────────┘
                            validate│             │ publish
                    ┌───────────────▼─────────────▼──┐
                    │      RABBITMQ (:5672)          │
                    │  fitness.exchange → activity.queue
                    └───────────────▲────────────────┘
                                    │ consume
                    ┌───────────────┴────────────────┐
                    │ AI-SERVICE                      │
                    │ :8083  MongoDB + Groq LLM        │
                    └─────────────────────────────────┘

    Discovery:  EUREKA :8761          Config:  CONFIG-SERVER :8888
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Material UI 6, MUI X Charts |
| Gateway | Spring Cloud Gateway (WebFlux), Google ID-token verification, HS256 app JWT |
| Auth | Google OAuth2 (token-exchange — Google ID token → app JWT in httpOnly cookie) |
| User Service | Spring Boot 4.0.1, JPA, MySQL 8 |
| Activity Service | Spring Boot 4.0.1, MongoDB, RabbitMQ producer |
| AI Service | Spring Boot 4.0.1, MongoDB, RabbitMQ consumer, Groq API (gpt-oss-120b) |
| Discovery | Netflix Eureka |
| Config | Spring Cloud Config Server (native profile) |
| Messaging | RabbitMQ (direct exchange) |

---

## Prerequisites (Local Dev)

1. **Java 17+** — [Download JDK](https://adoptium.net/)
2. **Node.js 18+** — [Download Node](https://nodejs.org/)
3. **MySQL 8** — running on `localhost:3306`, create database:
   ```sql
   CREATE DATABASE user_fitness_db;
   ```
4. **MongoDB** — running on `localhost:27017` (default install is fine)
5. **RabbitMQ** — running on `localhost:5672` (management UI at `http://localhost:15672`, guest/guest)
   - [Windows installer](https://www.rabbitmq.com/install-windows.html) or use Docker:
     ```bash
     docker run -d --name rabbitmq -p 5672:5672 -p 15672:15672 rabbitmq:3-management
     ```
6. **Groq API key** — get one at [console.groq.com](https://console.groq.com/keys)

---

## Quick Start

### 1. Set environment variables

```bash
# Set the Groq API key (the AI service needs this)
export GROQ_API_KEY=gsk_your-key-here

# (Optional) Override the app JWT secret for production
export APP_JWT_SECRET=your-32-char-secret-here
```

> On Windows PowerShell: `$env:GROQ_API_KEY = "gsk_..."`

### 2. Start backend services (in order)

Open **6 terminals** (or use a tool like [tmux](https://github.com/tmux/tmux)):

```bash
# Terminal 1 — Eureka (service discovery)
cd eureka && ./mvnw spring-boot:run

# Terminal 2 — Config Server (centralized config)
cd configserver && ./mvnw spring-boot:run

# Terminal 3 — User Service
cd userservice && ./mvnw spring-boot:run

# Terminal 4 — Activity Service
cd activity-status && ./mvnw spring-boot:run

# Terminal 5 — AI Service
cd aiservice && ./mvnw spring-boot:run

# Terminal 6 — Gateway (API Gateway + Auth)
cd gateway && ./mvnw spring-boot:run
```

**Wait ~30 seconds** after each service starts before starting the next (Eureka registration takes a moment).

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** — you'll see the FitTrack login page with a "Sign in with Google" button.

---

## API Endpoints

### Auth (Gateway)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/google` | Exchange Google ID token for app JWT (sets httpOnly cookie) |
| `POST` | `/api/auth/logout` | Clear the app JWT cookie |
| `GET` | `/api/auth/me` | Get current user profile from cookie |

### User Service (`/api/user`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/user/{userId}` | Get user profile |
| `POST` | `/api/user/register` | Register/upsert user (called by gateway internally) |
| `GET` | `/api/user/{userId}/validate` | Check if user exists |

### Activity Service (`/api/activity`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/activity` | Log a new activity |
| `GET` | `/api/activity` | Get all activities for current user |

### AI / Recommendations (`/api/recommendation`)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/recommendation/user/{userId}` | Get all recommendations for a user |
| `GET` | `/api/recommendation/activity/{activityId}` | Get recommendation for a specific activity |

---

## How Auth Works (Token-Exchange Flow)

```
Browser               Gateway                    Google
  │                      │                          │
  │  "Sign in w/ Google" │                          │
  │─────────────────────►│                          │
  │  (Google ID token)   │                          │
  │                      │  Verify ID token via     │
  │                      │  Google's public JWKS    │
  │                      │─────────────────────────►│
  │                      │  ✓ Valid, issuer=Google  │
  │                      │  ✓ Audience = our CID   │
  │                      │◄─────────────────────────│
  │                      │                           │
  │                      │  Upsert user in MySQL     │
  │                      │  Mint APP JWT (HS256)     │
  │◄─────────────────────│                           │
  │  Set-Cookie: app_jwt │                           │
  │  (httpOnly, Secure)  │                           │
  │                      │                           │
  │  GET /api/activity   │                           │
  │─────────────────────►│                           │
  │  Cookie: app_jwt     │  Verify app JWT           │
  │                      │  Inject X-User-ID header  │
  │                      │  Route to ACTIVITY-SVC   │
  │◄─────────────────────│                           │
  │  { activities }      │                           │
```

**Security properties:**
- Google tokens are validated cryptographically (not sent to Google's servers on each request)
- App JWT is stored in an httpOnly cookie — JavaScript cannot access it (XSS-safe)
- Cookie uses `SameSite=Lax` to prevent CSRF
- Microservices are stateless — they trust the gateway-injected `X-User-ID` header
- No password is ever stored in plaintext or exposed in API responses

---

## Environment Variables

| Variable | Used By | Default | Description |
|----------|---------|---------|-------------|
| `GOOGLE_CLIENT_ID` | Gateway | (set in config) | Google OAuth2 Web Client ID |
| `APP_JWT_SECRET` | Gateway | dev-only-... | HS256 secret for app JWT (>= 32 chars) |
| `GROQ_API_KEY` | AI Service | (empty) | Groq API key for AI recommendations |
| `MYSQL_PASSWORD` | User Service | (empty) | MySQL root password |

---

## Project Structure

```
fitness_web_microservices/
├── eureka/                  # Service discovery (:8761)
├── configserver/            # Centralized config (:8888)
│   └── config/              # Per-service YAML configs
├── gateway/                 # API Gateway + Auth (:8080)
│   └── auth/                # Google OAuth2, JWT service, auth filter
├── userservice/             # User profiles (:8081)
├── activity-status/         # Workout tracking (:8082)
├── aiservice/               # AI recommendations (:8083)
├── frontend/                # React + Vite + MUI (:5173)
│   └── src/
│       ├── api/             # Axios client
│       ├── auth/            # Auth context + Google GIS button
│       ├── components/      # Navbar, StatCard
│       ├── pages/           # Login, Dashboard, LogActivity, History, Recommendations
│       └── theme/           # MUI dark gradient theme
├── docker-compose.yml       # One-command deploy (MySQL + Mongo + RabbitMQ + all services)
├── .env.example             # Environment variable template
└── README.md                 # This file
```

---

## Docker Compose (Production-Ready Deploy)

For a full deploy with Docker:

```bash
# Copy and fill in environment variables
cp .env.example .env
# Edit .env with your real values

# Start everything
docker compose up --build -d
```

This starts MySQL, MongoDB, RabbitMQ, all 6 Spring services, and the React frontend.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gateway 401 on every request | Cookie not set — check that `GROQ_API_KEY` is set and services are running |
| User-service won't start | MySQL not running or `user_fitness_db` database doesn't exist |
| Activity-service won't start | MongoDB not running on `localhost:27017` |
| AI recommendations empty | Check `aiservice` logs — Groq API key may be invalid or RabbitMQ not running |
| Frontend CORS errors | Ensure gateway is running on `:8080` and Vite proxy is configured |
| Eureka shows no services | Wait 30s after startup; check each service's logs for registration errors |
#   f i t t r a k  
 #   f i t t r a k  
 