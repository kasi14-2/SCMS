# System Architecture

## Layered design

The solution follows a layered Spring Boot architecture with clear responsibilities:

1. Presentation layer
   - React frontend with route-based dashboards and page components
2. API layer
   - REST controllers with validation and OpenAPI documentation
3. Service layer
   - Business workflows, complaint processing, notifications, and SLA logic
4. Data access layer
   - Spring Data JPA repositories and query specifications
5. Security layer
   - JWT, BCrypt, CORS, method-level authorization, and audit control
6. Integration layer
   - Redis cache, file storage, and notification providers
7. Operational layer
   - actuator health endpoints, scheduler, and metrics

## Runtime flow

- User authenticates through `/api/auth/login`
- API validates credentials and returns JWT tokens
- Subsequent requests use Authorization header with Bearer token
- Business services process complaint states, SLA rules, and escalation triggers
- Notification events emit email/in-app messages
- Scheduled jobs monitor deadlines and send reminders

## High-level deployment view

```text
Browser
  -> Nginx
      -> React frontend
      -> Spring Boot backend
          -> MySQL
          -> Redis
          -> file storage
```

## Security model

- Access tokens expire quickly and are validated per request
- Refresh tokens are stored and rotated on use
- Role-based permissions restrict access to admin and officer operations
- User passwords never appear in logs or responses
