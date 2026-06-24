package com.fitness.gateway.auth;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.server.WebFilter;
import org.springframework.web.server.WebFilterChain;
import reactor.core.publisher.Mono;

import java.util.List;

/**
 * Replaces the old Keycloak sync filter. On every request:
 *   1. If path is public (/api/auth/**, /actuator/**) -> pass through.
 *   2. Read the app_jwt cookie, verify it, extract the user id.
 *   3. Inject that id as the X-User-ID header so downstream microservices
 *      (activity-service, ai-service) can trust it without re-validating.
 *   4. If no/invalid cookie -> 401.
 *
 * It runs as a WebFilter BEFORE routing so the header exists when the request
 * hits gateway routes (and ultimately the backend services).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class GatewayAuthFilter implements WebFilter {

    private final AppJwtService appJwtService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Value("${app.security.cookie-name}")
    private String cookieName;
    @Value("${app.security.public-paths}")
    private String publicPathsCsv;

    private List<String> publicPaths;

    @PostConstruct
    void init() {
        publicPaths = List.of(publicPathsCsv.split(","));
    }

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, WebFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        String path = request.getPath().pathWithinApplication().value();

        // Public endpoints (login, logout, me-ish introspection, actuator) skip auth.
        if (publicPaths.stream().anyMatch(p -> pathMatcher.match(p, path))) {
            return chain.filter(exchange);
        }

        // Extract cookie by hand (reactive side has no simple jakarta Cookie API here).
        String cookieHeader = request.getHeaders().getFirst("Cookie");
        String token = extractCookie(cookieHeader, cookieName);

        String userId = (token != null) ? appJwtService.verifyAndExtractUserId(token) : null;
        if (userId == null) {
            log.debug("Rejecting unauthenticated request to {}", path);
            exchange.getResponse().setStatusCode(HttpStatus.UNAUTHORIZED);
            return exchange.getResponse().setComplete();
        }

        // Inject the trusted header for downstream services.
        ServerHttpRequest mutated = request.mutate()
                .header("X-User-ID", userId)
                .build();
        return chain.filter(exchange.mutate().request(mutated).build());
    }

    private String extractCookie(String cookieHeader, String name) {
        if (cookieHeader == null) return null;
        for (String part : cookieHeader.split(";")) {
            String trimmed = part.trim();
            if (trimmed.startsWith(name + "=")) {
                return trimmed.substring(name.length() + 1);
            }
        }
        return null;
    }
}
