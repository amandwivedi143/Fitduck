package com.fitness.userservice.Controller.Dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequest {
    @NotBlank(message = "Enter the email")
    @Email(message = "enter the valid email")
    private String email;

    @NotBlank(message = "Enter the password")
    private String password;
}
