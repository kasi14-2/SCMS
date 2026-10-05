package com.example.complaintmanagement.service;

import com.example.complaintmanagement.dto.LoginRequest;
import com.example.complaintmanagement.dto.RegisterRequest;
import com.example.complaintmanagement.dto.TokenResponse;
import com.example.complaintmanagement.dto.UserResponse;
import com.example.complaintmanagement.entity.RefreshToken;
import com.example.complaintmanagement.entity.Role;
import com.example.complaintmanagement.entity.User;
import com.example.complaintmanagement.enums.RoleName;
import com.example.complaintmanagement.exception.BadRequestException;
import com.example.complaintmanagement.repository.RefreshTokenRepository;
import com.example.complaintmanagement.repository.RoleRepository;
import com.example.complaintmanagement.repository.UserRepository;
import com.example.complaintmanagement.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.beans.factory.annotation.Value;

import java.time.Instant;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;

        @Value("${app.admin.username:admin}")
        private String adminUsername;

        @Value("${app.admin.email:admin@scms.local}")
        private String adminEmail;

    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.email())) {
            throw new BadRequestException("Email already exists");
        }

        Role citizenRole = roleRepository.findByName(RoleName.CITIZEN)
                .orElseThrow(() -> new BadRequestException("Citizen role not found"));

        User user = new User();
        user.setFirstName(request.firstName());
        user.setLastName(request.lastName());
        user.setEmail(request.email());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setPhoneNumber(request.phoneNumber());
        user.getRoles().add(citizenRole);

        User saved = userRepository.save(user);
        return UserResponse.from(saved);
    }

    public TokenResponse login(LoginRequest request) {
        String email = request.email().equalsIgnoreCase(adminUsername) ? adminEmail : request.email();
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(email, request.password())
        );

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BadRequestException("Invalid username or password"));

        UserDetails userDetails = org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRoles().stream()
                        .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                        .toList())
                .build();

        String accessToken = jwtService.generateToken(userDetails);
        String refreshToken = UUID.randomUUID().toString();

        RefreshToken refreshTokenEntity = new RefreshToken();
        refreshTokenEntity.setUser(user);
        refreshTokenEntity.setToken(refreshToken);
        refreshTokenEntity.setExpiryDate(Instant.now().plusMillis(604800000));
        refreshTokenRepository.save(refreshTokenEntity);

        return TokenResponse.of(accessToken, refreshToken, 86400000L,
                user.getRoles().stream().map(role -> role.getName().name()).toList());
    }

    public TokenResponse refreshToken(String refreshTokenValue) {
        RefreshToken refreshToken = refreshTokenRepository.findByToken(refreshTokenValue)
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (refreshToken.isRevoked() || refreshToken.getExpiryDate().isBefore(Instant.now())) {
            throw new BadRequestException("Refresh token expired");
        }

        User user = refreshToken.getUser();
        UserDetails userDetails = org.springframework.security.core.userdetails.User.withUsername(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRoles().stream()
                        .map(role -> new org.springframework.security.core.authority.SimpleGrantedAuthority("ROLE_" + role.getName().name()))
                        .toList())
                .build();

        return TokenResponse.of(jwtService.generateToken(userDetails), refreshTokenValue, 86400000L,
                user.getRoles().stream().map(role -> role.getName().name()).toList());
    }
}
