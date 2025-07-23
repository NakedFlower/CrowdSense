package com.crowdsense.server;

import com.crowdsense.server.model.Information;
import com.crowdsense.server.dto.ApiResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.ArrayList;
import java.util.List;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;

@Controller
public class ApiController {
    private final DynamoDbEnhancedClient enhancedClient;

    public ApiController(DynamoDbEnhancedClient enhancedClient) {
        this.enhancedClient = enhancedClient;
    }

    @GetMapping("/request")
    public ResponseEntity<ApiResponse<List<Information>>> getInformationList() {
        DynamoDbTable<Information> table = enhancedClient.table("InformationTable", TableSchema.fromBean(Information.class));

        List<Information> items = new ArrayList<>();
        table.scan().items().forEach(items::add);

        ApiResponse<List<Information>> body = new ApiResponse<>(200, items);

        return ResponseEntity.ok(body);
    }
}
