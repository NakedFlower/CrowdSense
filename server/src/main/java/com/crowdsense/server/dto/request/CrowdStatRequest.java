package com.crowdsense.server.dto.request;

public class CrowdStatRequest {
    private String id;
    private int period = 1;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public int getPeriod() { return period; }
    public void setPeriod(int period) { this.period = period; }
}
