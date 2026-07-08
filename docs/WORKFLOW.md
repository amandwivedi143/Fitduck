# Workflow

## User Workflow

```mermaid
flowchart TD
  Start[Open frontend] --> Auth{Authenticated?}
  Auth -- No --> Login[Login or sign up]
  Login --> Cookie[Gateway sets app_jwt cookie]
  Auth -- Yes --> Dashboard[Dashboard]
  Cookie --> Dashboard
  Dashboard --> Log[Log activity]
  Dashboard --> History[View activity history]
  Dashboard --> Recs[View AI recommendations]
  Dashboard --> Meals[Generate meal plan]
  Dashboard --> Workouts[Generate workout plan]
  Dashboard --> Videos[View videos page]
```

## Activity And Recommendation Workflow

```mermaid
sequenceDiagram
  participant UI as React
  participant Gateway as Gateway
  participant Activity as Activity Service
  participant User as User Service
  participant Rabbit as RabbitMQ
  participant AI as AI Service
  participant Groq as Groq API
  participant Mongo as MongoDB

  UI->>Gateway: POST /api/activity
  Gateway->>Activity: Forward with X-User-ID
  Activity->>User: GET /api/user/{userId}/validate
  User-->>Activity: true or false
  Activity->>Mongo: Save activity
  Activity->>Rabbit: Publish activity JSON
  Rabbit->>AI: Deliver activity.queue message
  AI->>Groq: Generate recommendation
  AI->>Mongo: Save recommendation
  UI->>Gateway: GET /api/recommendation/user/{userId}
  Gateway->>AI: Forward request
  AI->>Mongo: Query recommendations
  AI-->>UI: Recommendation documents
```

## Meal Plan Pipeline

```mermaid
flowchart LR
  Request[POST /api/mealplan] --> SavePending[Save meal_plans document as PENDING]
  SavePending --> Publish[Publish to mealplan.exchange]
  Publish --> Queue[mealplan.queue]
  Queue --> Listener[MealPlanMessageListener]
  Listener --> Groq[Groq prompt]
  Groq --> Update[Update document with dayPlans]
  Update --> Status[COMPLETED or FAILED]
  Status --> Poll[Frontend polls GET /api/mealplan/{id}]
```

## Workout Plan Pipeline

```mermaid
flowchart LR
  Request[POST /api/workoutplan] --> SavePending[Save workout_plans document as PENDING]
  SavePending --> Publish[Publish to workoutplan.exchange]
  Publish --> Queue[workoutplan.queue]
  Queue --> Listener[WorkoutPlanMessageListener]
  Listener --> Groq[Groq prompt]
  Groq --> Update[Update document with workoutDays]
  Update --> Status[COMPLETED or FAILED]
  Status --> Poll[Frontend polls GET /api/workoutplan/{id}]
```

## Developer Workflow

1. Run infrastructure services first: RabbitMQ, Eureka, and Config Server.
2. Start backend services in dependency order.
3. Run the frontend with `npm run dev`.
4. Use the gateway URL for API calls.
5. Run k6 smoke tests against a deployed stack when validating availability.

## AI Processing Pipeline

```mermaid
flowchart TB
  Input[User activity or plan request] --> Persist[Persist source document]
  Persist --> Queue[Publish JSON message]
  Queue --> Worker[Message listener]
  Worker --> Prompt[Build AI prompt from saved data]
  Prompt --> Provider[Groq OpenAI-compatible endpoint]
  Provider --> Parse[Parse generated response]
  Parse --> Store[Store generated result in MongoDB]
  Store --> Read[Frontend reads generated result]
```

## Documentation Workflow

When adding new backend functionality:

1. Add or update the controller/service/model.
2. Update `docs/API_DOCUMENTATION.md`.
3. Update `docs/DATABASE_DESIGN.md` if persistence changes.
4. Update `docs/DOCKER.md` or `docs/KUBERNETES.md` if deployment behavior changes.
5. Update the README feature list only when the implementation exists.
