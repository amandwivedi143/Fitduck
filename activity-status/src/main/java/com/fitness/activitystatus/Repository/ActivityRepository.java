package com.fitness.activitystatus.Repository;

import com.fitness.activitystatus.Model.Activity;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface ActivityRepository extends MongoRepository<Activity, String> {
    List<Activity> findByuserid(String userid);
}
