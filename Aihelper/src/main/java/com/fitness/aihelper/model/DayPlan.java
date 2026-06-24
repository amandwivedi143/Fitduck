package com.fitness.aihelper.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * All meals planned for a single day, plus the day's macro totals.
 *
 * The totals are aggregated by the AI service so the frontend doesn't have to
 * re-sum every meal on render.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DayPlan {
    /** 1-based day index within the plan, e.g. 1, 2, 3 ... */
    private Integer dayNumber;
    private java.util.List<Meal> meals;
    private Integer totalCalories;
    private Double totalProtein;
    private Double totalCarbs;
    private Double totalFat;
}
