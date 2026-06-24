package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.aihelper.model.MealPlan;
import com.fitness.aihelper.model.DayPlan;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Consumes meal-plan generation requests from RabbitMQ.
 *
 * Pipeline (mirrors the activity-service → ai-service pattern):
 *   1. Receive the payload as a plain {@code String} (raw JSON).
 *   2. Deserialize into our own {@link MealPlan} (decoupled from the producer's
 *      class — no __TypeId__ / trusted-packages coupling).
 *   3. Call the AI service to generate the day plans.
 *   4. Persist the generated content and flip status to COMPLETED.
 *   5. On any failure, mark the plan as FAILED so the frontend can show an error.
 *
 * The whole handler is wrapped in try/catch so a poison message logs an error
 * instead of crashing the listener or creating an infinite retry loop.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MealPlanMessageListener {

    private final MealPlanAIService aiService;
    private final MealPlanService mealPlanService;

    // ObjectMapper with JavaTimeModule so LocalDateTime fields (createdAt /
    // updatedAt) on MealPlan deserialize correctly from the JSON string.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    @RabbitListener(queues = "${rabbitmq.queue.name}")
    public void processMealPlanRequest(String json) {
        try {
            MealPlan plan = objectMapper.readValue(json, MealPlan.class);
            log.info("Received meal plan request for generation: {}", plan.getId());

            List<DayPlan> dayPlans = aiService.generateDayPlans(plan);

            mealPlanService.completeMealPlan(plan.getId(), dayPlans);
            log.info("Meal plan {} generation completed with {} days", plan.getId(), dayPlans.size());
        } catch (Exception e) {
            log.error("Failed to process meal-plan message: {}", e.getMessage(), e);
            // Try to mark the plan as FAILED so the user knows something went wrong.
            try {
                MealPlan plan = objectMapper.readValue(json, MealPlan.class);
                mealPlanService.markFailed(plan.getId());
            } catch (Exception markEx) {
                log.error("Also failed to mark meal plan as FAILED: {}", markEx.getMessage());
            }
        }
    }
}
