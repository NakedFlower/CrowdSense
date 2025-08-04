package com.crowdsense.server.dto.response;

import java.util.List;

public class BeaconIdsResponse {
    private List<BeaconSummary> ids;

    public BeaconIdsResponse(List<BeaconSummary> ids) { this.ids = ids; }
    public List<BeaconSummary> getIds() { return ids; }
}
