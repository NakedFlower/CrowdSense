package com.crowdsense.server.service;

import java.util.List;

import com.crowdsense.server.dto.response.BeaconSummary;

public interface BeaconService {
    List<BeaconSummary> getBeaconIdsByGeo(double lat, double lon, String region, double radiusMeters, int limit);
    List<BeaconSummary> getBeaconIdsByName(String name, int limit);
    BeaconSummary getBeaconById(String id);
    double getCrowdAverage(String id, int minutes);
}
