package com.fitness.activitystatus.Controller;

import com.fitness.activitystatus.Dto.Activityrequest;
import com.fitness.activitystatus.Dto.ActivityResponse;
import com.fitness.activitystatus.Service.ActivityService;
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
    public ResponseEntity<ActivityResponse> trackActivity(
            @RequestHeader(value = "X-User-ID", required = false) String userId,
            @RequestBody Activityrequest request
    ) {
        if (request.getUserId() == null || request.getUserId().isBlank()) {
            request.setUserId(userId);
        }
        return ResponseEntity.ok(activityService.trackActivity(request));
    }

    @GetMapping
    public ResponseEntity<List<ActivityResponse>> giveActivity(@RequestHeader("X-User-ID") String userId) {
        return ResponseEntity.ok(activityService.giveActivity(userId));
    }
}
