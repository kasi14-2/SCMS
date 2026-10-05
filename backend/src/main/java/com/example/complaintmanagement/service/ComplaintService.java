package com.example.complaintmanagement.service;

import com.example.complaintmanagement.dto.ComplaintRequest;
import com.example.complaintmanagement.entity.ComplaintAttachment;
import com.example.complaintmanagement.entity.Category;
import com.example.complaintmanagement.entity.Complaint;
import com.example.complaintmanagement.entity.Department;
import com.example.complaintmanagement.entity.Subcategory;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.ComplaintStatus;
import com.example.complaintmanagement.enums.Priority;
import com.example.complaintmanagement.exception.BadRequestException;
import com.example.complaintmanagement.exception.ResourceNotFoundException;
import com.example.complaintmanagement.repository.CategoryRepository;
import com.example.complaintmanagement.repository.ComplaintRepository;
import com.example.complaintmanagement.repository.DepartmentRepository;
import com.example.complaintmanagement.repository.SubcategoryRepository;
import com.example.complaintmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class ComplaintService {

    private final ComplaintRepository complaintRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
        private final CategoryRepository categoryRepository;
        private final SubcategoryRepository subcategoryRepository;
        private final NotificationService notificationService;

        @Value("${app.upload.directory:./uploads}")
        private String uploadDirectory;

    public Complaint createComplaint(ComplaintRequest request, String currentUserEmail) {
        return createComplaint(request, currentUserEmail, List.of());
        }

        public Complaint createComplaint(ComplaintRequest request, String currentUserEmail, List<MultipartFile> files) {
        User user = userRepository.findByEmail(currentUserEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Department department = request.departmentId() == null ? null : departmentRepository.findById(request.departmentId())
            .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        Category category = request.categoryId() == null ? null : categoryRepository.findById(request.categoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
        Subcategory subcategory = request.subcategoryId() == null ? null : subcategoryRepository.findById(request.subcategoryId())
            .orElseThrow(() -> new ResourceNotFoundException("Subcategory not found"));

        Complaint complaint = new Complaint();
        complaint.setComplaintNumber("CMP-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        complaint.setTitle(request.title());
        complaint.setDescription(request.description());
        complaint.setPriority(request.priority() != null ? request.priority() : Priority.MEDIUM);
        complaint.setStatus(ComplaintStatus.SUBMITTED);
        complaint.setSubmittedBy(user);
        complaint.setDepartment(department);
        complaint.setCategory(category);
        complaint.setSubcategory(subcategory);
        complaint.setLandmark(request.landmark());
        complaint.setLatitude(request.latitude());
        complaint.setLongitude(request.longitude());
        complaint.setAnonymous(request.anonymous());
        complaint.setResponseDeadline(Instant.now().plusSeconds(86400));
        complaint.setResolutionDeadline(Instant.now().plusSeconds(604800));

        for (MultipartFile file : files) {
            if (!file.isEmpty()) {
                complaint.getAttachments().add(storeAttachment(file, complaint));
            }
        }

        return complaintRepository.save(complaint);
    }

    @Transactional(readOnly = true)
    public Page<Complaint> getComplaints(Pageable pageable, User viewer, boolean admin) {
        return admin ? complaintRepository.findAll(pageable) : complaintRepository.findBySubmittedBy(viewer, pageable);
    }

    @Transactional(readOnly = true)
    public Complaint getComplaintById(Long id, User viewer, boolean admin) {
        Complaint complaint = findComplaint(id);
        if (!admin && !complaint.getSubmittedBy().getId().equals(viewer.getId())) {
            throw new ResourceNotFoundException("Complaint not found with id: " + id);
        }
        return complaint;
    }

    public Complaint updateComplaintStatus(Long complaintId, ComplaintStatus status) {
        Complaint complaint = findComplaint(complaintId);
        if (status == null) {
            throw new BadRequestException("Status is required");
        }
        if (!List.of(ComplaintStatus.ASSIGNED, ComplaintStatus.IN_PROGRESS, ComplaintStatus.RESOLVED,
                ComplaintStatus.REJECTED).contains(status)) {
            throw new BadRequestException("Status must be Assigned, In Progress, Success, or Rejected");
        }
        complaint.setStatus(status);
        if (status == ComplaintStatus.RESOLVED) {
            complaint.setResolvedAt(Instant.now());
        }
        if (status == ComplaintStatus.CLOSED) {
            complaint.setClosedAt(Instant.now());
        }
        Complaint saved = complaintRepository.save(complaint);
        notifySubmitter(saved, "Complaint status updated", "Your complaint status is now " + status.name().replace('_', ' ') + ".");
        return saved;
    }

    public Complaint assignComplaint(Long complaintId, Long departmentId) {
        Complaint complaint = findComplaint(complaintId);
        Department department = departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found"));
        complaint.setDepartment(department);
        complaint.setStatus(ComplaintStatus.ASSIGNED);
        Complaint saved = complaintRepository.save(complaint);
        notifySubmitter(saved, "Complaint assigned", "Your complaint has been assigned to " + department.getName() + ".");
        return saved;
    }

    @Transactional(readOnly = true)
    public Path getAttachmentPath(Long complaintId, Long attachmentId, User viewer, boolean admin) {
        Complaint complaint = getComplaintById(complaintId, viewer, admin);
        ComplaintAttachment attachment = complaint.getAttachments().stream()
                .filter(candidate -> candidate.getId().equals(attachmentId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Attachment not found"));
        Path root = Path.of(uploadDirectory).toAbsolutePath().normalize();
        Path file = root.resolve(attachment.getFileUrl()).normalize();
        if (!file.startsWith(root) || !Files.isRegularFile(file)) {
            throw new ResourceNotFoundException("Attachment not found");
        }
        return file;
    }

    private Complaint findComplaint(Long id) {
        return complaintRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Complaint not found with id: " + id));
    }

    private ComplaintAttachment storeAttachment(MultipartFile file, Complaint complaint) {
        String contentType = file.getContentType();
        if (!List.of("image/jpeg", "image/png", "image/webp", "application/pdf").contains(contentType)) {
            throw new BadRequestException("Only JPEG, PNG, WebP, and PDF attachments are supported");
        }

        String originalName = file.getOriginalFilename() == null ? "attachment" : file.getOriginalFilename();
        String safeName = Path.of(originalName.replace('\\', '/')).getFileName().toString();
        String extension = safeName.lastIndexOf('.') >= 0 ? safeName.substring(safeName.lastIndexOf('.')) : "";
        String storedName = UUID.randomUUID() + extension;
        Path directory = Path.of(uploadDirectory).toAbsolutePath().normalize();
        try {
            Files.createDirectories(directory);
            file.transferTo(directory.resolve(storedName));
        } catch (IOException exception) {
            throw new BadRequestException("The attachment could not be stored");
        }

        ComplaintAttachment attachment = new ComplaintAttachment();
        attachment.setComplaint(complaint);
        attachment.setFileName(safeName);
        attachment.setFileType(contentType);
        attachment.setFileUrl(storedName);
        return attachment;
    }

    private void notifySubmitter(Complaint complaint, String title, String message) {
        String department = complaint.getDepartment() == null ? "Not assigned" : complaint.getDepartment().getName();
        notificationService.notifyComplaintUpdate(complaint.getSubmittedBy(), title, message,
                complaint.getComplaintNumber(), complaint.getStatus().name().replace('_', ' '), department);
    }
}
