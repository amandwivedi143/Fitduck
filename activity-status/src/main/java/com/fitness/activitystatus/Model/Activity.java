package com.fitness.activitystatus.Model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.annotation.LastModifiedDate;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Document(collection = "activities")
public class Activity{
   @Id
    private String id;
    private String userid;
    private  ActivityType type;
    private Integer duration;
    private Integer caloriesburned;
    private LocalDate startTime;
    @Field("metrices")
    private Map<String , Object> addtionalMetrics;

    @CreatedDate
    private LocalDateTime createdAt;
    @LastModifiedDate
    private  LocalDateTime updatedAt;

}
