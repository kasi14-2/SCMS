package com.example.complaintmanagement.service;

import com.example.complaintmanagement.entity.Notification;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.dto.NotificationResponse;
import com.example.complaintmanagement.repository.NotificationRepository;
import com.example.complaintmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import jakarta.mail.MessagingException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.ConcurrentMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;
    private final ConcurrentMap<Long, CopyOnWriteArrayList<SseEmitter>> subscribers = new ConcurrentHashMap<>();

    @Value("${spring.mail.password:}")
    private String mailPassword;

    @Value("${app.mail.from:pkasivivek57@gmail.com}")
    private String fromAddress;

    public Notification createNotification(String email, String title, String message) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setTitle(title);
        notification.setMessage(message);

        return notificationRepository.save(notification);
    }

    public List<Notification> getUserNotifications(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + email));
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public SseEmitter subscribe(Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        subscribers.computeIfAbsent(userId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable remove = () -> removeSubscriber(userId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(error -> remove.run());
        try {
            emitter.send(SseEmitter.event().comment("connected"));
        } catch (IOException exception) {
            remove.run();
            emitter.completeWithError(exception);
        }
        return emitter;
    }

    public void notifyComplaintUpdate(User user, String title, String message, String complaintNumber,
                                      String status, String department) {
        Notification notification = createNotification(user.getEmail(), title, message);
        try {
            publish(user.getId(), NotificationResponse.from(notification));
        } catch (RuntimeException exception) {
            log.warn("Could not publish live notification for {}", complaintNumber, exception);
        }
        if (mailPassword.isBlank()) {
            log.warn("Email notification for {} was not sent because MAIL_PASSWORD is not configured", complaintNumber);
            return;
        }

        try {
            var mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, StandardCharsets.UTF_8.name());
            helper.setFrom(fromAddress);
            helper.setTo(user.getEmail());
            helper.setSubject(title + " | " + complaintNumber);
            helper.setText(message, buildHtml(title, message, complaintNumber, status, department));
            mailSender.send(mimeMessage);
        } catch (MessagingException | MailException exception) {
            log.error("Could not email complaint update for {} to {}", complaintNumber, user.getEmail(), exception);
        }
    }

    private void publish(Long userId, NotificationResponse notification) {
        List<SseEmitter> userSubscribers = subscribers.get(userId);
        if (userSubscribers == null) return;

        for (SseEmitter emitter : userSubscribers) {
            try {
                emitter.send(SseEmitter.event().name("notification").data(notification));
            } catch (Exception exception) {
                removeSubscriber(userId, emitter);
                try {
                    emitter.completeWithError(exception);
                } catch (RuntimeException ignored) {
                    // The client may have completed the stream while the event was being sent.
                }
            }
        }
    }

    private void removeSubscriber(Long userId, SseEmitter emitter) {
        subscribers.computeIfPresent(userId, (id, userSubscribers) -> {
            userSubscribers.remove(emitter);
            return userSubscribers.isEmpty() ? null : userSubscribers;
        });
    }

    private String buildHtml(String title, String message, String complaintNumber, String status, String department) {
        return """
                <!doctype html><html><body style="margin:0;background:#f2f5f7;font-family:Arial,sans-serif;color:#172b2a;padding:28px 12px">
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0"><tr><td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#fff;border:1px solid #dce5e2;border-radius:8px;overflow:hidden">
                <tr><td style="background:#153f3b;color:#fff;padding:26px 30px"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#b4d9cf">SCMS · Service desk</div><h1 style="font-size:22px;margin:10px 0 0">%s</h1></td></tr>
                <tr><td style="padding:28px 30px"><p style="font-size:15px;line-height:1.6;margin:0 0 22px">%s</p>
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;border:1px solid #dce5e2">
                <tr><td style="padding:12px 14px;background:#f4f8f6;color:#667775;width:38%%">Reference</td><td style="padding:12px 14px;font-weight:bold">%s</td></tr>
                <tr><td style="padding:12px 14px;border-top:1px solid #dce5e2;background:#f4f8f6;color:#667775">Status</td><td style="padding:12px 14px;border-top:1px solid #dce5e2">%s</td></tr>
                <tr><td style="padding:12px 14px;border-top:1px solid #dce5e2;background:#f4f8f6;color:#667775">Department</td><td style="padding:12px 14px;border-top:1px solid #dce5e2">%s</td></tr>
                </table><p style="font-size:12px;color:#7b8987;line-height:1.5;margin:24px 0 0">This is an automated update from the Smart Complaint Management System. Keep your reference number for future enquiries.</p></td></tr>
                </table></td></tr></table></body></html>
                """.formatted(escape(title), escape(message), escape(complaintNumber), escape(status), escape(department));
    }

    private String escape(String value) {
        return value == null ? "-" : value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#39;");
    }
}
