package com.example.complaintmanagement.dto;

import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.UserStatus;

import java.util.List;

public record UserResponse(Long id, String firstName, String lastName, String email, String phoneNumber, UserStatus status,
                          List<String> roles) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getFirstName(),
                user.getLastName(),
                user.getEmail(),
                user.getPhoneNumber(),
                user.getStatus(),
                user.getRoles().stream().map(role -> role.getName().name()).toList()
        );
    }
}
