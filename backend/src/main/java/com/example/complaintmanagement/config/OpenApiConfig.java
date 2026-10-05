package com.example.complaintmanagement.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI complaintManagementOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("Smart Complaint Management System API")
                        .description("Complaint registration, workflow, SLA management, and reporting APIs")
                        .version("1.0.0"));
    }
}
