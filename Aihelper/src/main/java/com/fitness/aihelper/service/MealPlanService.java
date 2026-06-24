package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.aihelper.dto.MealPlanRequest;
import com.fitness.aihelper.model.MealPlan;
import com.fitness.aihelper.repository.MealPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Business layer for meal plans.
 *
 * On {@link #createMealPlan} it:
 *   1. Builds a {@link MealPlan} snapshot from the request (status PENDING).
 *   2. Persists it so the frontend immediately has an id to poll.
 *   3. Publishes the persisted JSON to RabbitMQ. The listener picks it up,
 *      generates the days with the AI, and flips the status to COMPLETED.
 *
 * This split (synchronous save + async generation) matches the activity-service →
 * ai-service flow: the API call returns fast, the heavy LLM work happens in the
 * background.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MealPlanService {

    private final MealPlanRepository mealPlanRepository;
    private final RabbitTemplate rabbitTemplate;

    // ObjectMapper configured for java.time — needed because MealPlan carries
    // LocalDateTime (createdAt/updatedAt) which the default mapper can't write.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    @Value("${rabbitmq.exchange.name}")
    private String exchange;
    @Value("${rabbitmq.routing.key}")
    private String routingKey;

    /**
     * Creates a PENDING plan, saves it, and publishes it for async generation.
     */
    public MealPlan createMealPlan(MealPlanRequest request) {
        MealPlan plan = MealPlan.builder()
                .userId(request.getUserId())
                .age(request.getAge())
                .weight(request.getWeight())
                .height(request.getHeight())
                .goal(request.getGoal())
                .dietType(request.getDietType())
                .foodVariety(request.getFoodVariety())
                .days(request.getDays() == null ? 1 : Math.max(1, Math.min(request.getDays(), 7)))
                .suggestion(request.getSuggestion())
                .targetProtein(request.getTargetProtein())
                .targetCarbs(request.getTargetCarbs())
                .targetFat(request.getTargetFat())
                .targetCalories(request.getTargetCalories())
                .dayPlans(List.of())
                .status(MealPlan.STATUS_PENDING)
                .build();

        MealPlan saved = mealPlanRepository.save(plan);

        // Publish the saved plan as a JSON STRING (not the object) so the
        // consumer doesn't depend on our class via __TypeId__. Same rationale as
        // activity-service's RabbitMqConfig.
        try {
            String json = objectMapper.writeValueAsString(saved);
            rabbitTemplate.convertAndSend(exchange, routingKey, json);
            log.info("Published meal plan {} for async generation", saved.getId());
        } catch (Exception e) {
            log.error("Failed to publish meal plan to RabbitMQ: {}", e.getMessage(), e);
            // Don't throw — the plan is already saved; the user can retry generation.
        }
        return saved;
    }

    public Optional<MealPlan> getMealPlan(String id) {
        return mealPlanRepository.findById(id);
    }

    public List<MealPlan> getUserMealPlans(String userId) {
        return mealPlanRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(MealPlan::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    /**
     * Persists the AI-generated days and marks the plan COMPLETED. Called by the
     * RabbitMQ listener after successful generation.
     */
    public MealPlan completeMealPlan(String id, java.util.List<com.fitness.aihelper.model.DayPlan> dayPlans) {
        MealPlan plan = mealPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Meal plan not found: " + id));
        plan.setDayPlans(dayPlans);
        plan.setStatus(MealPlan.STATUS_COMPLETED);
        return mealPlanRepository.save(plan);
    }

    /** Marks a plan as FAILED — used when generation throws in the listener. */
    public void markFailed(String id) {
        mealPlanRepository.findById(id).ifPresent(p -> {
            p.setStatus(MealPlan.STATUS_FAILED);
            mealPlanRepository.save(p);
        });
    }

    /**
     * Adds a custom meal to a specific day in a completed plan.
     */
    public MealPlan addCustomMeal(String planId, int dayIndex, com.fitness.aihelper.model.Meal meal) {
        MealPlan plan = mealPlanRepository.findById(planId)
                .orElseThrow(() -> new RuntimeException("Meal plan not found: " + planId));
        if (plan.getStatus() == null || !plan.getStatus().equals(MealPlan.STATUS_COMPLETED)) {
            throw new IllegalArgumentException("Can only add meals to a COMPLETED plan");
        }
        List<com.fitness.aihelper.model.DayPlan> dayPlans = plan.getDayPlans();
        if (dayPlans == null || dayIndex < 0 || dayIndex >= dayPlans.size()) {
            throw new IllegalArgumentException("Invalid day index: " + dayIndex);
        }
        com.fitness.aihelper.model.DayPlan day = dayPlans.get(dayIndex);
        List<com.fitness.aihelper.model.Meal> meals = new ArrayList<>(day.getMeals());
        meals.add(meal);
        day.setMeals(meals);

        // Recalculate totals for the day
        int totalCal = meals.stream().filter(m -> m.getCalories() != null).mapToInt(com.fitness.aihelper.model.Meal::getCalories).sum();
        double totalProtein = meals.stream().filter(m -> m.getProtein() != null).mapToDouble(com.fitness.aihelper.model.Meal::getProtein).sum();
        double totalCarbs = meals.stream().filter(m -> m.getCarbs() != null).mapToDouble(com.fitness.aihelper.model.Meal::getCarbs).sum();
        double totalFat = meals.stream().filter(m -> m.getFat() != null).mapToDouble(com.fitness.aihelper.model.Meal::getFat).sum();
        day.setTotalCalories(totalCal);
        day.setTotalProtein(Math.round(totalProtein * 10) / 10.0);
        day.setTotalCarbs(Math.round(totalCarbs * 10) / 10.0);
        day.setTotalFat(Math.round(totalFat * 10) / 10.0);

        return mealPlanRepository.save(plan);
    }
}
