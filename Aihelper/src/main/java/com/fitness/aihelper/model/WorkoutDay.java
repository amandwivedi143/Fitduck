package com.fitness.aihelper.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * All exercises planned for a single workout day, plus the day's totals.
 *
 * The totals are aggregated by the AI service so the frontend doesn't have to
 * re-sum every exercise on render.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WorkoutDay {
    /** 1-based day index within the plan, e.g. 1, 2, 3 ... */
    private Integer dayNumber;
    /** Title for the day, e.g. "Push Day - Chest & Shoulders" */
    private String dayTitle;
    /** List of exercises for this day */
    private List<Exercise> exercises;
    /** Total sets across all exercises */
    private Integer totalSets;
    /** Total estimated duration in minutes */
    private Integer totalDurationMinutes;
    /** Total estimated calories burned */
    private Integer estimatedCalories;
}
