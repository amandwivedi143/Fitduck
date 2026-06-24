package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.aihelper.model.WorkoutDay;
import com.fitness.aihelper.model.WorkoutPlan;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * RabbitMQ listener for the workout-plan generation pipeline.
 *
 * Consumes JSON messages from the workout-plan queue, deserializes them into
 * {@link WorkoutPlan}, calls the AI service to populate the workout days,
 * and marks the plan as COMPLETED (or FAILED on error).
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkoutPlanMessageListener {

    private final WorkoutPlanAIService workoutPlanAIService;
    private final WorkoutPlanService workoutPlanService;

    // ObjectMapper with JavaTimeModule so LocalDateTime fields (createdAt /
    // updatedAt) on WorkoutPlan deserialize correctly from the JSON string.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    @RabbitListener(queues = "${rabbitmq.workout.queue.name}")
    public void processWorkoutPlanRequest(String json) {
        try {
            WorkoutPlan plan = objectMapper.readValue(json, WorkoutPlan.class);
            log.info("Received workout plan request for generation: {}", plan.getId());

            List<WorkoutDay> workoutDays = workoutPlanAIService.generateWorkoutDays(plan);

            workoutPlanService.completeWorkoutPlan(plan.getId(), workoutDays);
            log.info("Workout plan {} generation completed with {} days", plan.getId(), workoutDays.size());
        } catch (Exception e) {
            log.error("Failed to process workout-plan message: {}", e.getMessage(), e);
            // Try to mark the plan as FAILED so the user knows something went wrong.
            try {
                WorkoutPlan plan = objectMapper.readValue(json, WorkoutPlan.class);
                workoutPlanService.markFailed(plan.getId());
            } catch (Exception markEx) {
                log.error("Also failed to mark workout plan as FAILED: {}", markEx.getMessage());
            }
        }
    }
}
