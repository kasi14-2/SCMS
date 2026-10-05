package com.example.complaintmanagement.dto;

import com.example.complaintmanagement.enums.Priority;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record ComplaintRequest(
        @NotBlank(message = "Title is required") String title,
        @NotBlank(message = "Description is required") String description,
        @NotNull(message = "Priority is required") Priority priority,
        Long categoryId,
        Long subcategoryId,
        Long departmentId,
        String landmark,
        Double latitude,
        Double longitude,
        boolean anonymous
) {}
