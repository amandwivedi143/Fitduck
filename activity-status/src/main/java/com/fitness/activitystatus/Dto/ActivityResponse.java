package com.fitness.activitystatus.Dto;

import com.fitness.activitystatus.Model.ActivityType;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;
@Data
public class ActivityResponse {
    private String id;
    private String userid;
    private ActivityType type;
    private Integer duration;
    private Integer caloriesburned;
    private LocalDate startTime;
    private Map<String , Object> addtionalMetrics;
    private LocalDateTime createdAt;
    private  LocalDateTime updatedAt;
}
