package com.fitness.activitystatus.Service;

import com.fitness.activitystatus.Dto.ActivityResponse;
import com.fitness.activitystatus.Dto.Activityrequest;
import com.fitness.activitystatus.Model.Activity;
import com.fitness.activitystatus.Repository.ActivityRepository;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@NoArgsConstructor
public class ActivityService {
@Autowired
    private  ActivityRepository activityrepo;



    public ActivityResponse trackActivity(Activityrequest request) {

            Activity activity=Activity.builder()
                    .userid(request.getUserid())
                    .type(request.getType())
                    .duration(request.getDuration())
                    .startTime(request.getStartTime())
                    .addtionalMetrics(request.getAddtionalMetrices())
                    .caloriesburned(request.getCaloriesburned())
                    .build();
        Activity savedActivity = activityrepo.save(activity);
        return maptoActivity(savedActivity);
    }
    public ActivityResponse maptoActivity(Activity activity){
        ActivityResponse response= new ActivityResponse();
        response.setId(activity.getId());
        response.setUserid(activity.getUserid());
        response.setDuration(activity.getDuration());
        response.setCreatedAt(activity.getCreatedAt());
        response.setType(activity.getType());
        response.setCaloriesburned(activity.getCaloriesburned());
        response.setAddtionalMetrics(activity.getAddtionalMetrics());
        response.setStartTime(activity.getStartTime());
        return response;
    }

    public List<ActivityResponse> giveActivity(String userid) {
        List<Activity> activities = activityrepo.findByuserid(userid);
        return activities.stream()
                .map(this::maptoActivity)
                .collect(Collectors.toList());
    }
}

