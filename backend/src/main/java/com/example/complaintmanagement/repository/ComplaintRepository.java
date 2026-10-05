package com.example.complaintmanagement.repository;

import com.example.complaintmanagement.entity.Complaint;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.ComplaintStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {
    List<Complaint> findBySubmittedBy(User user);
    Page<Complaint> findBySubmittedBy(User user, Pageable pageable);
    Page<Complaint> findByStatus(ComplaintStatus status, Pageable pageable);
    List<Complaint> findByAssignedTo(User user);
}
