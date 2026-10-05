package com.example.complaintmanagement.controller;

import com.example.complaintmanagement.entity.Notification;
import com.example.complaintmanagement.dto.NotificationResponse;
import com.example.complaintmanagement.service.NotificationService;
import com.example.complaintmanagement.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;
    private final UserService userService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    @PreAuthorize("isAuthenticated()")
    public SseEmitter streamNotifications() {
        return notificationService.subscribe(userService.getCurrentUser().getId());
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<NotificationResponse>> getUserNotifications() {
        return ResponseEntity.ok(notificationService.getUserNotifications(userService.getCurrentUser().getEmail())
                .stream().map(NotificationResponse::from).toList());
    }
}
