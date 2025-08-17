package com.crowdsense.server.dto.response;

import java.util.List;

public class CrowdStatResponse {
    private List<Double> list;
    private long start;

    public CrowdStatResponse(List<Double> list, long start) {
        this.list = list;
        this.start = start;
    }

    public List<Double> getList() { return list; }
    public long getStart() { return start; }
}
