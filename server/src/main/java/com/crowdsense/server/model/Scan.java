package com.crowdsense.server.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class Scan {
    private String id; // Partition Key
    private Long timestamp; // Sort Key

    private Integer count;
    private Integer rssi;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("Id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @DynamoDbSortKey
    @DynamoDbAttribute("Timestamp")
    public Long getTimestamp() { return timestamp; }
    public void setTimestamp(Long timestamp) { this.timestamp = timestamp; }

    @DynamoDbAttribute("Count")
    public Integer getCount() { return count; }
    public void setCount(Integer count) { this.count = count; }

    @DynamoDbAttribute("RSSI")
    public Integer getRssi() { return rssi; }
    public void setRssi(Integer rssi) { this.rssi = rssi; }
}
