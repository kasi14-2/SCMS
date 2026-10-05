package com.example.complaintmanagement;

import com.example.complaintmanagement.config.RoleDataInitializer;
import com.example.complaintmanagement.enums.RoleName;
import com.example.complaintmanagement.repository.RoleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
class RoleDataInitializerTest {

    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private RoleDataInitializer roleDataInitializer;

    @Test
    void shouldSeedDefaultRoles() {
        roleDataInitializer.seedRoles();

        assertTrue(roleRepository.findByName(RoleName.CITIZEN).isPresent());
        assertTrue(roleRepository.findByName(RoleName.ADMIN).isPresent());
    }
}
