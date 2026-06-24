package com.fitness.aihelper.repository;

import com.fitness.aihelper.model.WorkoutPlan;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface WorkoutPlanRepository extends MongoRepository<WorkoutPlan, String> {
    List<WorkoutPlan> findByUserId(String userId);
}
