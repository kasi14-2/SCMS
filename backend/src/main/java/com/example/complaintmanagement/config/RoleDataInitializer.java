package com.example.complaintmanagement.config;

import com.example.complaintmanagement.entity.Role;
import com.example.complaintmanagement.entity.Department;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.RoleName;
import com.example.complaintmanagement.repository.DepartmentRepository;
import com.example.complaintmanagement.repository.RoleRepository;
import com.example.complaintmanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class RoleDataInitializer {

    private final RoleRepository roleRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin.username:admin}")
    private String adminUsername;

    @Value("${app.admin.email:admin@scms.local}")
    private String adminEmail;

    @Value("${app.admin.password:Vivek@143}")
    private String adminPassword;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void onApplicationReady() {
        seedRoles();
    }

    @Transactional
    public void seedRoles() {
        for (RoleName roleName : RoleName.values()) {
            roleRepository.findByName(roleName).orElseGet(() -> {
                Role role = new Role();
                role.setName(roleName);
                return roleRepository.save(role);
            });
        }

        seedDepartments();
        seedAdmin();
    }

    private void seedDepartments() {
        for (String name : List.of("Public Works", "Water Supply", "Sanitation", "Electricity", "Health Services")) {
            if (!departmentRepository.existsByName(name)) {
                Department department = new Department();
                department.setName(name);
                departmentRepository.save(department);
            }
        }
    }

    private void seedAdmin() {
        User admin = userRepository.findByEmail(adminEmail).orElseGet(() -> {
            User user = new User();
            user.setFirstName("System");
            user.setLastName("Administrator");
            user.setEmail(adminEmail);
            user.setPassword(passwordEncoder.encode(adminPassword));
            user.getRoles().add(roleRepository.findByName(RoleName.ADMIN).orElseThrow());
            return userRepository.save(user);
        });
        if (admin.getRoles().stream().noneMatch(role -> role.getName() == RoleName.ADMIN)) {
            admin.getRoles().add(roleRepository.findByName(RoleName.ADMIN).orElseThrow());
            userRepository.save(admin);
        }
    }
}
