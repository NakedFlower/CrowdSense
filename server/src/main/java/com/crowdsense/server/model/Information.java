package com.crowdsense.server.model;

import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbAttribute;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbBean;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSecondaryPartitionKey;
import software.amazon.awssdk.enhanced.dynamodb.mapper.annotations.DynamoDbSortKey;

@DynamoDbBean
public class Information {
    private String id; // Partition Key
    private String type; // Sort Key

    private String name;
    private Double latitude;
    private Double longitude;
    private Integer radius;

    @DynamoDbPartitionKey
    @DynamoDbAttribute("Id")
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @DynamoDbSecondaryPartitionKey(indexNames = "Type-index")
    @DynamoDbSortKey
    @DynamoDbAttribute("Type")
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }

    @DynamoDbSecondaryPartitionKey(indexNames = "Name-index")
    @DynamoDbAttribute("Name")
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }

    @DynamoDbAttribute("Latitude")
    public Double getLatitude() { return latitude; }
    public void setLatitude(Double latitude) { this.latitude = latitude; }

    @DynamoDbAttribute("Longitude")
    public Double getLongitude() { return longitude; }
    public void setLongitude(Double longitude) { this.longitude = longitude; }

    @DynamoDbAttribute("Radius")
    public Integer getRadius() { return radius; }
    public void setRadius(Integer radius) { this.radius = radius; }
}