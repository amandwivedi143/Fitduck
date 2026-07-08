package com.fitness.userservice.Service;

import com.fitness.userservice.Controller.Dto.LoginRequest;
import com.fitness.userservice.Controller.Dto.RegisterRequest;
import com.fitness.userservice.Dto.UserResponse;
import com.fitness.userservice.Model.User;
import com.fitness.userservice.Repository.Userrepository;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@Service
public class UserService {

    private final Userrepository userRepo;

    public UserService(Userrepository userRepo) {
        this.userRepo = userRepo;
    }

    public UserResponse getUserProfile(String userId) {
        User user = userRepo.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        return toResponse(user);
    }

    /**
     * Idempotent upsert keyed on email. If the user already exists (e.g. logged in
     * before via Google), we return the existing record and refresh their name fields
     * in case Google updated them. Otherwise we create a new profile.
     */
    public UserResponse addUserProfile(RegisterRequest request) {
        User saved = userRepo.findByEmail(request.getEmail())
                .map(existing -> {
                    existing.setKeyClockId(request.getKeyClockId());
                    // Only set password if the user doesn't already have one.
                    // This prevents Google OAuth logins (which send a random UUID
                    // as password) from overwriting a real email/password credential.
                    if ((existing.getPassword() == null || existing.getPassword().isBlank())
                            && request.getPassword() != null && !request.getPassword().isBlank()) {
                        existing.setPassword(request.getPassword());
                    }
                    existing.setFirstName(request.getFirstName());
                    existing.setLastName(request.getLastName());
                    return userRepo.save(existing);
                })
                .orElseGet(() -> {
                    User user = new User();
                    user.setEmail(request.getEmail());
                    user.setPassword(request.getPassword());
                    user.setKeyClockId(request.getKeyClockId());
                    user.setFirstName(request.getFirstName());
                    user.setLastName(request.getLastName());
                    return userRepo.save(user);
                });
        return toResponse(saved);
    }

    public UserResponse login(LoginRequest request) {
        User user = userRepo.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (user.getPassword() == null || !user.getPassword().equals(request.getPassword())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        return toResponse(user);
    }

    public Boolean existByUserId(String userId) {
        // userId here is the JPA @Id (the UUID we minted into the app JWT).
        // Validate against the primary key, not the keyClockId field.
        return userRepo.existsById(userId);
    }

    private UserResponse toResponse(User user) {
        UserResponse r = new UserResponse();
        r.setUserId(user.getUserId());
        r.setEmail(user.getEmail());
        r.setKeyClockId(user.getKeyClockId());
        r.setFirstName(user.getFirstName());
        r.setLastName(user.getLastName());
        r.setCreatedAt(user.getCreatedAt());
        r.setUpdatedAt(user.getUpdatedAt());
        return r;
    }
}
