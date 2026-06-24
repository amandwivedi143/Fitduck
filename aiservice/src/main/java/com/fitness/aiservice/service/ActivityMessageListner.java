package com.fitness.aiservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.aiservice.model.Activity;
import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.repository.RecommendationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Service;

/**
 * Consumes activity messages from RabbitMQ.
 *
 * We receive the payload as a plain String (JSON) and deserialize it into OUR
 * Activity type. This is decoupled from the producer's class — see RabbitMqConfig
 * for why we avoid Jackson2JsonMessageConverter's __TypeId__ class-name linking.
 */
@Service
@Slf4j
@RequiredArgsConstructor
public class ActivityMessageListner {
    private final ActivityAIService aiService;
    private final RecommendationRepository recommendationRepository;
    // Register the JavaTimeModule so java.time.LocalDateTime (createdAt/updatedAt)
    // serializes & deserializes correctly. The default ObjectMapper can't handle it.
    private final ObjectMapper objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);

    @RabbitListener(queues = "activity.queue")
    public void processActivity(String json) {
        try {
            Activity activity = objectMapper.readValue(json, Activity.class);
            log.info("Received activity for processing : {}", activity.getId());
            Recommendation recommendation = aiService.genrateRecommendation(activity);
            recommendationRepository.save(recommendation);
        } catch (Exception e) {
            log.error("Failed to process activity message: {}", e.getMessage(), e);
        }
    }
}
