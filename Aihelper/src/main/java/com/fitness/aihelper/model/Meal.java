package com.fitness.aihelper.model;

import lombok.Data;
import lombok.Builder;
import lombok.AllArgsConstructor;
import lombok.NoArgsConstructor;

/**
 * A single meal entry within a day.
 *
 * Holds the macro breakdown plus the ingredient list so the UI can render
 * a detailed card and the user can recreate the meal.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Meal {
    /** BREAKFAST, LUNCH, DINNER, SNACK */
    private String mealType;
    /** Suggested clock time, e.g. "08:00 AM" */
    private String time;
    /** Human-readable meal name, e.g. "Oatmeal with Blueberries" */
    private String name;
    private Integer calories;
    private Double protein;
    private Double carbs;
    private Double fat;
    /** Key ingredients, e.g. ["Steel-cut oats", "Blueberries", "Almonds"] */
    private java.util.List<String> ingredients;
}
