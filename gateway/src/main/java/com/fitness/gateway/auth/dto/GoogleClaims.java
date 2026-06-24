package com.fitness.gateway.auth.dto;

import lombok.Builder;
import lombok.Data;

/**
 * Verified claims extracted from a Google ID token after cryptographic
 * validation against Google's public JWKS.
 */
@Data
@Builder
public class GoogleClaims {
    private String subject;     // 'sub' — stable Google user id
    private String email;
    private String givenName;   // 'given_name'
    private String familyName;  // 'family_name'
    private String picture;     // 'picture'
    private Boolean emailVerified;
}
