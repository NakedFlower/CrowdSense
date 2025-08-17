package com.crowdsense.server.dto.request;

public class BeaconNameRequest {
    private String name;
    private int limit = 10;
    private boolean strict = false;
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public int getLimit() { return limit; }
    public void setLimit(int limit) { this.limit = limit; }

    public boolean isStrict() { return strict; }
    public void setStrict(boolean strict) { this.strict = strict; }
}
