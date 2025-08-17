package com.crowdsense.server.service;

import java.util.List;

import com.crowdsense.server.dto.response.BeaconSummary;
import com.crowdsense.server.dto.response.CrowdStatResponse;

public interface BeaconService {
    List<BeaconSummary> getBeaconIdsByGeo(double lat, double lon, String region, double radiusMeters, int limit);
    List<BeaconSummary> getBeaconIdsByName(String name, boolean strict, int limit);
    List<BeaconSummary> getBeaconIdsByRegion(String region, int limit);
    BeaconSummary getBeaconById(String id);
    double getCrowdAverage(String id, int minutes);
    CrowdStatResponse getCrowdStat(String id, int periodDays);
}
