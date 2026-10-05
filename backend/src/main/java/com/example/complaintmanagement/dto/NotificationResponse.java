package com.example.complaintmanagement.dto;

import com.example.complaintmanagement.entity.Notification;

import java.time.Instant;

public record NotificationResponse(Long id, String title, String message, boolean read, Instant createdAt) {
    public static NotificationResponse from(Notification notification) {
        return new NotificationResponse(notification.getId(), notification.getTitle(), notification.getMessage(),
                notification.isRead(), notification.getCreatedAt());
    }
}