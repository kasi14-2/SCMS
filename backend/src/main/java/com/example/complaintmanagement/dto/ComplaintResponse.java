package com.example.complaintmanagement.dto;

import com.example.complaintmanagement.entity.Complaint;
import com.example.complaintmanagement.entity.ComplaintAttachment;
import com.example.complaintmanagement.enums.ComplaintStatus;
import com.example.complaintmanagement.enums.Priority;

import java.time.Instant;
import java.util.List;

public record ComplaintResponse(
        Long id,
        String complaintNumber,
        String title,
        String description,
        ComplaintStatus status,
        Priority priority,
        Long departmentId,
        String departmentName,
        String submitterName,
        String submitterEmail,
        Instant createdAt,
        List<AttachmentInfo> attachments
) {
    public static ComplaintResponse from(Complaint complaint) {
        return new ComplaintResponse(
                complaint.getId(),
                complaint.getComplaintNumber(),
                complaint.getTitle(),
                complaint.getDescription(),
                complaint.getStatus(),
                complaint.getPriority(),
                complaint.getDepartment() == null ? null : complaint.getDepartment().getId(),
                complaint.getDepartment() == null ? null : complaint.getDepartment().getName(),
                complaint.getSubmittedBy().getFirstName() + " " + complaint.getSubmittedBy().getLastName(),
                complaint.getSubmittedBy().getEmail(),
                complaint.getCreatedAt(),
                complaint.getAttachments().stream().map(AttachmentInfo::from).toList()
        );
    }

    public record AttachmentInfo(Long id, String fileName, String fileType) {
        private static AttachmentInfo from(ComplaintAttachment attachment) {
            return new AttachmentInfo(attachment.getId(), attachment.getFileName(), attachment.getFileType());
        }
    }
}