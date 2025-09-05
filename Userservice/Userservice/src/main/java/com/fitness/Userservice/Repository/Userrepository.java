package com.fitness.Userservice.Repository;

import com.fitness.Userservice.Model.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface Userrepository extends JpaRepository<User, String> {
    boolean existsByEmail(@NotBlank(message = "Enter the email") @Email(message = "enter the valid email") String email);
}
