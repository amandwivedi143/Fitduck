package com.fitness.userservice.Repository;

import com.fitness.userservice.Model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface Userrepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);

    Boolean existsByKeyClockId(String userId);
}
