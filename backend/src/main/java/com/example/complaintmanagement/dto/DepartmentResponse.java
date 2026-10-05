package com.example.complaintmanagement.dto;

import com.example.complaintmanagement.entity.Department;

public record DepartmentResponse(Long id, String name, String description) {
    public static DepartmentResponse from(Department department) {
        return new DepartmentResponse(department.getId(), department.getName(), department.getDescription());
    }
}