package com.fitness.activitystatus.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * IMPORTANT: we deliberately do NOT register a Jackson2JsonMessageConverter bean.
 *
 * The default SimpleMessageConverter treats the payload as a plain String, which
 * is exactly what we want: the producer serializes the Activity to a JSON string
 * itself (see ActivityService) and the consumer parses that string into ITS OWN
 * Activity type. This avoids the cross-service __TypeId__ class-name problem
 * entirely — no trust checks, no shared package, no classpath coupling.
 */
@Configuration
public class RabbitMqConfig {
    @Value("${rabbitmq.exchange.name}")
    private String exchange;
    @Value("${rabbitmq.queue.name}")
    private String queue;
    @Value("${rabbitmq.routing.key}")
    private String routingKey;

    @Bean
    public Queue activityQueue() {
        return new Queue(queue, true);
    }

    @Bean
    public DirectExchange activityExchange() {
        return new DirectExchange(exchange);
    }

    @Bean
    public Binding activityBinding(Queue activityQueue, DirectExchange activityExchange) {
        return BindingBuilder.bind(activityQueue).to(activityExchange).with(routingKey);
    }
}
