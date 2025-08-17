package com.crowdsense.server.repository;

import com.crowdsense.server.model.Scan;
import com.crowdsense.server.repository.ScanRepository.ScanPoint;

import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.*;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.services.dynamodb.model.QueryRequest;
import software.amazon.awssdk.services.dynamodb.model.QueryResponse;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Repository
public class ScanRepository {

    private final DynamoDbEnhancedClient enhanced;
    private final DynamoDbClient raw;
    private final DynamoDbTable<Scan> table;

    public static record ScanPoint(long timestamp, Integer count) {}

    public ScanRepository(DynamoDbEnhancedClient enhanced, DynamoDbClient raw) {
        this.enhanced = enhanced;
        this.raw = raw;
        this.table = enhanced.table("ScanTable", TableSchema.fromBean(Scan.class));
    }

    public List<Scan> queryBetween(String id, long from, long to) {
        Key startKey = Key.builder().partitionValue(id).sortValue(from).build();
        Key endKey = Key.builder().partitionValue(id).sortValue(to).build();

        List<Scan> result = new ArrayList<>();

        table.query(r -> r.queryConditional(QueryConditional.sortBetween(startKey, endKey)))
             .items().forEach(result::add);

        return result;
    }

    public List<ScanPoint> queryBetweenProjected(String id, long from, long to) {
        Map<String, String> names = new HashMap<>();
        names.put("#id", "Id");
        names.put("#ts", "Timestamp");
        names.put("#ct", "Count");

        Map<String, AttributeValue> values = new HashMap<>();
        values.put(":idVal", AttributeValue.builder().s(id).build());
        values.put(":fromVal", AttributeValue.builder().n(Long.toString(from)).build());
        values.put(":toVal", AttributeValue.builder().n(Long.toString(to)).build());

        QueryRequest req = QueryRequest.builder()
                .tableName("ScanTable")
                .keyConditionExpression("#id = :idVal AND #ts BETWEEN :fromVal AND :toVal")
                .expressionAttributeNames(names)
                .expressionAttributeValues(values)
                .projectionExpression("#ts, #ct")
                .build();

        QueryResponse resp = raw.query(req);

        return resp.items().stream().map(item -> {
            long ts = Long.parseLong(item.get("Timestamp").n());
            AttributeValue ctAttr = item.get("Count");
            Integer ct = (ctAttr == null || ctAttr.n() == null) ? null : Integer.valueOf(ctAttr.n());
            return new ScanPoint(ts, ct);
        }).collect(Collectors.toList());
    }
}
