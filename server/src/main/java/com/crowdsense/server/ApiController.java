package com.crowdsense.server;

import com.crowdsense.server.model.Information;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;

import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbTable;
import software.amazon.awssdk.enhanced.dynamodb.TableSchema;
import software.amazon.awssdk.enhanced.dynamodb.model.ScanEnhancedRequest;

@Controller
public class ApiController {
    private final DynamoDbEnhancedClient enhancedClient;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public ApiController(DynamoDbEnhancedClient enhancedClient) {
        this.enhancedClient = enhancedClient;
    }

    @GetMapping("/request")
    @ResponseBody
    public String getInformationList() {

        try {
            DynamoDbTable<Information> table = enhancedClient.table("InformationTable", TableSchema.fromBean(Information.class));

            List<Information> items = new ArrayList<>();
            table.scan(ScanEnhancedRequest.builder().build())
                .items()
                .forEach(items::add);

            return objectMapper.writeValueAsString(items);
        } catch (JsonProcessingException e) {
            e.printStackTrace();
            return "fail";
        }
    }
}
