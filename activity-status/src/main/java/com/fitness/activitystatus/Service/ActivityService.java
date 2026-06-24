package com.fitness.activitystatus.Service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.fitness.activitystatus.Dto.ActivityResponse;
import com.fitness.activitystatus.Dto.Activityrequest;
import com.fitness.activitystatus.Model.Activity;
import com.fitness.activitystatus.Repository.ActivityRepository;
import com.fitness.activitystatus.UserValidationService;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;
@Slf4j
@Service
@NoArgsConstructor
public class ActivityService {
@Autowired
    private  ActivityRepository activityrepo;
@Autowired
private UserValidationService userValidationService;
@Autowired
private RabbitTemplate rabbitTemplate;
// Register JavaTimeModule so LocalDateTime (startTime/createdAt/updatedAt)
// serializes to ISO strings the consumer can parse.
private final ObjectMapper objectMapper = new ObjectMapper()
        .registerModule(new JavaTimeModule())
        .configure(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS, false);
@Value("${rabbitmq.exchange.name}")
private String exchange;
    @Value("${rabbitmq.queue.name}")
    private String queue;
    @Value("${rabbitmq.routing.key}")
 private String routingKey;


    public ActivityResponse trackActivity(Activityrequest request) {
        boolean isValidUser =userValidationService.validation(request.getUserId());
        if(!isValidUser){
            throw new RuntimeException("Invalid User: "+request.getUserId());
        }
            Activity activity=Activity.builder()
                    .userId(request.getUserId())
                    .type(request.getType())
                    .duration(request.getDuration())
                    .startTime(request.getStartTime())
                    .additionalMetrics(request.getAdditionalMetrics())
                    .caloriesBurned(request.getCaloriesBurned())
                    .build();
        Activity savedActivity = activityrepo.save(activity);
       // publish to rabbitmq for the ai processing
       // Send a JSON STRING (not the object) so the consumer doesn't depend on our
       // class name via the __TypeId__ header. See RabbitMqConfig for rationale.
        try{
            String json = objectMapper.writeValueAsString(savedActivity);
            rabbitTemplate.convertAndSend(exchange, routingKey, json);
        }catch (Exception e){
            log.error("Failed to publish activity to RabbitMq : ",e);
        }
        return maptoActivity(savedActivity);
    }
    public ActivityResponse maptoActivity(Activity activity){
        ActivityResponse response= new ActivityResponse();
        response.setId(activity.getId());
        response.setUserId(activity.getUserId());
        response.setDuration(activity.getDuration());
        response.setCreatedAt(activity.getCreatedAt());
        response.setType(activity.getType());
        response.setCaloriesBurned(activity.getCaloriesBurned());
        response.setAdditionalMetrics(activity.getAdditionalMetrics());
        response.setStartTime(activity.getStartTime());
        response.setUpdatedAt(activity.getUpdatedAt());
        return response;
    }

    public List<ActivityResponse> giveActivity(String userId) {
        List<Activity> activities = activityrepo.findByuserId(userId);
        return activities.stream()
                .map(this::maptoActivity)
                .collect(Collectors.toList());
    }
}

