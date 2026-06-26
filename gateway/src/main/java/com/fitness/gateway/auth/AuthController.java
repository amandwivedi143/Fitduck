package com.fitness.gateway.auth;

import com.fitness.gateway.auth.dto.AuthUser;
import com.fitness.gateway.auth.dto.GoogleClaims;
import com.fitness.gateway.auth.dto.GoogleLoginRequest;
import com.fitness.gateway.user.RegisterRequest;
import com.fitness.gateway.user.UserResponse;
import com.fitness.gateway.user.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Map;

/**
 * Gateway-owned auth endpoints for the token-exchange flow.
 *
 *   POST /api/auth/google  { credential } -> validate Google ID token, upsert
 *        user in user-service, mint app JWT, set httpOnly cookie, return user.
 *   POST /api/auth/logout  -> clear cookie.
 *   GET  /api/auth/me      -> return current user from the app JWT cookie.
 */
@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final GoogleTokenVerifier googleTokenVerifier;
    private final AppJwtService appJwtService;
    private final UserService userService;

    @Value("${app.security.cookie-name}")
    private String cookieName;
    @Value("${app.security.app-jwt-ttl-minutes:60}")
    private long ttlMinutes;

    @PostMapping("/google")
    public Mono<ResponseEntity<Map<String, AuthUser>>> loginWithGoogle(
            @RequestBody GoogleLoginRequest request,
            @CookieValue(name = "app_jwt", required = false) String existingCookie) {

        // 1) Verify the Google ID token cryptographically.
        GoogleClaims google = googleTokenVerifier.verify(request.getCredential());
        if (google == null || google.getSubject() == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid Google token"));
        }

        // 2) Map Google claims -> our RegisterRequest (providerId = Google 'sub').
        RegisterRequest register = new RegisterRequest();
        register.setEmail(google.getEmail());
        register.setKeyClockId(google.getSubject()); // column stays 'key_clock_id'; semantically the provider id
        register.setFirstName(google.getGivenName());
        register.setLastName(google.getFamilyName());
        // user-service no longer stores a real password; auth is delegated to Google.
        // A random value satisfies the @NotBlank/@Size validators without leaking anything.
        register.setPassword(java.util.UUID.randomUUID().toString());

        // 3) Upsert into user-service. Its addUserProfile is idempotent on email.
        return userService.registerUser(register)
                .map(userResponse -> buildLoginResponse(userResponse, google))
                .doOnNext(entity -> log.info("Google login OK for user {}", entity.getBody().get("user").getUserId()));
    }

    @PostMapping("/logout")
    public Mono<ResponseEntity<Void>> logout() {
        ResponseCookie cleared = ResponseCookie.from(cookieName, "")
                .httpOnly(true)
                .secure(true)  // prod is HTTPS; flip to false for local dev
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ZERO)
                .build();
        return Mono.just(ResponseEntity.noContent()
                .header("Set-Cookie", cleared.toString())
                .build());
    }

    @GetMapping("/me")
    public Mono<ResponseEntity<AuthUser>> me(@CookieValue(name = "app_jwt", required = false) String token) {
        if (token == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated"));
        }
        String userId = appJwtService.verifyAndExtractUserId(token);
        if (userId == null) {
            return Mono.error(new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired session"));
        }
        // Fetch fresh profile from user-service so the UI sees current name/email.
        return userService.fetchProfile(userId)
                .map(profile -> ResponseEntity.ok(toAuthUser(profile)))
                .switchIfEmpty(Mono.error(new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found")));
    }

    // --- helpers ---

    private ResponseEntity<Map<String, AuthUser>> buildLoginResponse(UserResponse user, GoogleClaims google) {
        AuthUser authUser = AuthUser.builder()
                .userId(user.getUserId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pictureUrl(google.getPicture())
                .build();

        String jwt = appJwtService.mint(authUser);
        ResponseCookie cookie = ResponseCookie.from(cookieName, jwt)
                .httpOnly(true)
                .secure(true)  // prod is HTTPS; flip to false for local dev
                .sameSite("Lax")
                .path("/")
                .maxAge(Duration.ofMinutes(ttlMinutes))
                .build();

        return ResponseEntity.ok()
                .header("Set-Cookie", cookie.toString())
                .body(Map.of("user", authUser));
    }

    private AuthUser toAuthUser(UserResponse profile) {
        return AuthUser.builder()
                .userId(profile.getUserId())
                .email(profile.getEmail())
                .firstName(profile.getFirstName())
                .lastName(profile.getLastName())
                .build();
    }
}
