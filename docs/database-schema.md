# Database Schema Overview

## Core tables

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

## Schema principles

- UUID or numeric surrogate keys for all records
- Indexed complaint number, user email, and status fields
- Foreign keys enforce relationships between users, departments, and complaint records
- Soft delete is recommended for long-term operational history
- Auditing fields such as created_at and updated_at are included on all relevant entities

## Example complaint lifecycle

`complaints` -> `complaint_status_history` as each status transition is recorded.
This helps report on response time, resolution time, and SLA breach patterns.
