package com.example.complaintmanagement.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "Username or email is required") String email,
        @NotBlank(message = "Password is required") String password
) {}
