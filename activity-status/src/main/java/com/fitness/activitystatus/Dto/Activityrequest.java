package com.fitness.activitystatus.Dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import com.fitness.activitystatus.Model.ActivityType;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.Map;

@Data
public class Activityrequest {
private String userId;
private ActivityType type;
private LocalDateTime startTime;
private Integer duration;
@JsonAlias("caloriesburned")
private Integer caloriesBurned;


   @JsonAlias({"addtionalMetrices", "addtionalMetrics"})
   private Map<String ,Object> additionalMetrics ;

}
