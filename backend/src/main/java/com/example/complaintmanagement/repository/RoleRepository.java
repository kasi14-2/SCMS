package com.example.complaintmanagement.repository;

import com.example.complaintmanagement.entity.Role;
import com.example.complaintmanagement.enums.RoleName;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RoleRepository extends JpaRepository<Role, Long> {
    Optional<Role> findByName(RoleName name);
}
