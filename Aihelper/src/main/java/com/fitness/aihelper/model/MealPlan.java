package com.fitness.aihelper.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A persisted AI-generated meal plan.
 *
 * Lifecycle:
 *   1. The frontend POSTs a {@code MealPlanRequest} to the gateway.
 *   2. The gateway route hits {@code activity-service}? No — it hits this service's
 *      controller, which saves a {@code PENDING} plan and publishes the request
 *      to RabbitMQ.
 *   3. The RabbitMQ listener calls the AI service, fills in {@code days} with
 *      generated meals, and flips the status to {@code COMPLETED}.
 *   4. The frontend polls / fetches the plan by id (or lists by user) and renders
 *      it once {@code status == COMPLETED}.
 *
 * We snapshot the request fields (age, weight, goal, ...) onto the document so a
 * plan is self-describing even if the user later changes their profile.
 */
@Document(collection = "meal_plans")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MealPlan {

    /** Status of async generation. */
    public static final String STATUS_PENDING = "PENDING";
    public static final String STATUS_COMPLETED = "COMPLETED";
    public static final String STATUS_FAILED = "FAILED";

    @Id
    private String id;
    private String userId;

    // --- Request snapshot ---
    private Integer age;
    private Double weight;
    private Double height;
    /** MUSCLE_GAIN, WEIGHT_LOSS, ENDURANCE, MAINTENANCE */
    private String goal;
    /** HIGH_PROTEIN, KETO, VEGAN, PALEO, BALANCED ... */
    private String dietType;
    /** VEGAN, VEGETARIAN, NON_VEGETARIAN, EGGETARIAN */
    private String foodVariety;
    /** Number of days the plan covers (1-7). */
    private Integer days;

    /**
     * Free-form user suggestions/preferences (raw text). Snapshot here so the
     * prompt the AI worker builds is self-contained — see MealPlanRequest.
     */
    private String suggestion;

    // --- Target macros (grams) ---
    private Double targetProtein;
    private Double targetCarbs;
    private Double targetFat;
    private Integer targetCalories;

    // --- Generated content ---
    /** One entry per requested day. Empty until the AI worker runs. */
    private List<DayPlan> dayPlans;
    private String status;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private LocalDateTime updatedAt;
}
