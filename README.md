# SMART COMPLAINT MANAGEMENT SYSTEM (SCMS)

Smart Complaint Management System is a full-stack complaint tracking and resolution platform for citizens, departments, employees, and administrators. It supports complaint submission, assignment, SLA tracking, escalation, notifications, dashboards, and reporting.

## 1. Complete System Architecture

### Overview
The system is built with a layered architecture:
- Frontend: React + TypeScript with reusable components and responsive layouts
- Backend: Spring Boot 3 + Java 17 REST API with JWT auth, Spring Security, JPA, and validation
- Database: MySQL 8 with Flyway-managed schema and Redis for caching
- Messaging/Realtime: WebSocket-ready support for notifications and live updates
- Deployment: local development run with MySQL and Redis; Docker files are optional and not required

### Main Components
- Authentication service for registration, login, refresh tokens, and role enforcement
- User service for profile and administrative user management
- Complaint service for creation, updates, status workflow, and assignment
- Notification service for email/in-app/SMS-ready event notifications
- Scheduler for SLA checks, reminders, escalation, and cleanup jobs
- Reporting service for PDF, Excel, and CSV exports
- Audit and security modules for traceability and compliance

### Security Architecture
- JWT access tokens and refresh tokens
- BCrypt password hashing
- Role-based access control with method-level checks
- Secure CORS and HTTP headers
- Input validation and structured error handling
- Environment-based configuration for secrets

## 2. Use-Case Diagram Description

Actors:
- Citizen/User
- Department Officer
- Employee/Staff
- Administrator
- Super Admin

Use cases:
- Register/login, reset password, manage profile
- Submit complaint with attachments and location data
- View complaint history, comments, timeline, and status
- Officer assigns complaint and updates SLA
- Employee accepts/rejects work and provides resolution
- Admin manages users, departments, categories, settings, and reports
- Super Admin manages configurations and full system controls

## 3. Database ER Diagram Description

Core entities:
- User and Role have a many-to-many relationship
- User belongs to one Department (for officers/staff)
- Department has many Users and Complaints
- Category has many Subcategories and Complaints
- Complaint belongs to Category, Subcategory, Department, SubmittedBy, and AssignedTo
- Complaint can have many Attachments, Comments, and StatusHistory records
- Notification belongs to a User
- RefreshToken belongs to a User
- SLAConfiguration and Escalation track operational thresholds
- AuditLog records system-level actions

## 4. Application Workflow

1. User creates account and verifies email
2. User logs in to obtain an access token
3. User submits complaint with category, department, location, and attachment
4. System validates inputs, detects duplicates, and assigns default priority
5. Officer acknowledges and assigns complaint to a staff member
6. Employee updates progress and resolves complaint
7. User rates and provides feedback
8. System records timeline, SLA, and escalation events
9. Admin monitors reports, trends, and SLA metrics

## 5. Folder Structure

```text
SCMS/
├── backend/
│   ├── src/main/java/com/example/complaintmanagement/
│   ├── src/main/resources/
│   ├── src/test/java/
│   ├── pom.xml
│   └── README.md
├── frontend/
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── index.html
├── docs/
│   ├── architecture.md
│   ├── api-specification.md
│   └── database-schema.md
├── docker-compose.yml
├── .env.example
├── .gitignore
├── nginx.conf
├── Dockerfile.backend
├── Dockerfile.frontend
└── README.md
```

## 6. Development Phases

1. Architecture and data model design
2. Backend domain, security, and REST APIs
3. Frontend dashboards and complaint workflows
4. Notification, SLA, and report services
5. Integration tests and API validation
6. Docker deployment and environment management
7. Documentation and production hardening

## 7. Database Schema

The system uses MySQL and Flyway migrations. Core tables include:
- users
- roles
- permissions
- role_permissions
- departments
- categories
- subcategories
- complaints
- complaint_attachments
- complaint_status_history
- complaint_comments
- notifications
- refresh_tokens
- sla_configurations
- escalations
- audit_logs
- system_settings
- locations

## 8. API Specification

### Core endpoints
- Auth: `/api/auth/register`, `/api/auth/login`, `/api/auth/refresh-token`
- Users: `/api/users/me`, `/api/users`
- Complaints: `/api/complaints`, `/api/complaints/{id}`, `/api/complaints/{id}/status`
- Notifications: `/api/notifications`
- Dashboard and reports: `/api/dashboard/**`, `/api/reports/**`

### OpenAPI
Swagger UI is exposed at `/swagger-ui.html` when the backend is running.

## 9. Demo Credentials

The local administrator is seeded automatically:

- Username: `admin`
- Password: `Vivek@143`

Resident accounts are created through the shared sign-in page. Override `ADMIN_USERNAME`, `ADMIN_EMAIL`, and `ADMIN_DEFAULT_PASSWORD` for a deployment; do not use the local default password in production.

## 10. Run Locally on Windows

### Prerequisites
- Java 17
- Maven 3.9+
- MySQL 8 running locally on port `3306`
- Node.js 18+ and npm

Redis and Docker are not required to run the application locally. The backend creates the `scms` database if it does not exist and runs its Flyway migrations at startup. The MySQL account configured for the app must be allowed to create databases.

### Start the backend
Open a PowerShell terminal in the project folder and run:

```powershell
$env:JAVA_HOME = 'C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot'
$env:MAVEN_HOME = 'C:\tools\apache-maven-3.9.11'
$env:Path = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:Path"
Set-Location .\backend
mvn spring-boot:run
```

Keep this terminal open. The backend is available at `http://localhost:8080`; Swagger UI is at `http://localhost:8080/swagger-ui.html`.

The default local datasource settings are in `backend/src/main/resources/application.yml` (`root` and the configured local password). Override them in PowerShell before starting the backend if your MySQL credentials differ:

```powershell
$env:DB_USERNAME = 'your-mysql-username'
$env:DB_PASSWORD = 'your-mysql-password'
```

If `java` or `mvn` is not recognized, check that the paths above match your Java and Maven installation folders. These environment variable changes apply only to the current terminal.

### Start the frontend
Open a second PowerShell terminal in the project folder and run:

```powershell
Set-Location .\frontend
npm install
npm run dev
```

Open the `Local` URL printed by Vite, normally `http://localhost:5173`. If that port is occupied, Vite selects another available port and prints the URL to use. Keep this terminal open as well.

### Enable email notifications
Assignment and status changes create an in-app notification and send a formatted email to the resident when SMTP is configured. The sender defaults to `pkasivivek57@gmail.com`. For Gmail, create an App Password and set it before starting the backend:

```powershell
$env:MAIL_PASSWORD = 'your-gmail-app-password'
$env:MAIL_USERNAME = 'pkasivivek57@gmail.com'
$env:MAIL_FROM = 'pkasivivek57@gmail.com'
$env:MAIL_HEALTH_ENABLED = 'true'
```

Do not commit the App Password. If `MAIL_PASSWORD` is unset, in-app notifications still work and email delivery is skipped.

### Stop the applications
Press `Ctrl+C` in each terminal to stop its server.

### Build checks
Run these from their respective folders when you want to check the projects without starting the servers:

```powershell
# backend
mvn test

# frontend
npm run build
```

## 11. Security Notes

This is a starter production-ready architecture. In production, configure:
- strong JWT secrets
- secure database credentials
- proper Redis and MySQL network policies
- file storage validation and antivirus scanning
- rate limiting and audit retention

## 12. Related Documents

- [docs/architecture.md](docs/architecture.md)
- [docs/database-schema.md](docs/database-schema.md)
- [docs/api-specification.md](docs/api-specification.md)

## 13. License

This project is intended for educational and enterprise demonstration purposes.
