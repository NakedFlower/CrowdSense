package com.crowdsense.server.dto.request;

public class BeaconGeoRequest {
    private double lat;
    private double lon;
    private String region;
    private double rad = 10.0;
    private int limit = 10;

    public double getLat() { return lat; }
    public void setLat(double lat) { this.lat = lat; }

    public double getLon() { return lon; }
    public void setLon(double lon) { this.lon = lon; }

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public double getRad() { return rad; }
    public void setRad(double rad) { this.rad = rad; }

    public int getLimit() { return limit; }
    public void setLimit(int limit) { this.limit = limit; }
}
