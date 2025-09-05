package com.fitness.activitystatus.Dto;

import com.fitness.activitystatus.Model.ActivityType;
import lombok.Data;

import java.time.LocalDate;
import java.util.Map;

@Data
public class Activityrequest {
private String userid;
private ActivityType type;
private LocalDate startTime;
private Integer duration;
private Integer caloriesburned;


   private Map<String ,Object> addtionalMetrices ;

}
