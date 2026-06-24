package com.fitness.aihelper.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;

/**
 * Enables Mongo auditing so {@code @CreatedDate} / {@code @LastModifiedDate} on
 * {@link com.fitness.aihelper.model.MealPlan} are auto-populated.
 */
@Configuration
@EnableMongoAuditing
public class MongoConfig {
}
