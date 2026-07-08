package com.fitness.userservice.Controller;

import com.fitness.userservice.Controller.Dto.RegisterRequest;
import com.fitness.userservice.Controller.Dto.LoginRequest;
import com.fitness.userservice.Dto.UserResponse;
import com.fitness.userservice.Service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@AllArgsConstructor
public class UserController {
    private UserService userService;
@GetMapping("/{userId}")
    public ResponseEntity<UserResponse> getUserProfile(@PathVariable String userId){
    return ResponseEntity.ok(userService.getUserProfile(userId));
}
@PostMapping("/register")
    public ResponseEntity<UserResponse> addUserProfile(@Valid @RequestBody RegisterRequest request){
        return ResponseEntity.ok(userService.addUserProfile(request));
    }

@PostMapping("/login")
    public ResponseEntity<UserResponse> login(@Valid @RequestBody LoginRequest request){
        return ResponseEntity.ok(userService.login(request));
    }


    @GetMapping("/{userId}/validate")
    public ResponseEntity<Boolean> getValidation(@PathVariable String userId){
        return ResponseEntity.ok(userService.existByUserId(userId));
    }

}
