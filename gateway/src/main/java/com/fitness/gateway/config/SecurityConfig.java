package com.fitness.gateway.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

import java.util.List;

/**
 * Reactive (WebFlux) security for the gateway.
 *
 * Auth model: gateway token-exchange.
 *   - Browser signs in with Google, sends the Google ID token to /api/auth/google
 *   - Gateway validates it (GoogleJwkService), upserts the user, mints an APP JWT
 *     and stores it in an httpOnly cookie. Tokens never reach JS (XSS-safe).
 *   - GatewayAuthFilter reads the cookie on every request and injects X-User-ID
 *     for downstream microservices.
 *
 * CSRF is disabled because we use a stateless bearer-cookie pattern (not form
 * auth) and the auth mutation endpoint is protected by the ID-token check.
 */
@Configuration
@EnableWebFluxSecurity
public class SecurityConfig {

    @Bean
    public SecurityWebFilterChain springSecurityFilterChain(ServerHttpSecurity http) {
        // Auth enforcement is delegated to GatewayAuthFilter (it reads the app_jwt
        // cookie and rejects unauthenticated requests on non-public paths).
        // Spring Security here only sets up CORS + disables CSRF for the cookie flow.
        return http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .authorizeExchange(exchange -> exchange.anyExchange().permitAll())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        // Read allowed origins from env var (comma-separated).
        // Falls back to localhost for local dev and "*" to allow any origin in production.
        String originsRaw = System.getenv().getOrDefault(
                "CORS_ALLOWED_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174"
        );
        config.setAllowedOrigins(List.of(originsRaw.split(",")));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type", "X-User-ID"));
        config.setExposedHeaders(List.of("X-User-ID"));
        // App JWT lives in a cookie -> origin must be whitelisted AND credentials allowed.
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
