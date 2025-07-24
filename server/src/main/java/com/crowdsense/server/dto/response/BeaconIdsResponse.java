package com.crowdsense.server.dto.response;

import java.util.List;

public class BeaconIdsResponse {
    private List<String> ids;

    public BeaconIdsResponse(List<String> ids) { this.ids = ids; }
    public List<String> getIds() { return ids; }
}
