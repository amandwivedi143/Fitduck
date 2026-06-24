package com.fitness.aihelper.dto;

import lombok.Data;

import java.util.List;

/**
 * Incoming request body for workout plan generation.
 */
@Data
public class WorkoutPlanRequest {
    private String userId;

    private Integer age;
    private Double weight;            // kg
    private Double height;           // cm
    private String goal;              // MUSCLE_GAIN | WEIGHT_LOSS | ENDURANCE | MAINTENANCE | GENERAL_FITNESS
    private Integer days;             // how many workout days to generate (1-7)
    private Integer durationInMinutes; // desired session length
    private String gender;            // MALE | FEMALE | OTHER
    private String experienceLevel;   // BEGINNER | INTERMEDIATE | ADVANCED
    private String location;          // COMMERCIAL_GYM | HOME_GYM | BODYWEIGHT | OUTDOOR
    private List<String> equipment;   // selected equipment names
    /**
     * Free-form raw text from the user — anything they want the AI to consider
     * when building the plan. Could be preferences ("I hate burpees", "focus on
     * upper body", "no deadlifts"), injuries, or a sample routine.
     * Passed verbatim to the prompt.
     */
    private String suggestion;
}
