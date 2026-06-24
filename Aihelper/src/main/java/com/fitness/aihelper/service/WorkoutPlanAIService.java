package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.aihelper.model.Exercise;
import com.fitness.aihelper.model.WorkoutDay;
import com.fitness.aihelper.model.WorkoutPlan;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Orchestrates workout-plan generation with the Groq LLM.
 *
 * Flow per request:
 *   1. Build a strict-JSON prompt from the user's profile + goals.
 *   2. Call {@link GroqService}.
 *   3. Extract {@code choices[0].message.content}, strip Markdown fences.
 *   4. Parse the inner JSON into {@link WorkoutDay}/{@link Exercise} objects.
 *   5. On ANY parse failure, build a sensible fallback plan so the user is
 *      never left with an empty screen.
 *
 * The prompt explicitly asks the model to honor the target duration, equipment,
 * location, and experience level, and to produce exactly {@code days} day-objects.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class WorkoutPlanAIService {

    private final GroqService groqService;
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Generates a full workout plan (multiple days). Uses the request snapshot
     * stored on {@link WorkoutPlan} so we don't depend on a separate DTO crossing
     * the RabbitMQ boundary.
     */
    public List<WorkoutDay> generateWorkoutDays(WorkoutPlan plan) {
        String prompt = createPrompt(plan);
        String aiResponse;
        try {
            aiResponse = groqService.getAnswer(prompt);
        } catch (Exception e) {
            log.error("Groq API call failed for workout plan {}: {}", plan.getId(), e.getMessage());
            return fallbackWorkoutDays(plan.getDays());
        }
        log.info("GROQ workout-plan response received for plan {}", plan.getId());
        return parseWorkoutDays(aiResponse, plan.getDays());
    }

    /**
     * Builds the prompt sent to Groq. Uses a Java text block with explicit
     * JSON-schema instructions and %s placeholders.
     *
     * IMPORTANT: every %s / %d in the text block MUST have a matching argument in
     * the String.format varargs below, in the SAME order.
     */
    private String createPrompt(WorkoutPlan plan) {
        String equipmentList = (plan.getEquipment() != null && !plan.getEquipment().isEmpty())
                ? String.join(", ", plan.getEquipment())
                : "No specific equipment — use whatever is available at the chosen location.";

        String suggestionText = (plan.getSuggestion() != null && !plan.getSuggestion().isBlank())
                ? plan.getSuggestion().trim()
                : "No additional suggestions provided.";

        return String.format("""
                You are an expert personal trainer AI. Generate a personalized workout plan and return it as
                STRICT JSON only — no commentary, no markdown, no text outside the JSON.

                The JSON MUST follow this EXACT schema:
                {
                  "days": [
                    {
                      "dayNumber": 1,
                      "dayTitle": "Push Day — Chest, Shoulders & Triceps",
                      "exercises": [
                        {
                          "exerciseName": "Barbell Bench Press",
                          "muscleGroup": "Chest",
                          "sets": "4",
                          "reps": "8-10",
                          "restSeconds": 90,
                          "estimatedCalories": 45,
                          "rpe": "7-8",
                          "notes": "Keep feet flat on the floor, retract scapulae"
                        }
                      ],
                      "totalSets": 16,
                      "totalDurationMinutes": 55,
                      "estimatedCalories": 320
                    }
                  ]
                }

                Rules:
                - Produce EXACTLY %d day objects in the "days" array.
                - Each day should focus on a different muscle group or movement pattern (e.g., Push, Pull, Legs, Upper, Lower, Full Body).
                - Each day MUST have a descriptive dayTitle.
                - Each day MUST contain 5-8 exercises.
                - exerciseName must be a real, recognized exercise name.
                - muscleGroup must be one of: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core, Abs, Forearms, Traps, Full Body.
                - sets and reps are strings to support ranges like "3-4" or "8-12".
                - restSeconds is an integer (typical values: 30-180).
                - estimatedCalories is an integer per exercise.
                - rpe is a string on a 1-10 scale, e.g. "7" or "7-8".
                - notes is optional form cues or tips (can be empty string).
                - totalSets, totalDurationMinutes, and estimatedCalories must be accurate aggregates of the exercises.

                DAY-TO-DAY DIVERSITY:
                - Vary muscle group focus each day. Do NOT repeat the same split every day.
                - Use different exercises across days — maximum variety.
                - Adjust volume and intensity based on the experience level.

                User profile:
                Age: %s
                Weight: %s kg
                Height: %s cm
                Gender: %s
                Experience level: %s
                Workout location: %s

                Goal: %s
                Equipment available: %s
                Target session duration: %s minutes

                User suggestions / preferences (honor these as much as possible):
                %s

                Return ONLY the JSON object now.
                """,
                plan.getDays(),
                plan.getAge() != null ? plan.getAge() : "not specified",
                plan.getWeight() != null ? plan.getWeight() : "not specified",
                plan.getHeight() != null ? plan.getHeight() : "not specified",
                plan.getGender() != null ? plan.getGender() : "not specified",
                plan.getExperienceLevel() != null ? plan.getExperienceLevel() : "INTERMEDIATE",
                plan.getLocation() != null ? plan.getLocation() : "COMMERCIAL_GYM",
                plan.getGoal() != null ? plan.getGoal() : "GENERAL_FITNESS",
                equipmentList,
                plan.getDurationInMinutes() != null ? plan.getDurationInMinutes() : "60",
                suggestionText
        );
    }

    /**
     * Parses the Groq envelope → choices[0].message.content → the inner
     * workout-plan JSON. Defensive: any error yields a fallback plan.
     */
    private List<WorkoutDay> parseWorkoutDays(String aiResponse, int requestedDays) {
        try {
            JsonNode root = mapper.readTree(aiResponse);
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Strip ```json ... ``` fences if the model wrapped the JSON.
            String json = content
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```", "")
                    .trim();

            log.info("Parsed workout-plan JSON (first 300 chars): {}",
                    json.length() > 300 ? json.substring(0, 300) + "..." : json);

            // Attempt to repair truncated JSON
            json = repairTruncatedJson(json);

            JsonNode daysNode = mapper.readTree(json).path("days");
            List<WorkoutDay> workoutDays = new ArrayList<>();
            if (daysNode.isArray()) {
                for (JsonNode dayNode : daysNode) {
                    WorkoutDay day = parseDay(dayNode);
                    if (day != null) workoutDays.add(day);
                }
            }

            if (workoutDays.isEmpty()) {
                log.warn("AI returned no usable workout days — falling back");
                return fallbackWorkoutDays(requestedDays);
            }

            return workoutDays;
        } catch (Exception e) {
            log.error("Failed to parse AI workout-plan response: {}", e.getMessage(), e);
            return fallbackWorkoutDays(requestedDays);
        }
    }

    private WorkoutDay parseDay(JsonNode dayNode) {
        try {
            int dayNumber = dayNode.path("dayNumber").asInt(1);
            String dayTitle = dayNode.path("dayTitle").asText("Workout Day " + dayNumber);

            List<Exercise> exercises = new ArrayList<>();
            JsonNode exercisesNode = dayNode.path("exercises");
            if (exercisesNode.isArray()) {
                for (JsonNode exNode : exercisesNode) {
                    Exercise exercise = parseExercise(exNode);
                    if (exercise != null) exercises.add(exercise);
                }
            }
            if (exercises.isEmpty()) return null;

            int totalSets = exercises.stream()
                    .filter(e -> e.getSets() != null)
                    .mapToInt(e -> parseSetCount(e.getSets()))
                    .sum();

            int totalDuration = exercises.stream()
                    .filter(e -> e.getRestSeconds() != null && e.getSets() != null)
                    .mapToInt(e -> parseSetCount(e.getSets()) * e.getRestSeconds())
                    .sum() / 60; // rough total rest in minutes

            int estimatedCalories = exercises.stream()
                    .filter(e -> e.getEstimatedCalories() != null)
                    .mapToInt(Exercise::getEstimatedCalories)
                    .sum();

            return WorkoutDay.builder()
                    .dayNumber(dayNumber)
                    .dayTitle(dayTitle)
                    .exercises(exercises)
                    .totalSets(totalSets)
                    .totalDurationMinutes(totalDuration)
                    .estimatedCalories(estimatedCalories)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse a workout day node: {}", e.getMessage());
            return null;
        }
    }

    private Exercise parseExercise(JsonNode exNode) {
        try {
            return Exercise.builder()
                    .exerciseName(exNode.path("exerciseName").asText("Exercise"))
                    .muscleGroup(exNode.path("muscleGroup").asText("General"))
                    .sets(exNode.path("sets").asText("3"))
                    .reps(exNode.path("reps").asText("10"))
                    .restSeconds(exNode.path("restSeconds").asInt(60))
                    .estimatedCalories(exNode.path("estimatedCalories").asInt(30))
                    .rpe(exNode.path("rpe").asText("7"))
                    .notes(exNode.path("notes").asText(""))
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse an exercise node: {}", e.getMessage());
            return null;
        }
    }

    /** Parses "3-4" → 3 (takes the lower bound for conservative set count). */
    private int parseSetCount(String sets) {
        if (sets == null || sets.isBlank()) return 0;
        try {
            String trimmed = sets.trim();
            if (trimmed.contains("-")) {
                return Integer.parseInt(trimmed.split("-")[0].trim());
            }
            return Integer.parseInt(trimmed);
        } catch (NumberFormatException e) {
            return 0;
        }
    }

    /**
     * Attempts to repair a JSON string that was truncated mid-stream.
     * Counts unclosed brackets/braces and appends the necessary closing characters.
     */
    private String repairTruncatedJson(String json) {
        if (json == null || json.isBlank()) return json;

        boolean inString = false;
        boolean escape = false;
        int braces = 0;
        int brackets = 0;

        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escape) { escape = false; continue; }
            if (c == '\\') { escape = true; continue; }
            if (c == '"' && !escape) { inString = !inString; continue; }
            if (inString) continue;
            if (c == '{') braces++;
            else if (c == '}') braces--;
            else if (c == '[') brackets++;
            else if (c == ']') brackets--;
        }

        if (braces == 0 && brackets == 0) return json;

        String repaired = json.stripTrailing();
        if (repaired.endsWith(",")) {
            repaired = repaired.substring(0, repaired.length() - 1);
        }

        StringBuilder sb = new StringBuilder(repaired);
        for (int i = 0; i < brackets; i++) sb.append(']');
        for (int i = 0; i < braces; i++) sb.append('}');

        log.warn("Repaired truncated workout JSON: appended {} ] and {} }", brackets, braces);
        return sb.toString();
    }

    /**
     * Sensible fallback plan used when the AI response can't be parsed.
     * Provides a balanced Push/Pull/Legs split for up to 7 days.
     */
    private List<WorkoutDay> fallbackWorkoutDays(int requestedDays) {
        String[][][] fallbackData = {
            { // Day 1 — Push
                {"Barbell Bench Press", "Chest", "4", "8-10", "90", "45", "7-8", "Keep feet flat, retract scapulae"},
                {"Incline Dumbbell Press", "Chest", "3", "10-12", "60", "35", "7", "Control the negative"},
                {"Overhead Press", "Shoulders", "4", "8-10", "90", "40", "7-8", "Brace core for stability"},
                {"Lateral Raises", "Shoulders", "3", "12-15", "45", "20", "6-7", "Slight forward lean"},
                {"Tricep Dips", "Triceps", "3", "10-12", "60", "30", "7", "Lean slightly forward"},
                {"Tricep Rope Pushdown", "Triceps", "3", "12-15", "45", "20", "6-7", "Full range of motion"},
            },
            { // Day 2 — Pull
                {"Deadlift", "Back", "4", "5", "120", "55", "8-9", "Flat back, drive through heels"},
                {"Pull-Ups", "Back", "4", "8-10", "90", "40", "7-8", "Full dead hang at bottom"},
                {"Barbell Row", "Back", "4", "8-10", "90", "40", "7-8", "Squeeze shoulder blades"},
                {"Face Pulls", "Shoulders", "3", "15-20", "45", "15", "6", "Pull towards nose"},
                {"Barbell Curl", "Biceps", "3", "10-12", "60", "25", "7", "No swinging"},
                {"Hammer Curls", "Biceps", "3", "10-12", "45", "20", "6-7", "Neutral grip"},
            },
            { // Day 3 — Legs
                {"Barbell Squat", "Quads", "4", "6-8", "120", "50", "8-9", "Depth below parallel"},
                {"Romanian Deadlift", "Hamstrings", "4", "8-10", "90", "40", "7-8", "Stretch at bottom"},
                {"Leg Press", "Quads", "3", "10-12", "60", "35", "7", "Don't lock knees"},
                {"Leg Curl", "Hamstrings", "3", "10-12", "45", "25", "6-7", "Control the tempo"},
                {"Calf Raises", "Calves", "4", "12-15", "45", "15", "6-7", "Full stretch at bottom"},
                {"Plank", "Core", "3", "45-60 sec", "45", "15", "6", "Straight line head to heels"},
            },
            { // Day 4 — Upper Body
                {"Dumbbell Bench Press", "Chest", "4", "8-10", "75", "40", "7", "Deep stretch at bottom"},
                {"Cable Row", "Back", "4", "10-12", "60", "35", "7", "Squeeze at contraction"},
                {"Arnold Press", "Shoulders", "3", "10-12", "60", "30", "7", "Rotate at bottom"},
                {"Chest Flyes", "Chest", "3", "12-15", "60", "25", "6-7", "Constant tension"},
                {"EZ Bar Curl", "Biceps", "3", "10-12", "60", "25", "7", "Control eccentric"},
                {"Overhead Tricep Extension", "Triceps", "3", "10-12", "60", "20", "6-7", "Keep elbows still"},
            },
            { // Day 5 — Lower Body
                {"Front Squat", "Quads", "4", "6-8", "120", "45", "8", "Elbows up, chest proud"},
                {"Bulgarian Split Squat", "Quads", "3", "10-12", "60", "35", "7", "Knee over toe"},
                {"Hip Thrust", "Glutes", "4", "10-12", "75", "35", "7-8", "Full lockout at top"},
                {"Leg Extension", "Quads", "3", "12-15", "45", "20", "6-7", "Squeeze at top"},
                {"Seated Calf Raise", "Calves", "4", "15-20", "45", "15", "6-7", "Pause at bottom"},
                {"Hanging Leg Raise", "Abs", "3", "12-15", "60", "20", "6-7", "Control the swing"},
            },
            { // Day 6 — Full Body
                {"Clean and Press", "Full Body", "4", "5", "120", "50", "8-9", "Explosive pull"},
                {"Weighted Pull-Up", "Back", "3", "6-8", "90", "40", "8", "Strict form"},
                {"Walking Lunges", "Quads", "3", "12 each", "75", "35", "7", "Long strides"},
                {"Dumbbell Row", "Back", "3", "10-12", "60", "30", "7", "Heavy as possible"},
                {"Push-Ups", "Chest", "3", "15-20", "45", "20", "6-7", "Body straight"},
                {"Russian Twist", "Core", "3", "20 each", "45", "15", "6", "Slow controlled rotation"},
            },
            { // Day 7 — Active Recovery / Mobility
                {"Bodyweight Squat", "Quads", "3", "15", "30", "10", "4", "Slow and controlled"},
                {"Inchworms", "Full Body", "3", "10", "45", "15", "4-5", "Walk hands out slowly"},
                {"World's Greatest Stretch", "Full Body", "3", "5 each", "45", "10", "4", "Hold each position"},
                {"Foam Rolling", "Full Body", "1", "5 min", "0", "10", "3", "All major muscle groups"},
                {"Light Jogging / Walk", "Full Body", "1", "15 min", "0", "80", "3-4", "Easy pace"},
            },
        };

        String[] dayTitles = {
            "Push Day — Chest, Shoulders & Triceps",
            "Pull Day — Back & Biceps",
            "Leg Day — Quads, Hamstrings & Calves",
            "Upper Body — Chest, Back, Shoulders & Arms",
            "Lower Body — Quads, Glutes & Core",
            "Full Body — Compound Movements",
            "Active Recovery & Mobility"
        };

        List<WorkoutDay> days = new ArrayList<>();
        for (int d = 0; d < Math.min(requestedDays, fallbackData.length); d++) {
            String[][] exData = fallbackData[d];
            List<Exercise> exercises = new ArrayList<>();
            int totalSets = 0;
            int totalDuration = 0;
            int estimatedCalories = 0;

            for (String[] e : exData) {
                int sets = parseSetCount(e[2]);
                int restSec = Integer.parseInt(e[4]);
                int calories = Integer.parseInt(e[5]);
                totalSets += sets;
                totalDuration += sets * restSec;
                estimatedCalories += calories;

                exercises.add(Exercise.builder()
                        .exerciseName(e[0])
                        .muscleGroup(e[1])
                        .sets(e[2])
                        .reps(e[3])
                        .restSeconds(restSec)
                        .estimatedCalories(calories)
                        .rpe(e[6])
                        .notes(e[7])
                        .build());
            }

            days.add(WorkoutDay.builder()
                    .dayNumber(d + 1)
                    .dayTitle(dayTitles[d])
                    .exercises(exercises)
                    .totalSets(totalSets)
                    .totalDurationMinutes(totalDuration / 60)
                    .estimatedCalories(estimatedCalories)
                    .build());
        }
        return days;
    }
}
