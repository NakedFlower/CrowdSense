package com.crowdsense.server.dto.request;

public class BeaconRegionRequest {
    private String region;
    private int limit = 10;

    public String getRegion() { return region; }
    public void setRegion(String region) { this.region = region; }

    public int getLimit() { return limit; }
    public void setLimit(int limit) { this.limit = limit; }
}
