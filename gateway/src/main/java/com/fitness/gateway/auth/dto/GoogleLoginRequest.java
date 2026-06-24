package com.fitness.gateway.auth.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * Request body for POST /api/auth/google.
 * {@code credential} is the raw Google ID token returned by Google Identity
 * Services in the browser after the user consents.
 */
@Data
public class GoogleLoginRequest {
    @NotBlank(message = "Google credential (ID token) is required")
    private String credential;
}
