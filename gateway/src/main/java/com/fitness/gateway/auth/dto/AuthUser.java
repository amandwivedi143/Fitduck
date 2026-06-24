package com.fitness.gateway.auth.dto;

import lombok.Builder;
import lombok.Data;

/**
 * The user identity returned to the frontend after a successful login and on
 * GET /api/auth/me. Note: NO password is ever exposed.
 */
@Data
@Builder
public class AuthUser {
    private String userId;
    private String email;
    private String firstName;
    private String lastName;
    private String pictureUrl;
}
