package com.crowdsense.server.controller;

import com.crowdsense.server.dto.ApiResponse;
import com.crowdsense.server.dto.response.BeaconIdsResponse;
import com.crowdsense.server.dto.response.BeaconSummary;
import com.crowdsense.server.dto.response.CrowdAvgResponse;
import com.crowdsense.server.service.BeaconService;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping(produces = "application/json")
public class ApiController {

    private static final int MAX_LIMIT = 25;
    private static final int MAX_TIME_MINUTES = 30;

    private final BeaconService beaconService;

    public ApiController(BeaconService beaconService) {
        this.beaconService = beaconService;
    }

    @RequestMapping(value = "/beacon_geo", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<ApiResponse<BeaconIdsResponse>> beaconGeo(
            @RequestParam double lat,
            @RequestParam double lon,
            @RequestParam String region,
            @RequestParam(defaultValue = "10") double rad,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int lim = Math.min(limit, MAX_LIMIT);
        List<BeaconSummary> items = beaconService.getBeaconIdsByGeo(lat, lon, region, rad, lim);
        BeaconIdsResponse payload = new BeaconIdsResponse(items);

        return ResponseEntity.ok(new ApiResponse<BeaconIdsResponse>(200, payload));
    }

    @RequestMapping(value = "/beacon_name", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<ApiResponse<BeaconIdsResponse>> beaconName(
            @RequestParam String name,
            @RequestParam(defaultValue = "10") int limit
    ) {
        int lim = Math.min(limit, MAX_LIMIT);
        List<BeaconSummary> items = beaconService.getBeaconIdsByName(name, lim);
        BeaconIdsResponse payload = new BeaconIdsResponse(items);

        return ResponseEntity.ok(new ApiResponse<BeaconIdsResponse>(200, payload));
    }

    @RequestMapping(value = "/crowd_avg", method = {RequestMethod.GET, RequestMethod.POST})
    public ResponseEntity<ApiResponse<CrowdAvgResponse>> crowdAvg(
            @RequestParam String id,
            @RequestParam(defaultValue = "5") int time
    ) {
        int minutes = Math.min(time, MAX_TIME_MINUTES);
        double avg = beaconService.getCrowdAverage(id, minutes);
        return ResponseEntity.ok(new ApiResponse<>(200, new CrowdAvgResponse(avg)));
    }
}
