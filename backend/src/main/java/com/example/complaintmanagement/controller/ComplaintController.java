package com.example.complaintmanagement.controller;

import com.example.complaintmanagement.dto.ComplaintRequest;
import com.example.complaintmanagement.dto.ComplaintResponse;
import com.example.complaintmanagement.entity.Complaint;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.ComplaintStatus;
import com.example.complaintmanagement.enums.Priority;
import com.example.complaintmanagement.service.ComplaintService;
import com.example.complaintmanagement.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.util.List;

@RestController
@RequestMapping("/api/complaints")
@RequiredArgsConstructor
public class ComplaintController {

    private final ComplaintService complaintService;
    private final UserService userService;

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ComplaintResponse> createComplaint(@Valid @RequestBody ComplaintRequest request) {
        return ResponseEntity.ok(ComplaintResponse.from(
                complaintService.createComplaint(request, userService.getCurrentUser().getEmail())));
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ComplaintResponse> createComplaintWithAttachments(
            @RequestParam String title,
            @RequestParam String description,
            @RequestParam(defaultValue = "MEDIUM") Priority priority,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) Long subcategoryId,
            @RequestParam(required = false) String landmark,
            @RequestParam(required = false) Double latitude,
            @RequestParam(required = false) Double longitude,
            @RequestPart(value = "files", required = false) List<MultipartFile> files) {
        ComplaintRequest request = new ComplaintRequest(title, description, priority, categoryId, subcategoryId,
                null, landmark, latitude, longitude, false);
        return ResponseEntity.ok(ComplaintResponse.from(complaintService.createComplaint(
                request, userService.getCurrentUser().getEmail(), files == null ? List.of() : files)));
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Page<ComplaintResponse>> getComplaints(Pageable pageable) {
        User viewer = userService.getCurrentUser();
        return ResponseEntity.ok(complaintService.getComplaints(pageable, viewer, isAdmin(viewer))
                .map(ComplaintResponse::from));
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ComplaintResponse> getComplaintById(@PathVariable Long id) {
        User viewer = userService.getCurrentUser();
        return ResponseEntity.ok(ComplaintResponse.from(
                complaintService.getComplaintById(id, viewer, isAdmin(viewer))));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> updateStatus(@PathVariable Long id, @RequestParam ComplaintStatus status) {
        return ResponseEntity.ok(ComplaintResponse.from(complaintService.updateComplaintStatus(id, status)));
    }

    @PatchMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    public ResponseEntity<ComplaintResponse> assignDepartment(@PathVariable Long id, @RequestParam Long departmentId) {
        return ResponseEntity.ok(ComplaintResponse.from(complaintService.assignComplaint(id, departmentId)));
    }

    @GetMapping("/{id}/attachments/{attachmentId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Resource> getAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        User viewer = userService.getCurrentUser();
        Path path = complaintService.getAttachmentPath(id, attachmentId, viewer, isAdmin(viewer));
        FileSystemResource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(path.getFileName().toString()).build().toString())
                .body(resource);
    }

    private boolean isAdmin(User user) {
        return user.getRoles().stream().anyMatch(role -> role.getName().name().equals("ADMIN")
                || role.getName().name().equals("SUPER_ADMIN"));
    }
}
