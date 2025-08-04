package com.crowdsense.server.dto.response;

import com.crowdsense.server.model.Information;
import com.fasterxml.jackson.annotation.JsonProperty;

public class BeaconSummary {
    private final String id;
    private final String name;
    private final String type;
    private final Double lat;
    private final Double lon;
    private final Integer radius;

    public BeaconSummary(String id, String name, String type, Double lat, Double lon, Integer radius) {
        this.id = id;
        this.name = name;
        this.type = type;
        this.lat = lat;
        this.lon = lon;
        this.radius = radius;
    }

    public String getId()   { return id; }
    public String getName() { return name; }
    public String getType() { return type; }

    @JsonProperty("lat")
    public Double getLat() { return lat; }

    @JsonProperty("lon")
    public Double getLon() { return lon; }

    @JsonProperty("radius")
    public Integer getRadius() { return radius; }

    public static BeaconSummary from(Information i) {
        return new BeaconSummary(
            i.getId(),
            i.getName(),
            i.getType(),
            i.getLatitude(),
            i.getLongitude(),
            i.getRadius()
        );
    }
}
