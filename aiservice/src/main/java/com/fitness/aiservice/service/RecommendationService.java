package com.fitness.aiservice.service;

import com.fitness.aiservice.model.Recommendation;
import com.fitness.aiservice.repository.RecommendationRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class RecommendationService {
    @Autowired
    private RecommendationRepository recommendationrepo;
    public  List<Recommendation> getUserRecommendation(String userId) {
return recommendationrepo.findByUserId(userId);
    }

    public Recommendation getActivityRecommendation(String activityId) {

    return recommendationrepo.findByActivityId(activityId).
            orElseThrow(()->new RuntimeException("No recommendation found"));
    }
}
