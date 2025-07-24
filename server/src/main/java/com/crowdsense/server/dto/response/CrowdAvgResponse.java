package com.crowdsense.server.dto.response;

public class CrowdAvgResponse {
    private double avg;

    public CrowdAvgResponse(double avg) { this.avg = avg; }
    public double getAvg() { return avg; }
}
