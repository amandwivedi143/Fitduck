package com.fitness.aihelper.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * RabbitMQ topology for the meal-plan and workout-plan pipelines.
 *
 * IMPORTANT: we deliberately do NOT register a Jackson2JsonMessageConverter bean.
 *
 * The producer (the controller in THIS service) serializes the request to a JSON
 * string itself and sends it as a plain String message. The listener parses that
 * string back into its own DTO. This mirrors the activity-service → ai-service
 * pattern and avoids the cross-service __TypeId__ / trusted-packages failure mode
 * entirely.
 *
 * We use SEPARATE exchanges, queues and routing keys for meal-plan and workout-plan
 * flows so the two never interfere.
 */
@Configuration
public class RabbitMqConfig {

    // --- Meal Plan pipeline ---
    @Value("${rabbitmq.exchange.name}")
    private String mealExchange;
    @Value("${rabbitmq.queue.name}")
    private String mealQueue;
    @Value("${rabbitmq.routing.key}")
    private String mealRoutingKey;

    // --- Workout Plan pipeline ---
    @Value("${rabbitmq.workout.exchange.name}")
    private String workoutExchange;
    @Value("${rabbitmq.workout.queue.name}")
    private String workoutQueue;
    @Value("${rabbitmq.workout.routing.key}")
    private String workoutRoutingKey;

    // --- Meal Plan beans ---
    @Bean
    public Queue mealPlanQueue() {
        return new Queue(mealQueue, true);
    }

    @Bean
    public DirectExchange mealPlanExchange() {
        return new DirectExchange(mealExchange);
    }

    @Bean
    public Binding mealPlanBinding(Queue mealPlanQueue, DirectExchange mealPlanExchange) {
        return BindingBuilder.bind(mealPlanQueue).to(mealPlanExchange).with(mealRoutingKey);
    }

    // --- Workout Plan beans ---
    @Bean
    public Queue workoutPlanQueue() {
        return new Queue(workoutQueue, true);
    }

    @Bean
    public DirectExchange workoutPlanExchange() {
        return new DirectExchange(workoutExchange);
    }

    @Bean
    public Binding workoutPlanBinding(Queue workoutPlanQueue, DirectExchange workoutPlanExchange) {
        return BindingBuilder.bind(workoutPlanQueue).to(workoutPlanExchange).with(workoutRoutingKey);
    }
}
