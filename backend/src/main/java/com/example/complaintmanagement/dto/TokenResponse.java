package com.example.complaintmanagement.dto;

import java.util.List;

public record TokenResponse(String accessToken, String refreshToken, String tokenType, Long expiresIn, List<String> roles) {
    public static TokenResponse of(String accessToken, String refreshToken, Long expiresIn, List<String> roles) {
        return new TokenResponse(accessToken, refreshToken, "Bearer", expiresIn, roles);
    }
}
