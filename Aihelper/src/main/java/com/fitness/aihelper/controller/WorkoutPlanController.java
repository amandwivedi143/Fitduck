package com.fitness.aihelper.controller;

import com.fitness.aihelper.dto.WorkoutPlanRequest;
import com.fitness.aihelper.model.WorkoutPlan;
import com.fitness.aihelper.service.WorkoutPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/workoutplan")
public class WorkoutPlanController {

    private final WorkoutPlanService workoutPlanService;

    /**
     * Creates a workout-plan generation request and publishes it to RabbitMQ.
     * The returned WorkoutPlan has status PENDING — the frontend should poll
     * GET /api/workoutplan/{id} until the status becomes COMPLETED (or FAILED).
     */
    @PostMapping
    public ResponseEntity<WorkoutPlan> generateWorkoutPlan(
            @RequestHeader(value = "X-User-ID", required = false) String userId,
            @RequestBody WorkoutPlanRequest request
    ) {
        // Fill userId from the trusted gateway header if not in the body
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            request.setUserId(userId);
        }
        WorkoutPlan plan = workoutPlanService.createWorkoutPlan(request);
        return ResponseEntity.ok(plan);
    }

    /**
     * Fetch a single workout plan by id. The frontend polls this after POST
     * until {@code status == COMPLETED} (or FAILED).
     */
    @GetMapping("/{id}")
    public ResponseEntity<WorkoutPlan> getWorkoutPlan(@PathVariable String id) {
        return workoutPlanService.getWorkoutPlan(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new RuntimeException("Workout plan not found: " + id));
    }

    /**
     * List all workout plans for a user, newest first.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<WorkoutPlan>> getUserWorkoutPlans(@PathVariable String userId) {
        return ResponseEntity.ok(workoutPlanService.getUserWorkoutPlans(userId));
    }
}
