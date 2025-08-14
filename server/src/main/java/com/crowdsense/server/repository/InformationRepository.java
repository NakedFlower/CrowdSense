package com.crowdsense.server.repository;

import com.crowdsense.server.model.Information;
import org.springframework.stereotype.Repository;

import software.amazon.awssdk.core.pagination.sync.SdkIterable;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.QueryConditional;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;
import software.amazon.awssdk.enhanced.dynamodb.model.Page;

import java.util.ArrayList;
import java.util.List;

@Repository
public class InformationRepository {

    private final DynamoDbEnhancedClient client;
    private final DynamoDbTable<Information> table;
    private final DynamoDbIndex<Information> nameIndex;
    private final DynamoDbIndex<Information> typeIndex;

    public InformationRepository(DynamoDbEnhancedClient client) {
        this.client = client;
        this.table = client.table("InformationTable", TableSchema.fromBean(Information.class));
        this.nameIndex = table.index("Name-index");
        this.typeIndex = table.index("Type-index");
    }

    public List<Information> queryByName(String name, int limit) {
        Expression filter = Expression.builder()
                .expression("contains(#n, :term)")
                .putExpressionName("#n", "Name")
                .putExpressionValue(":term", AttributeValue.builder().s(name).build())
                .build();

        List<Information> result = new ArrayList<>();
        
        SdkIterable<Page<Information>> pages = nameIndex.scan(r -> r
                .filterExpression(filter)
                .limit(limit * 5)
        );

        for (Page<Information> p : pages) {
            for (Information item : p.items()) {
                result.add(item);
                if (result.size() >= limit) break;
            }
            if (result.size() >= limit) break;
        }
        return result;
    }

    public List<Information> queryByRegion(String region, int limit) {
        Key key = Key.builder().partitionValue(region).build();
        List<Information> result = new ArrayList<>();

        SdkIterable<Page<Information>> pages = typeIndex.query(r -> r
                .queryConditional(QueryConditional.keyEqualTo(key))
                .limit(limit * 5)
        );

        for (Page<Information> p : pages) {
            for (Information item : p.items()) {
                result.add(item);
            }
        }
        return result;
    }
    
    public Information queryById(String id) {
        Key key = Key.builder().partitionValue(id).build();

        SdkIterable<Page<Information>> pages = table.query(r -> r
                .queryConditional(QueryConditional.keyEqualTo(key))
                .limit(1)
        );

        for (Page<Information> p : pages) {
            for (Information item : p.items()) {
                return item;
            }
        }
        return null;
    }
}
