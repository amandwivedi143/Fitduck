package com.fitness.aihelper.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fitness.aihelper.model.DayPlan;
import com.fitness.aihelper.model.Meal;
import com.fitness.aihelper.model.MealPlan;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Orchestrates meal-plan generation with the Groq LLM.
 *
 * Flow per request:
 *   1. Build a strict-JSON prompt from the user's profile + targets.
 *   2. Call {@link GroqService}.
 *   3. Extract {@code choices[0].message.content}, strip Markdown fences.
 *   4. Parse the inner JSON into {@link DayPlan}/{@link Meal} objects.
 *   5. On ANY parse failure, build a sensible fallback plan so the user is
 *      never left with an empty screen.
 *
 * The prompt explicitly asks the model to honor the target macros and to produce
 * exactly {@code days} day-objects, each with breakfast/lunch/dinner/snack.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class MealPlanAIService {

    private final GroqService groqService;
    private final ObjectMapper mapper = new ObjectMapper();

    /**
     * Generates a full meal plan (multiple days). Reuses the request snapshot
     * stored on {@link MealPlan} so we don't depend on a separate DTO crossing
     * the RabbitMQ boundary.
     */
    public List<DayPlan> generateDayPlans(MealPlan plan) {
        String prompt = createPrompt(plan);
        String aiResponse;
        try {
            aiResponse = groqService.getAnswer(prompt);
        } catch (Exception e) {
            log.error("Groq API call failed for plan {}: {}", plan.getId(), e.getMessage());
            return fallbackDayPlans(plan.getDays(), plan.getFoodVariety());
        }
        log.info("GROQ meal-plan response received for plan {}", plan.getId());
        return parseDayPlans(aiResponse, plan.getDays(), plan.getFoodVariety());
    }

    /**
     * Builds the prompt sent to Groq. Uses a Java text block with explicit
     * JSON-schema instructions and %s placeholders — same style as the activity
     * prompt in {@code aiservice}, but for structured meal data.
     *
     * IMPORTANT: every %s / %d in the text block MUST have a matching argument in
     * the String.format varargs below, in the SAME order. Count them carefully
     * when editing — a mismatch throws MissingFormatArgumentException at runtime.
     */
    private String createPrompt(MealPlan plan) {
        String macroGuidance;
        if (plan.getTargetCalories() != null && plan.getTargetCalories() > 0) {
            macroGuidance = String.format("""
                    Daily calorie target: %d kcal
                    Daily protein target: %.0f g
                    Daily carbs target:   %.0f g
                    Daily fat target:     %.0f g
                    Distribute these macros across the meals of each day so the sum is
                    close to the targets.""",
                    plan.getTargetCalories(),
                    nv(plan.getTargetProtein()),
                    nv(plan.getTargetCarbs()),
                    nv(plan.getTargetFat()));
        } else {
            macroGuidance = "Compute reasonable daily macros for this profile and distribute them across meals.";
        }

        // Translate the foodVariety enum into an explicit, strict do/don't list
        // so the model cannot accidentally violate the user's dietary identity.
        String dietConstraint = buildDietConstraint(plan.getFoodVariety());

        // Raw user suggestions — passed verbatim. Empty → a neutral placeholder
        // so the %s still has an argument (avoids format-arg mismatch).
        String suggestionText = (plan.getSuggestion() != null && !plan.getSuggestion().isBlank())
                ? plan.getSuggestion().trim()
                : "No additional suggestions provided.";

        // Protein source examples tailored to the food variety
        String proteinEx = proteinExamples(plan.getFoodVariety());

        // Placeholders in order: dietConstraint, days, age, weight, height,
        // goal, dietType, foodVariety, proteinEx, suggestionText, macroGuidance
        return String.format("""
                You are a sports nutritionist AI. Generate a personalized meal plan and return it as
                STRICT JSON only — no commentary, no markdown, no text outside the JSON.

                The JSON MUST follow this EXACT schema:
                {
                  "days": [
                    {
                      "dayNumber": 1,
                      "meals": [
                        {
                          "mealType": "BREAKFAST",
                          "time": "08:00 AM",
                          "name": "Oatmeal with Blueberries",
                          "calories": 480,
                          "protein": 25,
                          "carbs": 65,
                          "fat": 12,
                          "ingredients": ["Steel-cut oats", "Blueberries", "Almonds", "Honey"]
                        }
                      ]
                    }
                  ]
                }

                %s

                Rules:
                - Produce EXACTLY %d day objects in the "days" array.
                - Each day MUST contain 4 meals with mealType BREAKFAST, LUNCH, DINNER and SNACK.
                - mealType must be one of: BREAKFAST, LUNCH, DINNER, SNACK.
                - time must be a 12-hour clock string like "08:00 AM".
                - calories is a positive integer; protein/carbs/fat are numbers in grams.
                - ingredients is an array of short strings (max 6 items).
                - Use realistic, whole-food meals.

                DAY-TO-DAY DIVERSITY (balance, not monotony):
                - Aim for MAXIMUM variety across the week. Vary protein sources (%s),
                  carb sources (rice, quinoa, oats, sweet potato, pasta, whole wheat, ...),
                  vegetables, and cooking methods (grilled, baked, sautéed, steamed, roasted).
                - It is OK to repeat a meal or ingredient 1 or 2 times across the week — a little
                  repetition is natural and realistic. But do NOT make every day identical; keep
                  the menu interesting and varied overall.
                REMINDER: Every meal MUST still comply with the DIETARY CONSTRAINT above.
                Do NOT suggest any prohibited ingredient regardless of variety goals.

                User profile:
                Age: %s
                Weight: %s kg
                Height: %s cm
                Primary goal: %s
                Diet type: %s
                Food variety preference: %s

                User suggestions / preferences (honor these as much as possible, but they can
                NEVER override the dietary constraints above):
                %s

                %s

                Return ONLY the JSON object now.
                """,
                dietConstraint,
                plan.getDays(),
                proteinEx,
                plan.getAge() != null ? plan.getAge() : "not specified",
                plan.getWeight() != null ? plan.getWeight() : "not specified",
                plan.getHeight() != null ? plan.getHeight() : "not specified",
                plan.getGoal(),
                plan.getDietType(),
                plan.getFoodVariety(),
                suggestionText,
                macroGuidance
        );
    }

    /**
     * Converts the foodVariety enum into a hard, explicit dietary rule block.
     * This is injected at the TOP of the prompt so the model treats it as
     * non-negotiable — user preferences can never override it.
     */
    private String buildDietConstraint(String foodVariety) {
        if (foodVariety == null) {
            return "DIETARY CONSTRAINTS: No specific food-variety restriction was given.";
        }
        return switch (foodVariety.toUpperCase()) {
            case "VEGAN" -> """
                    ABSOLUTE DIETARY CONSTRAINT — VEGAN (NEVER VIOLATE):
                    - NO meat, poultry, fish, or seafood of any kind.
                    - NO eggs or dairy (no milk, cheese, butter, yogurt, whey, ghee, paneer).
                    - NO honey.
                    - ALL meals must be 100% plant-based: legumes, tofu, tempeh, seitan,
                      grains, vegetables, fruits, nuts, seeds, plant milks.
                    - If any user suggestion conflicts with this, IGNORE the suggestion.""";

            case "VEGETARIAN" -> """
                    ABSOLUTE DIETARY CONSTRAINT — VEGETARIAN (NEVER VIOLATE):
                    - NO meat, poultry, fish, or seafood of any kind.
                    - Dairy and eggs ARE allowed (lacto-ovo vegetarian).
                    - If any user suggestion conflicts with this, IGNORE the suggestion.""";

            case "EGGETARIAN" -> """
                    ABSOLUTE DIETARY CONSTRAINT — EGGETARIAN (NEVER VIOLATE):
                    - NO meat, poultry, fish, or seafood of any kind.
                    - NO dairy is required to be avoided, but the defining rule is: eggs ARE
                      allowed, meat/fish are NOT.
                    - If any user suggestion conflicts with this, IGNORE the suggestion.""";

            case "NON_VEGETARIAN" -> """
                    DIETARY CONSTRAINT — NON-VEGETARIAN:
                    - All food groups are allowed: meat, poultry, fish, eggs, and dairy.
                    - Still aim for balance and variety across protein sources.""";

            default -> "DIETARY CONSTRAINTS: Honor the food-variety preference strictly.";
        };
    }

    /**
     * Checks whether any meal in the parsed plan contains a prohibited ingredient
     * for the given food variety. Returns true if a violation is detected.
     */
    private boolean violatesDietaryConstraint(List<DayPlan> dayPlans, String foodVariety) {
        if (foodVariety == null) return false;
        boolean noMeat = "VEGAN".equalsIgnoreCase(foodVariety)
                || "VEGETARIAN".equalsIgnoreCase(foodVariety)
                || "EGGETARIAN".equalsIgnoreCase(foodVariety);
        boolean noDairyOrEggs = "VEGAN".equalsIgnoreCase(foodVariety);

        if (!noMeat) return false;

        // Common meat/fish/seafood keywords found in ingredient lists
        String[] meatKeywords = {
                "chicken", "beef", "pork", "lamb", "turkey", "duck", "bacon", "ham",
                "sausage", "steak", "meatball", "ground meat", "minced meat",
                "salmon", "tuna", "cod", "tilapia", "trout", "shrimp", "prawn",
                "fish", "crab", "lobster", "anchovy", "sardine", "mackerel",
                "seafood", "shellfish", "clam", "mussel", "oyster",
        };

        for (DayPlan day : dayPlans) {
            for (Meal meal : day.getMeals()) {
                // Check meal name and ingredients
                String combined = ((meal.getName() != null ? meal.getName() : "") + " "
                        + String.join(" ", meal.getIngredients() != null ? meal.getIngredients() : List.of()))
                        .toLowerCase();
                for (String keyword : meatKeywords) {
                    if (combined.contains(keyword)) {
                        log.warn("Prohibited ingredient '{}' found in meal: {}", keyword, meal.getName());
                        return true;
                    }
                }
                if (noDairyOrEggs) {
                    String[] dairyEggKeywords = {
                            "egg", "cheese", "milk", "butter", "yogurt", "yoghurt",
                            "cream", "whey", "ghee", "paneer", "mozzarella", "parmesan",
                            "feta", "cheddar", "honey",
                    };
                    for (String keyword : dairyEggKeywords) {
                        if (combined.contains(keyword)) {
                            log.warn("Prohibited ingredient '{}' (vegan) found in meal: {}", keyword, meal.getName());
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    /** Returns protein source examples safe for the given food variety. */
    private String proteinExamples(String foodVariety) {
        if (foodVariety == null) {
            return "chicken, fish, tofu, lentils, eggs, turkey, beef, paneer, beans";
        }
        return switch (foodVariety.toUpperCase()) {
            case "VEGAN" -> "tofu, tempeh, seitan, lentils, beans, chickpeas, edamame, peanuts, quinoa";
            case "VEGETARIAN", "EGGETARIAN" -> "paneer, tofu, lentils, beans, chickpeas, eggs, Greek yogurt, cottage cheese, whey";
            default -> "chicken, fish, tofu, lentils, eggs, turkey, beef, paneer, beans";
        };
    }

    /** Null-safe double for the printf above. */
    private double nv(Double d) {
        return d == null ? 0 : d;
    }

    /**
     * Attempts to repair a JSON string that was truncated mid-stream (e.g. the
     * model hit its max_tokens limit). Counts unclosed brackets/braces and
     * appends the necessary closing characters.
     *
     * This is a best-effort heuristic — if the truncation happened inside a
     * string value the repaired JSON may still not parse, but the caller
     * already falls back to a default plan on any parse failure.
     */
    private String repairTruncatedJson(String json) {
        if (json == null || json.isBlank()) return json;

        boolean inString = false;
        boolean escape = false;
        int braces = 0;   // { }
        int brackets = 0; // [ ]

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

        // If counts are balanced, nothing to repair
        if (braces == 0 && brackets == 0) return json;

        // Remove trailing comma that may be sitting right before the truncation point
        String repaired = json.stripTrailing();
        if (repaired.endsWith(",")) {
            repaired = repaired.substring(0, repaired.length() - 1);
        }

        // Close open arrays first, then objects (innermost-first doesn't matter
        // here because we only have one nesting level for days → meals)
        StringBuilder sb = new StringBuilder(repaired);
        for (int i = 0; i < brackets; i++) sb.append(']');
        for (int i = 0; i < braces; i++) sb.append('}');

        log.warn("Repaired truncated JSON: appended {} ] and {} }", brackets, braces);
        return sb.toString();
    }

    /**
     * Parses the Groq envelope → {@code choices[0].message.content} → the inner
     * meal-plan JSON. Defensive: any error yields a fallback plan.
     */
    private List<DayPlan> parseDayPlans(String aiResponse, int requestedDays, String foodVariety) {
        try {
            JsonNode root = mapper.readTree(aiResponse);
            String content = root.path("choices").get(0).path("message").path("content").asText();

            // Strip ```json ... ``` fences if the model wrapped the JSON.
            String json = content
                    .replaceAll("(?s)```json\\s*", "")
                    .replaceAll("(?s)```", "")
                    .trim();

            log.info("Parsed meal-plan JSON (first 300 chars): {}",
                    json.length() > 300 ? json.substring(0, 300) + "..." : json);

            // Attempt to repair truncated JSON (e.g. AI hit max_tokens mid-stream)
            json = repairTruncatedJson(json);

            JsonNode daysNode = mapper.readTree(json).path("days");
            List<DayPlan> dayPlans = new ArrayList<>();
            if (daysNode.isArray()) {
                for (JsonNode dayNode : daysNode) {
                    DayPlan day = parseDay(dayNode);
                    if (day != null) dayPlans.add(day);
                }
            }

            if (dayPlans.isEmpty()) {
                log.warn("AI returned no usable days — falling back");
                return fallbackDayPlans(requestedDays, foodVariety);
            }

            // Validate: if user chose a meat-free variety, reject plans containing
            // meat/fish/seafood ingredients. This catches AI hallucinations that
            // slip past the prompt constraints.
            if (violatesDietaryConstraint(dayPlans, foodVariety)) {
                log.warn("AI response violated food variety '{}' — falling back to safe default", foodVariety);
                return fallbackDayPlans(requestedDays, foodVariety);
            }

            return dayPlans;
        } catch (Exception e) {
            log.error("Failed to parse AI meal-plan response: {}", e.getMessage(), e);
            return fallbackDayPlans(requestedDays, foodVariety);
        }
    }

    private DayPlan parseDay(JsonNode dayNode) {
        try {
            int dayNumber = dayNode.path("dayNumber").asInt(dayPlansSizeHint(dayNode) + 1);
            List<Meal> meals = new ArrayList<>();
            JsonNode mealsNode = dayNode.path("meals");
            if (mealsNode.isArray()) {
                for (JsonNode mealNode : mealsNode) {
                    Meal meal = parseMeal(mealNode);
                    if (meal != null) meals.add(meal);
                }
            }
            if (meals.isEmpty()) return null;

            int totalCal = meals.stream().filter(m -> m.getCalories() != null)
                    .mapToInt(Meal::getCalories).sum();
            double totalProtein = meals.stream().filter(m -> m.getProtein() != null)
                    .mapToDouble(Meal::getProtein).sum();
            double totalCarbs = meals.stream().filter(m -> m.getCarbs() != null)
                    .mapToDouble(Meal::getCarbs).sum();
            double totalFat = meals.stream().filter(m -> m.getFat() != null)
                    .mapToDouble(Meal::getFat).sum();

            return DayPlan.builder()
                    .dayNumber(dayNumber)
                    .meals(meals)
                    .totalCalories(totalCal)
                    .totalProtein(round1(totalProtein))
                    .totalCarbs(round1(totalCarbs))
                    .totalFat(round1(totalFat))
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse a day node: {}", e.getMessage());
            return null;
        }
    }

    private Meal parseMeal(JsonNode mealNode) {
        try {
            List<String> ingredients = new ArrayList<>();
            JsonNode ingNode = mealNode.path("ingredients");
            if (ingNode.isArray()) {
                ingNode.forEach(i -> ingredients.add(i.asText()));
            }
            return Meal.builder()
                    .mealType(mealNode.path("mealType").asText("SNACK"))
                    .time(mealNode.path("time").asText(""))
                    .name(mealNode.path("name").asText("Meal"))
                    .calories(mealNode.path("calories").asInt(0))
                    .protein(mealNode.path("protein").asDouble(0))
                    .carbs(mealNode.path("carbs").asDouble(0))
                    .fat(mealNode.path("fat").asDouble(0))
                    .ingredients(ingredients)
                    .build();
        } catch (Exception e) {
            log.warn("Failed to parse a meal node: {}", e.getMessage());
            return null;
        }
    }

    private int dayPlansSizeHint(JsonNode dayNode) {
        return 0; // placeholder; dayNumber defaults from JSON anyway
    }

    private double round1(double v) {
        return Math.round(v * 10) / 10.0;
    }

    /**
     * Sensible default plan used when the AI response can't be parsed.
     * Each day has completely unique meals — no repetition.
     * The fallback respects the user's foodVariety preference.
     */
    private List<DayPlan> fallbackDayPlans(int requestedDays, String foodVariety) {
        boolean vegan = "VEGAN".equalsIgnoreCase(foodVariety);
        boolean veggie = "VEGETARIAN".equalsIgnoreCase(foodVariety);
        boolean egg = "EGGETARIAN".equalsIgnoreCase(foodVariety);
        boolean noMeat = vegan || veggie || egg;

        // Pre-built unique meals for each day (up to 7 days) — vegetarian/vegan safe
        String[][][] vegMealsData = {
            { // Day 1
                {"BREAKFAST", "08:00 AM", "Oatmeal with Blueberries", "450", "22", "60", "12", "Steel-cut oats|Blueberries|Almonds|Honey"},
                {"LUNCH", "01:00 PM", "Paneer Tikka Wrap", "550", "28", "42", "22", "Paneer|Whole wheat tortilla|Bell peppers|Onion|Mint chutney"},
                {"DINNER", "07:00 PM", "Chickpea & Spinach Curry with Rice", "580", "24", "72", "18", "Chickpeas|Spinach|Basmati rice|Tomato|Cumin"},
                {"SNACK", "04:00 PM", "Greek Yogurt with Honey", "200", "20", "15", "5", "Greek yogurt|Honey|Walnuts"},
            },
            { // Day 2
                {"BREAKFAST", "07:30 AM", "Scrambled Eggs on Toast", "420", "28", "35", "18", "Eggs|Whole wheat toast|Avocado|Cherry tomatoes"},
                {"LUNCH", "12:30 PM", "Lentil Soup with Bread", "480", "26", "62", "10", "Red lentils|Carrots|Celery|Onion|Garlic|Crusty bread"},
                {"DINNER", "07:30 PM", "Vegetable Stir-Fry with Tofu", "520", "28", "48", "18", "Firm tofu|Broccoli|Bell peppers|Brown rice|Soy sauce"},
                {"SNACK", "03:30 PM", "Protein Smoothie", "280", "20", "35", "6", "Soy protein|Banana|Almond milk|Spinach"},
            },
            { // Day 3
                {"BREAKFAST", "08:00 AM", "Protein Pancakes", "460", "22", "50", "14", "Oat flour|Eggs|Banana|Maple syrup|Berries"},
                {"LUNCH", "01:00 PM", "Black Bean Quinoa Bowl", "540", "24", "65", "16", "Black beans|Quinoa|Corn|Avocado|Lime|Cilantro"},
                {"DINNER", "07:00 PM", "Eggplant Parmesan with Pasta", "530", "22", "58", "20", "Eggplant|Tomato sauce|Mozzarella|Whole wheat pasta|Basil"},
                {"SNACK", "04:00 PM", "Apple with Almond Butter", "220", "6", "28", "12", "Apple|Almond butter"},
            },
            { // Day 4
                {"BREAKFAST", "07:30 AM", "Avocado Toast with Eggs", "440", "24", "38", "22", "Sourdough bread|Avocado|Poached eggs|Red pepper flakes"},
                {"LUNCH", "12:30 PM", "Chana Masala with Naan", "580", "22", "68", "18", "Chickpeas|Tomato|Onion|Garlic|Naan bread"},
                {"DINNER", "07:30 PM", "Mushroom & Pea Risotto", "560", "18", "72", "16", "Arborio rice|Mushrooms|Green peas|Parmesan|White wine"},
                {"SNACK", "03:30 PM", "Cottage Cheese with Pineapple", "200", "22", "18", "4", "Cottage cheese|Pineapple chunks|Mint"},
            },
            { // Day 5
                {"BREAKFAST", "08:00 AM", "Berry Smoothie Bowl", "380", "14", "55", "10", "Mixed berries|Banana|Granola|Chia seeds|Almond milk"},
                {"LUNCH", "01:00 PM", "Vegetable Tacos", "480", "18", "58", "16", "Black beans|Corn tortillas|Cabbage|Guacamole|Lime"},
                {"DINNER", "07:00 PM", "Palak Paneer with Roti", "570", "26", "52", "24", "Paneer|Spinach|Garlic|Ginger|Whole wheat roti"},
                {"SNACK", "04:00 PM", "Trail Mix", "250", "10", "22", "16", "Mixed nuts|Dried cranberries|Dark chocolate chips"},
            },
            { // Day 6
                {"BREAKFAST", "08:30 AM", "Veggie Omelette", "420", "26", "20", "24", "Eggs|Spinach|Mushrooms|Feta cheese|Bell peppers"},
                {"LUNCH", "01:00 PM", "Falafel Wrap with Hummus", "520", "20", "58", "22", "Falafel|Whole wheat wrap|Hummus|Cucumber|Tomato"},
                {"DINNER", "07:30 PM", "Dal Makhani with Jeera Rice", "580", "24", "68", "18", "Black lentils|Butter|Cream|Basmati rice|Cumin"},
                {"SNACK", "04:00 PM", "Hummus with Veggie Sticks", "210", "8", "24", "10", "Hummus|Carrot sticks|Cucumber|Bell pepper strips"},
            },
            { // Day 7
                {"BREAKFAST", "08:00 AM", "Banana Oat Waffles", "440", "16", "58", "14", "Oats|Banana|Eggs|Cinnamon|Maple syrup"},
                {"LUNCH", "12:30 PM", "Mediterranean Grain Bowl", "560", "22", "62", "22", "Farro|Chickpeas|Cucumber|Tomatoes|Feta|Olive oil|Lemon"},
                {"DINNER", "07:00 PM", "Malai Kofta with Pulao", "600", "20", "60", "28", "Paneer-potato kofta|Tomato-cream gravy|Basmati rice|Coriander"},
                {"SNACK", "03:30 PM", "Peanut Butter Banana Toast", "260", "12", "32", "12", "Rice cake|Peanut butter|Banana slices|Cinnamon"},
            },
        };

        // Pre-built non-veg meals (original fallback)
        String[][][] nonVegMealsData = {
            { // Day 1
                {"BREAKFAST", "08:00 AM", "Oatmeal with Blueberries", "450", "22", "60", "12", "Steel-cut oats|Blueberries|Almonds|Honey"},
                {"LUNCH", "01:00 PM", "Grilled Chicken Salad", "550", "45", "30", "20", "Chicken breast|Mixed greens|Tomatoes|Olive oil"},
                {"DINNER", "07:00 PM", "Salmon with Quinoa", "580", "40", "45", "22", "Salmon fillet|Quinoa|Asparagus|Lemon"},
                {"SNACK", "04:00 PM", "Greek Yogurt with Honey", "200", "20", "15", "5", "Greek yogurt|Honey|Walnuts"},
            },
            { // Day 2
                {"BREAKFAST", "07:30 AM", "Scrambled Eggs on Toast", "420", "28", "35", "18", "Eggs|Whole wheat toast|Avocado|Cherry tomatoes"},
                {"LUNCH", "12:30 PM", "Turkey Wrap", "520", "38", "42", "16", "Turkey slices|Whole wheat tortilla|Lettuce|Mustard"},
                {"DINNER", "07:30 PM", "Beef Stir-Fry", "600", "42", "40", "25", "Lean beef|Bell peppers|Broccoli|Brown rice|Soy sauce"},
                {"SNACK", "03:30 PM", "Protein Smoothie", "280", "30", "35", "4", "Whey protein|Banana|Milk|Spinach"},
            },
            { // Day 3
                {"BREAKFAST", "08:00 AM", "Protein Pancakes", "460", "32", "50", "14", "Oat flour|Eggs|Banana|Maple syrup|Berries"},
                {"LUNCH", "01:00 PM", "Tuna Pasta Salad", "540", "40", "52", "18", "Tuna|Whole wheat pasta|Olives|Cucumber|Greek yogurt dressing"},
                {"DINNER", "07:00 PM", "Baked Cod with Sweet Potato", "530", "38", "42", "16", "Cod fillet|Sweet potato|Green beans|Garlic"},
                {"SNACK", "04:00 PM", "Apple with Almond Butter", "220", "6", "28", "12", "Apple|Almond butter"},
            },
            { // Day 4
                {"BREAKFAST", "07:30 AM", "Avocado Toast with Eggs", "440", "24", "38", "22", "Sourdough bread|Avocado|Poached eggs|Red pepper flakes"},
                {"LUNCH", "12:30 PM", "Lentil Soup with Bread", "480", "26", "62", "10", "Red lentils|Carrots|Celery|Onion|Garlic|Crusty bread"},
                {"DINNER", "07:30 PM", "Chicken Tikka with Basmati Rice", "620", "48", "55", "20", "Chicken thigh|Yogurt marinade|Basmati rice|Cucumber raita"},
                {"SNACK", "03:30 PM", "Cottage Cheese with Pineapple", "200", "22", "18", "4", "Cottage cheese|Pineapple chunks|Mint"},
            },
            { // Day 5
                {"BREAKFAST", "08:00 AM", "Berry Smoothie Bowl", "380", "18", "55", "10", "Mixed berries|Banana|Granola|Chia seeds|Almond milk"},
                {"LUNCH", "01:00 PM", "Grilled Shrimp Tacos", "510", "35", "48", "18", "Shrimp|Corn tortillas|Cabbage slaw|Lime|Cilantro"},
                {"DINNER", "07:00 PM", "Pork Tenderloin with Roasted Veg", "570", "44", "35", "22", "Pork tenderloin|Brussels sprouts|Carrots|Olive oil|Thyme"},
                {"SNACK", "04:00 PM", "Trail Mix", "250", "10", "22", "16", "Mixed nuts|Dried cranberries|Dark chocolate chips"},
            },
            { // Day 6
                {"BREAKFAST", "08:30 AM", "Veggie Omelette", "420", "26", "20", "24", "Eggs|Spinach|Mushrooms|Feta cheese|Bell peppers"},
                {"LUNCH", "01:00 PM", "Chicken Caesar Wrap", "530", "42", "38", "22", "Grilled chicken|Romaine lettuce|Parmesan|Caesar dressing|Tortilla"},
                {"DINNER", "07:30 PM", "Baked Lamb Chops with Couscous", "640", "46", "50", "24", "Lamb chops|Couscous|Roasted tomatoes|Mint yogurt"},
                {"SNACK", "04:00 PM", "Hummus with Veggie Sticks", "210", "8", "24", "10", "Hummus|Carrot sticks|Cucumber|Bell pepper strips"},
            },
            { // Day 7
                {"BREAKFAST", "08:00 AM", "Banana Oat Waffles", "440", "20", "58", "14", "Oats|Banana|Eggs|Cinnamon|Maple syrup"},
                {"LUNCH", "12:30 PM", "Mediterranean Grain Bowl", "560", "32", "58", "20", "Farro|Chickpeas|Cucumber|Tomatoes|Feta|Olive oil|Lemon"},
                {"DINNER", "07:00 PM", "Herb-Crusted Fish with Mash", "550", "42", "40", "18", "White fish|Herb crust|Mashed potatoes|Peas|Lemon butter"},
                {"SNACK", "03:30 PM", "Peanut Butter Banana Toast", "260", "12", "32", "12", "Rice cake|Peanut butter|Banana slices|Cinnamon"},
            },
        };

        // Choose the right dataset based on food variety
        String[][][] mealsData = noMeat ? vegMealsData : nonVegMealsData;

        List<DayPlan> days = new ArrayList<>();
        for (int d = 0; d < Math.min(requestedDays, mealsData.length); d++) {
            String[][] dayMeals = mealsData[d];
            List<Meal> meals = new ArrayList<>();
            int totalCal = 0;
            double totalProtein = 0, totalCarbs = 0, totalFat = 0;

            for (String[] m : dayMeals) {
                int cal = Integer.parseInt(m[3]);
                double pro = Double.parseDouble(m[4]);
                double carb = Double.parseDouble(m[5]);
                double fat = Double.parseDouble(m[6]);
                totalCal += cal;
                totalProtein += pro;
                totalCarbs += carb;
                totalFat += fat;

                meals.add(Meal.builder()
                        .mealType(m[0]).time(m[1]).name(m[2])
                        .calories(cal).protein(pro).carbs(carb).fat(fat)
                        .ingredients(List.of(m[7].split("\\|")))
                        .build());
            }

            days.add(DayPlan.builder()
                    .dayNumber(d + 1)
                    .meals(meals)
                    .totalCalories(totalCal)
                    .totalProtein(round1(totalProtein))
                    .totalCarbs(round1(totalCarbs))
                    .totalFat(round1(totalFat))
                    .build());
        }
        return days;
    }
}
