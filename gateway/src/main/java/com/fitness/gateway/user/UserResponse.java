package com.fitness.gateway.user;

import lombok.Data;

import java.time.LocalDateTime;

@Data

public class UserResponse {
    private String userId;
    private String email;
    private String keyClockId;
    private String password;
    private String firstName;
    private String lastName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
