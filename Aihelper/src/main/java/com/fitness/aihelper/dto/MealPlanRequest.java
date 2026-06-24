package com.fitness.aihelper.dto;

import lombok.Data;

/**
 * Request payload posted by the frontend to kick off a meal-plan generation.
 *
 * {@code userId} is optional on the body — if missing, it is taken from the
 * {@code X-User-ID} header injected by the gateway auth filter (same pattern as
 * activity-service). This keeps the user identity trusted and tamper-proof.
 */
@Data
public class MealPlanRequest {
    private String userId;

    private Integer age;
    private Double weight;     // kg
    private Double height;     // cm
    private String goal;       // MUSCLE_GAIN | WEIGHT_LOSS | ENDURANCE | MAINTENANCE
    private String dietType;   // HIGH_PROTEIN | KETO | VEGAN | PALEO | BALANCED
    private String foodVariety;// VEGAN | VEGETARIAN | NON_VEGETARIAN | EGGETARIAN
    private Integer days;      // how many days of meals to generate

    /**
     * Free-form raw text from the user — anything they want the AI to consider
     * when building the plan. Could be preferences ("I hate mushrooms", "more
     * Indian dishes", "no cooking on weekends"), allergies, budget notes, or
     * even a sample meal list. Passed verbatim to the prompt.
     */
    private String suggestion;

    // Target macros (all optional — if absent, the AI computes them from weight/goal)
    private Double targetProtein; // grams/day
    private Double targetCarbs;   // grams/day
    private Double targetFat;     // grams/day
    private Integer targetCalories; // kcal/day
}
