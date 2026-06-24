package com.fitness.userservice.Dto;

import lombok.Data;

import java.time.LocalDateTime;
@Data

public class UserResponse {
    private String userId;
    private String email;
    private String keyClockId;
    // NOTE: password intentionally omitted — never expose credential material in API responses.
    private String firstName;
    private String lastName;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
