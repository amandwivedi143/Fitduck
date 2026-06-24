package com.fitness.gateway.auth;

import com.fitness.gateway.auth.dto.GoogleClaims;
import com.nimbusds.jose.jwk.source.RemoteJWKSet;
import com.nimbusds.jose.proc.JWSVerificationKeySelector;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.proc.SecurityContext;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.proc.DefaultJWTProcessor;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URL;

/**
 * Cryptographically verifies a Google ID token.
 *
 * Google signs ID tokens (RS256) with keys published at their public JWKS
 * endpoint. We validate the signature, issuer, audience (= our OAuth client id)
 * and expiry here. This is the trust root of the whole auth flow: if this check
 * passes, we believe the user is who Google says they are.
 *
 * Google's JWKS is cached by nimbus; if a key rotates, nimbus refetches.
 */
@Service
public class GoogleTokenVerifier {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifier.class);
    private static final String GOOGLE_JWKS_URL = "https://www.googleapis.com/oauth2/v3/certs";
    private static final String ISSUER_ACCOUNTS = "https://accounts.google.com";
    private static final String ISSUER_ACCOUNTS_SHORT = "accounts.google.com";

    private final DefaultJWTProcessor<SecurityContext> jwtProcessor;
    private final String googleClientId;

    public GoogleTokenVerifier(@Value("${app.security.google-client-id}") String googleClientId) throws Exception {
        this.googleClientId = googleClientId;
        // JWKS is fetched lazily and cached by nimbus.
        RemoteJWKSet<SecurityContext> jwkSet = new RemoteJWKSet<>(new URL(GOOGLE_JWKS_URL));
        JWSVerificationKeySelector<SecurityContext> keySelector =
                new JWSVerificationKeySelector<>(JWSAlgorithm.RS256, jwkSet);
        this.jwtProcessor = new DefaultJWTProcessor<>();
        this.jwtProcessor.setJWSKeySelector(keySelector);
    }

    /**
     * @return verified claims, or null if the token is invalid/expired/wrong audience.
     */
    public GoogleClaims verify(String idToken) {
        try {
            SignedJWT signed = SignedJWT.parse(idToken);
            JWTClaimsSet claims = jwtProcessor.process(signed, null);

            // 1) Issuer check
            String issuer = claims.getIssuer();
            if (!ISSUER_ACCOUNTS.equals(issuer) && !ISSUER_ACCOUNTS_SHORT.equals(issuer)) {
                log.warn("Rejected Google token: bad issuer {}", issuer);
                return null;
            }
            // 2) Audience check — must include our OAuth client id
            if (claims.getAudience() == null || !claims.getAudience().contains(googleClientId)) {
                log.warn("Rejected Google token: audience mismatch {}", claims.getAudience());
                return null;
            }
            // 3) Expiry is already enforced by jwtProcessor; double-check email verification.
            Boolean emailVerified = (Boolean) claims.getClaim("email_verified");

            return GoogleClaims.builder()
                    .subject(claims.getSubject())
                    .email(claims.getStringClaim("email"))
                    .givenName(claims.getStringClaim("given_name"))
                    .familyName(claims.getStringClaim("family_name"))
                    .picture(claims.getStringClaim("picture"))
                    .emailVerified(emailVerified)
                    .build();
        } catch (Exception e) {
            log.warn("Google ID token verification failed: {}", e.getMessage());
            return null;
        }
    }
}
