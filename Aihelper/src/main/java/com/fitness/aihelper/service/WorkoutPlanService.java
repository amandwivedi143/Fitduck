package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.aihelper.dto.WorkoutPlanRequest;
import com.fitness.aihelper.model.WorkoutDay;
import com.fitness.aihelper.model.WorkoutPlan;
import com.fitness.aihelper.repository.WorkoutPlanRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Optional;

/**
 * Business layer for workout plans.
 *
 * On {@link #createWorkoutPlan} it:
 *   1. Builds a {@link WorkoutPlan} snapshot from the request (status PENDING).
 *   2. Persists it so the frontend immediately has an id to poll.
 *   3. Publishes the persisted JSON to RabbitMQ. The listener picks it up,
 *      generates the workout days with the AI, and flips the status to COMPLETED.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkoutPlanService {

    private final WorkoutPlanRepository workoutPlanRepository;
    private final RabbitTemplate rabbitTemplate;

    // ObjectMapper configured for java.time — needed because WorkoutPlan carries
    // LocalDateTime (createdAt/updatedAt) which the default mapper can't write.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    @Value("${rabbitmq.workout.exchange.name}")
    private String exchange;
    @Value("${rabbitmq.workout.routing.key}")
    private String routingKey;

    /**
     * Creates a PENDING plan, saves it, and publishes it for async generation.
     */
    public WorkoutPlan createWorkoutPlan(WorkoutPlanRequest request) {
        WorkoutPlan plan = WorkoutPlan.builder()
                .userId(request.getUserId())
                .age(request.getAge())
                .weight(request.getWeight())
                .height(request.getHeight())
                .goal(request.getGoal())
                .durationInMinutes(request.getDurationInMinutes())
                .days(request.getDays() == null ? 1 : Math.max(1, Math.min(request.getDays(), 7)))
                .gender(request.getGender())
                .experienceLevel(request.getExperienceLevel())
                .location(request.getLocation())
                .equipment(request.getEquipment())
                .suggestion(request.getSuggestion())
                .workoutDays(List.of())
                .status(WorkoutPlan.STATUS_PENDING)
                .build();

        WorkoutPlan saved = workoutPlanRepository.save(plan);

        try {
            String json = objectMapper.writeValueAsString(saved);
            rabbitTemplate.convertAndSend(exchange, routingKey, json);
            log.info("Published workout plan {} for async generation", saved.getId());
        } catch (Exception e) {
            log.error("Failed to publish workout plan to RabbitMQ: {}", e.getMessage(), e);
        }
        return saved;
    }

    public Optional<WorkoutPlan> getWorkoutPlan(String id) {
        return workoutPlanRepository.findById(id);
    }

    public List<WorkoutPlan> getUserWorkoutPlans(String userId) {
        return workoutPlanRepository.findByUserId(userId).stream()
                .sorted(Comparator.comparing(WorkoutPlan::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .toList();
    }

    /**
     * Persists the AI-generated workout days and marks the plan COMPLETED.
     * Called by the RabbitMQ listener after successful generation.
     */
    public WorkoutPlan completeWorkoutPlan(String id, List<WorkoutDay> workoutDays) {
        WorkoutPlan plan = workoutPlanRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Workout plan not found: " + id));
        plan.setWorkoutDays(workoutDays);
        plan.setStatus(WorkoutPlan.STATUS_COMPLETED);
        return workoutPlanRepository.save(plan);
    }

    /** Marks a plan as FAILED — used when generation throws in the listener. */
    public void markFailed(String id) {
        workoutPlanRepository.findById(id).ifPresent(p -> {
            p.setStatus(WorkoutPlan.STATUS_FAILED);
            workoutPlanRepository.save(p);
        });
    }
}
