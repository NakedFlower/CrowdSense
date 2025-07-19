package com.crowdsense.server.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class Scan {
    private int beaconId;
    private int timestamp;
    private String payload;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("BeaconID")
    public int getBeaconId() {
        return beaconId;
    }

    public void setBeaconId(int beaconId) {
        this.beaconId = beaconId;
    }

    @DynamoDbSortKey
    @DynamoDbAttribute("Timestamp")
    public int getTimestamp() {
        return timestamp;
    }

    public void setTimestamp(int timestamp) {
        this.timestamp = timestamp;
    }

    @DynamoDbAttribute("payload")
    public String getPayload() {
        return payload;
    }

    public void setPayload(String payload) {
        this.payload = payload;
    }
}
