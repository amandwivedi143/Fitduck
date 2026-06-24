package com.fitness.aihelper.controller;

import com.fitness.aihelper.dto.MealPlanRequest;
import com.fitness.aihelper.model.Meal;
import com.fitness.aihelper.model.MealPlan;
import com.fitness.aihelper.service.MealPlanService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * REST API for AI meal-plan generation and retrieval.
 *
 * Endpoints:
 *   POST /api/mealplan          → kick off async generation, returns PENDING plan
 *   GET  /api/mealplan/{id}     → poll a specific plan (frontend polls until COMPLETED)
 *   GET  /api/mealplan/user/{userId} → all plans for a user (newest first)
 *
 * All endpoints require the {@code X-User-ID} header injected by the gateway
 * auth filter — same pattern as activity-service.
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/mealplan")
public class MealPlanController {

    private final MealPlanService mealPlanService;

    /**
     * Creates a meal-plan generation request and publishes it to RabbitMQ.
     * The returned MealPlan has status PENDING — the frontend should poll
     * GET /api/mealplan/{id} until the status becomes COMPLETED.
     */
    @PostMapping
    public ResponseEntity<MealPlan> generateMealPlan(
            @RequestHeader(value = "X-User-ID", required = false) String userId,
            @RequestBody MealPlanRequest request
    ) {
        // Fill userId from the trusted gateway header if not in the body
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            request.setUserId(userId);
        }
        MealPlan plan = mealPlanService.createMealPlan(request);
        return ResponseEntity.ok(plan);
    }

    /**
     * Fetch a single meal plan by id. The frontend polls this after POST
     * until {@code status == COMPLETED} (or FAILED).
     */
    @GetMapping("/{id}")
    public ResponseEntity<MealPlan> getMealPlan(@PathVariable String id) {
        return mealPlanService.getMealPlan(id)
                .map(ResponseEntity::ok)
                .orElseThrow(() -> new RuntimeException("Meal plan not found: " + id));
    }

    /**
     * List all meal plans for a user, newest first.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MealPlan>> getUserMealPlans(@PathVariable String userId) {
        return ResponseEntity.ok(mealPlanService.getUserMealPlans(userId));
    }

    /**
     * Add a custom meal entry to a specific day of a completed plan.
     * Body: { "mealType": "SNACK", "time": "05:00 PM", "name": "...",
     *         "calories": 200, "protein": 15, "carbs": 20, "fat": 8,
     *         "ingredients": ["a","b"] }
     */
    @PostMapping("/{planId}/day/{dayIndex}/meal")
    public ResponseEntity<MealPlan> addCustomMeal(
            @PathVariable String planId,
            @PathVariable int dayIndex,
            @RequestBody Meal meal
    ) {
        return ResponseEntity.ok(mealPlanService.addCustomMeal(planId, dayIndex, meal));
    }
}
