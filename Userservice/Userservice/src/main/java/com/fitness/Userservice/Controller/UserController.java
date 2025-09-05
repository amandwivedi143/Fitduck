package com.fitness.Userservice.Controller;

import com.fitness.Userservice.Controller.Dto.RegisterRequest;
import com.fitness.Userservice.Dto.UserResponse;
import com.fitness.Userservice.Service.UserService;
import jakarta.validation.Valid;
import lombok.AllArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
@AllArgsConstructor
public class UserController {
    private UserService userService;
@GetMapping("/{userid}")
    public ResponseEntity<UserResponse> getUserProfile(@PathVariable String userId){
    return ResponseEntity.ok(userService.getUserProfile(userId));
}
    @PostMapping("/register")
    public ResponseEntity<UserResponse> addUserProfile(@Valid @RequestBody RegisterRequest request){
        return ResponseEntity.ok(userService.addUserProfile(request));
    }

}
