package com.fitness.gateway.user;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;
import reactor.core.publisher.Mono;

@Service
@Data
@Slf4j
public class UserService {
    public final WebClient userServiceWebClient;

    public Mono<Boolean> validation(String userId) {

        return userServiceWebClient.get()
                .uri("/api/user/{userId}/validate", userId)
                .retrieve()
                .bodyToMono(Boolean.class)
                .onErrorResume(WebClientResponseException.class, e -> {
                    if (e.getStatusCode() == HttpStatus.NOT_FOUND)
                        return Mono.error(new RuntimeException("User not found: " + userId));
                    else if (e.getStatusCode() == HttpStatus.BAD_REQUEST)
                        return Mono.error(new RuntimeException("Invalid User: " + userId));
                    return Mono.error(new RuntimeException("Unexpected error: " + e.getMessage()));
                });



    }

   public Mono<UserResponse> registerUser(RegisterRequest registerRequest){
log.info("Calling User Registration API for email :{}",registerRequest.getEmail());
       return userServiceWebClient.post()
               .uri("/api/user/register")
               .bodyValue(registerRequest)
               .retrieve()
               .bodyToMono(UserResponse.class)
               .onErrorResume(WebClientResponseException.class, e -> {
                   if (e.getStatusCode() == HttpStatus.BAD_REQUEST)
                       return Mono.error(new RuntimeException("BAD_REQUEST: " + e.getMessage()));
                   else if (e.getStatusCode() == HttpStatus.INTERNAL_SERVER_ERROR)
                       return Mono.error(new RuntimeException("INTERNAL_SERVER_ERROR: " + e.getMessage()));
                   return Mono.error(new RuntimeException("Unexpected error: " + e.getMessage()));
               });
   }

   /**
    * Fetches the full profile for a user id. Used by /api/auth/me so the UI
    * gets the current name/email from the source of truth (user-service).
    */
   public Mono<UserResponse> fetchProfile(String userId) {
       return userServiceWebClient.get()
               .uri("/api/user/{userId}", userId)
               .retrieve()
               .bodyToMono(UserResponse.class)
               .onErrorResume(WebClientResponseException.class, e ->
                       Mono.error(new RuntimeException("Failed to fetch profile: " + e.getMessage())));
   }


}
