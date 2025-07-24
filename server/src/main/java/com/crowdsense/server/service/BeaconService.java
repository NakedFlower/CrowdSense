package com.crowdsense.server.service;

import java.util.List;

public interface BeaconService {
    List<String> getBeaconIdsByGeo(double lat, double lon, String region, double radiusMeters, int limit);
    List<String> getBeaconIdsByName(String name, int limit);
    double getCrowdAverage(String id, int minutes);
}
