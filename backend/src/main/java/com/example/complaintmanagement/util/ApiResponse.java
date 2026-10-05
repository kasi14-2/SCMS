package com.example.complaintmanagement.util;

import java.time.Instant;

public record ApiResponse<T>(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        T data
) {
    public static <T> ApiResponse<T> success(String path, T data) {
        return new ApiResponse<>(Instant.now(), 200, null, "Success", path, data);
    }

    public static <T> ApiResponse<T> created(String path, T data) {
        return new ApiResponse<>(Instant.now(), 201, null, "Created", path, data);
    }
}
