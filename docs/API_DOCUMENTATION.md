# API Documentation

All browser traffic is intended to go through the gateway at `/api`. Protected endpoints require a valid `app_jwt` httpOnly cookie. The gateway verifies the cookie and injects `X-User-ID` for downstream services.

## Authentication

### Register

`POST /api/auth/register`

Request:

```json
{
  "email": "user@example.com",
  "password": "secret123",
  "firstName": "Ada",
  "lastName": "Lovelace"
}
```

Response:

```json
{
  "user": {
    "userId": "uuid",
    "email": "user@example.com",
    "firstName": "Ada",
    "lastName": "Lovelace",
    "pictureUrl": null
  }
}
```

Side effect: sets the configured httpOnly session cookie.

### Login

`POST /api/auth/login`

Request:

```json
{
  "email": "user@example.com",
  "password": "secret123"
}
```

Response shape matches register.

### Google Login

`POST /api/auth/google`

Request:

```json
{
  "credential": "google-id-token"
}
```

The gateway verifies the Google ID token, upserts the user through user-service, mints an app JWT, and sets it as an httpOnly cookie.

### Current User

`GET /api/auth/me`

Auth: valid `app_jwt` cookie.

Response:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "pictureUrl": null
}
```

### Logout

`POST /api/auth/logout`

Clears the app JWT cookie and returns `204 No Content`.

## User Service

### Get User Profile

`GET /api/user/{userId}`

Response:

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "keyClockId": "local:user@example.com",
  "firstName": "Ada",
  "lastName": "Lovelace",
  "createdAt": "2026-01-01T10:00:00",
  "updatedAt": "2026-01-01T10:00:00"
}
```

### Validate User

`GET /api/user/{userId}/validate`

Response:

```json
true
```

This endpoint is called by activity-service through `UserValidationService`.

## Activity Service

### Create Activity

`POST /api/activity`

Auth: protected through gateway. The gateway-provided `X-User-ID` is used when `userId` is omitted from the body.

Request:

```json
{
  "type": "RUNNING",
  "startTime": "2026-01-01T07:30:00",
  "duration": 45,
  "caloriesBurned": 420,
  "additionalMetrics": {
    "heartRate": 138,
    "distanceKm": 6.4
  }
}
```

Response:

```json
{
  "id": "mongo-id",
  "userId": "uuid",
  "type": "RUNNING",
  "duration": 45,
  "caloriesBurned": 420,
  "startTime": "2026-01-01T07:30:00",
  "additionalMetrics": {
    "heartRate": 138,
    "distanceKm": 6.4
  },
  "createdAt": "2026-01-01T07:30:10",
  "updatedAt": "2026-01-01T07:30:10"
}
```

Side effect: publishes the saved activity as a JSON string to RabbitMQ exchange `fitness.exchange` with routing key `activity.tracking`.

### List Activities

`GET /api/activity`

Auth: protected through gateway.

Response: array of `ActivityResponse` objects for `X-User-ID`.

## AI Recommendation Service

### List User Recommendations

`GET /api/recommendation/user/{userId}`

Response:

```json
[
  {
    "id": "mongo-id",
    "activityId": "activity-id",
    "userId": "uuid",
    "activityType": "RUNNING",
    "recommendation": "Recommendation text",
    "improvements": ["Improve pacing"],
    "suggestions": ["Add mobility work"],
    "safety": ["Warm up before intense sessions"],
    "createdSt": "2026-01-01T08:00:00"
  }
]
```

### Get Activity Recommendation

`GET /api/recommendation/activity/{activityId}`

Response: one `Recommendation` document.

## AI Helper Service: Meal Plans

### Create Meal Plan

`POST /api/mealplan`

Auth: protected through gateway. The gateway-provided `X-User-ID` is used when `userId` is omitted from the body.

Request:

```json
{
  "age": 28,
  "weight": 72.5,
  "height": 178,
  "goal": "MUSCLE_GAIN",
  "dietType": "HIGH_PROTEIN",
  "foodVariety": "VEGETARIAN",
  "days": 7,
  "suggestion": "Prefer Indian meals and no mushrooms",
  "targetProtein": 150,
  "targetCarbs": 240,
  "targetFat": 70,
  "targetCalories": 2200
}
```

Response: a `MealPlan` with `status: "PENDING"` initially.

### Get Meal Plan

`GET /api/mealplan/{id}`

Response: one `MealPlan`. The frontend polls this endpoint until `status` is `COMPLETED` or `FAILED`.

### List User Meal Plans

`GET /api/mealplan/user/{userId}`

Response: array of `MealPlan` documents.

### Add Custom Meal

`POST /api/mealplan/{planId}/day/{dayIndex}/meal`

Request:

```json
{
  "mealType": "SNACK",
  "time": "05:00 PM",
  "name": "Greek yogurt bowl",
  "calories": 220,
  "protein": 18,
  "carbs": 22,
  "fat": 6,
  "ingredients": ["Greek yogurt", "Berries", "Honey"]
}
```

Response: updated `MealPlan`.

## AI Helper Service: Workout Plans

### Create Workout Plan

`POST /api/workoutplan`

Auth: protected through gateway.

Request:

```json
{
  "age": 28,
  "weight": 72.5,
  "height": 178,
  "goal": "MUSCLE_GAIN",
  "days": 5,
  "durationInMinutes": 60,
  "gender": "MALE",
  "experienceLevel": "INTERMEDIATE",
  "location": "COMMERCIAL_GYM",
  "equipment": ["Barbell", "Dumbbells", "Cable Machine"],
  "suggestion": "Focus on upper body strength"
}
```

Response: a `WorkoutPlan` with `status: "PENDING"` initially.

### Get Workout Plan

`GET /api/workoutplan/{id}`

Response: one `WorkoutPlan`.

### List User Workout Plans

`GET /api/workoutplan/user/{userId}`

Response: array of `WorkoutPlan` documents.

## Error Responses

The code uses `ResponseStatusException`, runtime exceptions, and per-service `GlobalExceptionHandler` classes. Known status behavior from code:

| Condition | Expected status |
| --- | --- |
| Missing/invalid app JWT on protected gateway path | `401 Unauthorized` |
| Invalid Google token | `401 Unauthorized` |
| Invalid email/password in user service | `401 Unauthorized` |
| `/api/auth/me` without cookie | `401 Unauthorized` |
| Missing user profile from `/api/auth/me` | `404 Not Found` |

The exact JSON error body is not standardized across services in the repository.
