package com.fitness.activitystatus.Controller;

import com.fitness.activitystatus.Dto.Activityrequest;
import com.fitness.activitystatus.Dto.ActivityResponse;
import com.fitness.activitystatus.Service.ActivityService;
import lombok.NoArgsConstructor;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RequiredArgsConstructor
@RestController
@RequestMapping("/api/activity")
public class ActivityController {
@Autowired
    private ActivityService activityService;
    @PostMapping
    public ResponseEntity<ActivityResponse> trackActivity(@RequestBody Activityrequest request){
        return ResponseEntity.ok(activityService.trackActivity(request));
    }
    @GetMapping
    public ResponseEntity<List<ActivityResponse>> giveActivity(@RequestHeader ("X-User-ID") String userid){
        return ResponseEntity.ok(activityService.giveActivity(userid));
    }
}
