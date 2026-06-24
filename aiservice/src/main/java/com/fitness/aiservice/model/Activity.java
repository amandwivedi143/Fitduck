package com.fitness.aiservice.model;


import com.fasterxml.jackson.annotation.JsonAlias;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

/**
 * Activity payload consumed from RabbitMQ (published by activity-service).
 *
 * IMPORTANT: field names must line up with what activity-service serializes.
 * activity-service uses Jackson default naming (camelCase: caloriesBurned,
 * additionalMetrics), so we match those here. @JsonAlias covers any legacy /
 * differently-cased keys for robustness.
 */
@Data
public class Activity {

    private String id;
    private String userId;
    private Integer duration;
    private String type;

    @JsonAlias({"caloriesBurned", "caloriesburned"})
    private Integer caloriesburned;

    private LocalDateTime startTime;

    @JsonAlias({"additionalMetrics", "addtionalMetrics", "addtionalMetrices"})
    private Map<String, Object> addtionalMetrics;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
