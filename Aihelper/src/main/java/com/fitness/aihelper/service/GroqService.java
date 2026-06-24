package com.fitness.aihelper.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Thin client for the Groq OpenAI-compatible chat-completions endpoint.
 *
 * Mirrors the proven GroqService in {@code aiservice} so we reuse the same model
 * (openai/gpt-oss-120b) and the same Bearer-token request shape. The returned
 * string is the full Groq JSON envelope — callers dig into
 * {@code choices[0].message.content}.
 */
@Service
@Slf4j
public class GroqService {

    private final WebClient webClient;

    @Value("${groq.api.url}")
    private String groqApiUrl;
    @Value("${groq.api.key}")
    private String groqApiKey;

    public GroqService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Sends a single user message and returns the raw Groq response JSON.
     */
    public String getAnswer(String prompt) {
        Map<String, Object> requestBody = Map.of(
                "model", "openai/gpt-oss-120b",
                "max_tokens", 4096,
                "messages", List.of(
                        Map.of("role", "user", "content", prompt)
                )
        );
        return webClient.post()
                .uri(groqApiUrl)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + groqApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block(Duration.ofSeconds(60));
    }
}
