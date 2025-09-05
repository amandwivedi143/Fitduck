package com.fitness.Userservice.Controller.Dto;

import com.fitness.Userservice.Dto.UserResponse;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank(message = "Enter the email")
    @Email(message = "enter the valid email")
    private String email;
    @NotBlank(message = "Enter the password")
    @Size(min=6,message="Password should be atleast 6 characters")
    private String password;
    private String firstName;
    private String lastName;


}
