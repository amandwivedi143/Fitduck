package com.fitness.aihelper.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * A single exercise entry within a workout day.
 *
 * Carries the full prescription (sets, reps, rest, RPE, estimated calories)
 * so the UI can render a detailed exercise card and the user can follow the
 * plan at the gym.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Exercise {
    /** Human-readable exercise name, e.g. "Barbell Bench Press" */
    private String exerciseName;
    /** Target muscle group, e.g. "Chest", "Back", "Quads" */
    private String muscleGroup;
    /** Number of sets (as String to support ranges like "3-4") */
    private String sets;
    /** Reps per set (as String to support ranges like "8-12") */
    private String reps;
    /** Rest between sets in seconds */
    private Integer restSeconds;
    /** Estimated calories burned for this exercise */
    private Integer estimatedCalories;
    /** Rate of Perceived Exertion (1-10 scale, as String to support "7-8") */
    private String rpe;
    /** Additional notes or form cues */
    private String notes;
}
