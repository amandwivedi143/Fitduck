package com.fitness.aihelper.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Exposes a WebClient.Builder so {@link com.fitness.aihelper.service.GroqService}
 * can make non-blocking calls to the Groq chat-completions API.
 */
@Configuration
public class WebClientConfig {

    @Bean
    public WebClient.Builder webClientBuilder() {
        return WebClient.builder();
    }
}
