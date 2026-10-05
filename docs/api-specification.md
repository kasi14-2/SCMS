# API Specification (Summary)

## Authentication
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh-token`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`

## User Management
- `GET /api/users/me`
- `GET /api/users`
- `PUT /api/users/{id}/status`

## Complaint Management
- `POST /api/complaints`
- `GET /api/complaints`
- `GET /api/complaints/{id}`
- `PATCH /api/complaints/{id}/status`
- `POST /api/complaints/{id}/comments`
- `POST /api/complaints/{id}/attachments`
- `POST /api/complaints/{id}/feedback`

## Notification and Reporting
- `GET /api/notifications`
- `GET /api/dashboard/**`
- `GET /api/reports/**`

## Standard response

```json
{
  "timestamp": "2026-01-01T10:00:00Z",
  "status": 400,
  "error": "VALIDATION_ERROR",
  "message": "Invalid complaint data",
  "path": "/api/complaints",
  "fieldErrors": {
    "title": "Title is required"
  },
  "traceId": "unique-trace-id"
}
```
