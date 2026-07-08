# System Design

## Design Goals

- Keep UI concerns isolated in the React frontend.
- Route all browser API calls through one gateway.
- Separate profile, activity, recommendation, meal-plan, and workout-plan responsibilities.
- Use asynchronous messaging for AI work that may take longer than a normal request.
- Support both containerized and Kubernetes deployment paths.

## Component Diagram

```mermaid
flowchart LR
  UI[React UI] --> Auth[Gateway Auth Controller]
  UI --> Routes[Gateway Routes]
  Auth --> UserClient[Gateway UserService WebClient]
  UserClient --> UserService[User Service]
  Routes --> Activity[Activity Service]
  Routes --> Recommend[AI Service]
  Routes --> Planner[AI Helper]
  Activity --> Rabbit[(RabbitMQ)]
  Rabbit --> Recommend
  Planner --> Rabbit
  Rabbit --> Planner
  UserService --> Users[(users table)]
  Activity --> Activities[(activities collection)]
  Recommend --> Recommendations[(recommendations collection)]
  Planner --> Plans[(meal_plans and workout_plans collections)]
```

## Authentication Design

```mermaid
sequenceDiagram
  participant UI as React
  participant GW as Gateway
  participant Google as Google Token Verification
  participant User as User Service

  UI->>GW: POST /api/auth/google { credential }
  GW->>Google: Verify Google ID token
  GW->>User: Upsert user by email
  User-->>GW: UserResponse
  GW->>GW: Mint app JWT
  GW-->>UI: Set-Cookie app_jwt; { user }
```

Email signup and login follow the same gateway-to-user-service pattern without Google token verification.

## Async AI Plan Flow

```mermaid
sequenceDiagram
  participant UI as React
  participant GW as Gateway
  participant Helper as AI Helper
  participant Mongo as MongoDB
  participant Rabbit as RabbitMQ
  participant Groq as Groq API

  UI->>GW: POST /api/mealplan or /api/workoutplan
  GW->>Helper: Forward with X-User-ID
  Helper->>Mongo: Save PENDING plan
  Helper->>Rabbit: Publish plan request JSON
  Helper-->>UI: Return PENDING document
  Rabbit->>Helper: Listener consumes request
  Helper->>Groq: Generate plan
  Helper->>Mongo: Update plan to COMPLETED or FAILED
  UI->>GW: Poll GET /api/.../{id}
  GW->>Helper: Fetch plan
  Helper-->>UI: Current plan status and content
```

## Error Handling

The services include `GlobalExceptionHandler` classes in user, activity, AI, and AI Helper modules. The exact response envelope varies by service and is not standardized by a shared library.

## Scalability Notes

- The gateway can scale horizontally if all instances share the same JWT signing secret.
- RabbitMQ-backed AI jobs allow request creation to return before AI generation completes.
- MongoDB query methods are based on `userId` and `activityId`; explicit indexes should be added before high-volume production use.
- Docker Compose uses single replicas. Kubernetes manifests also specify one replica per service.
