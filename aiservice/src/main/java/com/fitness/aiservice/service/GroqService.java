package com.fitness.aiservice.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;

import java.util.List;
import java.util.Map;

/**
 * Calls the Groq OpenAI-compatible chat completions endpoint.
 * (Renamed from GrokService — Groq is the actual provider.)
 */
@Service
@Slf4j
public class GroqService {

    private final WebClient webClient;
    private final ObjectMapper mapper = new ObjectMapper();

    @Value("${groq.api.url}")
    private String grokApiUrl;
    @Value("${groq.api.key}")
    private String grokApiKey;

    public GroqService(WebClient.Builder webClientBuilder) {
        this.webClient = webClientBuilder.build();
    }

    /**
     * Returns the raw JSON response string from Groq. Callers parse the
     * choices[0].message.content field.
     */
    public String getAnswer(String question) {
        Map<String, Object> requestBody = Map.of(
                "model", "openai/gpt-oss-120b",
                "messages", List.of(
                        Map.of(
                                "role", "user",
                                "content", question
                        )
                )
        );
        return webClient.post()
                .uri(grokApiUrl)
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + grokApiKey)
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .block();
    }
}
