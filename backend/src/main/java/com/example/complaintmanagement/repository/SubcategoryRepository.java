package com.example.complaintmanagement.repository;

import com.example.complaintmanagement.entity.Subcategory;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SubcategoryRepository extends JpaRepository<Subcategory, Long> {
}