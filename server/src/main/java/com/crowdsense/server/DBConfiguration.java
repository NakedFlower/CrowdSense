package com.crowdsense.server;

import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import io.github.cdimascio.dotenv.Dotenv;

import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.enhanced.dynamodb.DynamoDbEnhancedClient;
import software.amazon.awssdk.services.dynamodb.DynamoDbClient;
import software.amazon.awssdk.regions.Region;

@Configuration
public class DBConfiguration {
    private final Dotenv dotenv;

    public DBConfiguration() {
        this.dotenv = Dotenv.load();
    }

    private String getAccessKey() {
        return dotenv.get("AWS_ACCESS_KEY");
    }

    private String getSecretKey() {
        return dotenv.get("AWS_SECRET_KEY");
    }

    @Bean
    public DynamoDbClient dynamoDbClient() {
        return DynamoDbClient.builder()
            .region(Region.AP_NORTHEAST_2)
            .credentialsProvider(StaticCredentialsProvider.create(AwsBasicCredentials.create(this.getAccessKey(), this.getSecretKey())))
            .build();
    }

    @Bean
    public DynamoDbEnhancedClient dynamoDbEnhancedClient(@Qualifier("dynamoDbClient") DynamoDbClient dynamoDbClient) {
        return DynamoDbEnhancedClient.builder()
            .dynamoDbClient(dynamoDbClient)
            .build();
    }
}
