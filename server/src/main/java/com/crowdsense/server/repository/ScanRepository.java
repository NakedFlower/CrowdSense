package com.crowdsense.server.repository;

import com.crowdsense.server.model.Scan;
import org.springframework.stereotype.Repository;
import software.amazon.awssdk.enhanced.dynamodb.*;
import software.amazon.awssdk.enhanced.dynamodb.model.*;

import java.util.ArrayList;
import java.util.List;

@Repository
public class ScanRepository {

    private final DynamoDbEnhancedClient client;
    private final DynamoDbTable<Scan> table;

    public ScanRepository(DynamoDbEnhancedClient client) {
        this.client = client;
        this.table = client.table("ScanTable", TableSchema.fromBean(Scan.class));
    }

    public List<Scan> queryBetween(String id, long from, long to) {
        Key startKey = Key.builder().partitionValue(id).sortValue(from).build();
        Key endKey = Key.builder().partitionValue(id).sortValue(to).build();

        List<Scan> result = new ArrayList<>();

        table.query(r -> r.queryConditional(QueryConditional.sortBetween(startKey, endKey)))
             .items().forEach(result::add);

        return result;
    }
}
