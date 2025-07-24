package com.crowdsense.server.dto.request;

public class CrowdAvgRequest {
    private String id;
    private int time = 1;

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public int getTime() { return time; }
    public void setTime(int time) { this.time = time; }
}
