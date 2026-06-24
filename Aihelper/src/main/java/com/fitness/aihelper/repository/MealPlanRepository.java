package com.fitness.aihelper.repository;

import com.fitness.aihelper.model.MealPlan;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface MealPlanRepository extends MongoRepository<MealPlan, String> {

    /** All plans for a user, newest first is handled by the service layer sort. */
    List<MealPlan> findByUserId(String userId);
}
