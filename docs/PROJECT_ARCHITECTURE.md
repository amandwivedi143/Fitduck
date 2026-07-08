# Project Architecture

FitTrack Microservices is organized around a React SPA, a Spring Cloud Gateway, Spring Boot business services, RabbitMQ, MySQL, MongoDB, Eureka, and a native Spring Cloud Config Server.

## Service Map

| Component | Path | Runtime | Responsibility |
| --- | --- | --- | --- |
| Frontend | `frontend/` | React, Vite, nginx | Browser UI and `/api` proxy in production |
| Gateway | `gateway/` | Spring Cloud Gateway WebFlux | Auth endpoints, JWT cookie, route forwarding, `X-User-ID` injection |
| User Service | `userservice/` | Spring MVC, JPA | User registration, login, lookup, validation |
| Activity Service | `activity-status/` | Spring MVC, MongoDB, RabbitMQ | Activity creation/listing and activity event publishing |
| AI Service | `aiservice/` | Spring MVC, MongoDB, RabbitMQ | Activity recommendation generation and retrieval |
| AI Helper | `Aihelper/` | Spring MVC, MongoDB, RabbitMQ | Meal-plan and workout-plan generation |
| Config Server | `configserver/` | Spring Cloud Config | Native YAML configuration |
| Eureka | `eureka/` | Eureka Server | Service discovery registry |

## Overall Architecture

```mermaid
flowchart TB
  subgraph Client
    Browser[Browser]
    SPA[React SPA]
  end

  subgraph Edge
    Nginx[nginx static server and API proxy]
    Gateway[Spring Cloud Gateway]
  end

  subgraph Platform
    Eureka[Eureka registry]
    Config[Spring Cloud Config Server]
    Rabbit[RabbitMQ]
  end

  subgraph Services
    Users[User Service]
    Activity[Activity Service]
    AI[AI Recommendation Service]
    Helper[AI Helper Service]
  end

  subgraph Data
    MySQL[(MySQL users)]
    Mongo[(MongoDB activity and AI documents)]
  end

  Browser --> SPA
  SPA --> Nginx
  Nginx --> Gateway
  Gateway --> Users
  Gateway --> Activity
  Gateway --> AI
  Gateway --> Helper
  Users --> MySQL
  Activity --> Mongo
  AI --> Mongo
  Helper --> Mongo
  Activity --> Rabbit
  Rabbit --> AI
  Helper --> Rabbit
  Rabbit --> Helper
  Config --> Gateway
  Config --> Users
  Config --> Activity
  Config --> AI
  Config --> Helper
  Eureka --> Gateway
  Eureka --> Users
  Eureka --> Activity
  Eureka --> AI
  Eureka --> Helper
```

## Request Flow

```mermaid
sequenceDiagram
  participant U as User
  participant UI as React SPA
  participant GW as Gateway
  participant S as Downstream Service

  U->>UI: Uses protected app route
  UI->>GW: API request with app_jwt cookie
  GW->>GW: Verify JWT unless path is public
  GW->>S: Forward request with X-User-ID
  S-->>GW: JSON response
  GW-->>UI: JSON response
```

## Important Boundaries

- Browser code never reads the app JWT because it is stored as an httpOnly cookie.
- Downstream services trust the `X-User-ID` header after gateway validation.
- User identity is stored in MySQL; activity and generated AI data are stored in MongoDB.
- RabbitMQ decouples activity tracking from recommendation generation and decouples plan requests from plan completion.

## Configuration Source

Each Spring service imports `optional:configserver:http://${CONFIG_HOST:localhost}:8888`. The checked-in native config files live under `configserver/src/main/resources/config/`.

## Known Architecture Gaps

- No API specification file such as OpenAPI is present.
- No centralized observability stack is present.
- No CI workflow is present in the repository.
- Secrets are hardcoded in current config files and should be externalized before production use.
