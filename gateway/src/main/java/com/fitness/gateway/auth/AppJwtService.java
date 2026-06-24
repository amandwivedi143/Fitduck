package com.fitness.gateway.auth;

import com.fitness.gateway.auth.dto.AuthUser;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.JWSObject;
import com.nimbusds.jose.Payload;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * Mints and verifies the gateway's OWN short-lived app JWT (HS256).
 *
 * This is what lives in the httpOnly cookie. Its sole claim of interest to
 * downstream services is "sub" (the user id) — GatewayAuthFilter turns that
 * into the X-User-ID header. Keeping it HS256 + server-side secret means no
 * service needs to call Google on every request.
 */
@Service
public class AppJwtService {

    private static final Logger log = LoggerFactory.getLogger(AppJwtService.class);

    private final byte[] secret;
    private final String issuer;
    private final long ttlMillis;

    public AppJwtService(
            @Value("${app.security.app-jwt-secret}") String secret,
            @Value("${app.security.app-jwt-issuer}") String issuer,
            @Value("${app.security.app-jwt-ttl-minutes:60}") long ttlMinutes) {
        // nimbus MAC signer requires >= 256 bits (32 bytes).
        byte[] bytes = secret.getBytes();
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "APP_JWT_SECRET must be at least 32 characters. Current length: " + bytes.length);
        }
        this.secret = bytes;
        this.issuer = issuer;
        this.ttlMillis = ttlMinutes * 60_000L;
    }

    public String mint(AuthUser user) {
        try {
            Date now = new Date();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .issuer(issuer)
                    .subject(user.getUserId())
                    .claim("email", user.getEmail())
                    .claim("name",
                            ((user.getFirstName() == null ? "" : user.getFirstName()) + " " +
                             (user.getLastName() == null ? "" : user.getLastName())).trim())
                    .issueTime(now)
                    .expirationTime(new Date(now.getTime() + ttlMillis))
                    .build();

            JWSObject jws = new JWSObject(
                    new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(),
                    new Payload(claims.toJSONObject()));
            jws.sign(new MACSigner(secret));
            return jws.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to mint app JWT", e);
        }
    }

    /**
     * @return the user id from a valid app JWT, or null if invalid/expired.
     */
    public String verifyAndExtractUserId(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            if (!jwt.verify(new MACVerifier(secret))) {
                return null;
            }
            JWTClaimsSet claims = jwt.getJWTClaimsSet();
            if (claims.getExpirationTime() == null
                    || claims.getExpirationTime().before(new Date())) {
                return null;
            }
            return claims.getSubject();
        } catch (Exception e) {
            log.debug("App JWT verification failed: {}", e.getMessage());
            return null;
        }
    }
}
