# SEGALOKA - DEVELOPMENT ENVIRONMENT POLICY

## Existing Development Domains

Website:
https://dev.segaloka.com

Dashboard:
https://dev.dashboard.segaloka.com

## Backend

Workspace:
D:\Server-Segaloka

API:
Use the existing Segaloka API and existing
authenticated BFF where applicable.

Do not assume the local API is publicly accessible.

## Mandatory Rules

1. Reuse existing development subdomains.
2. Do not create new domains or subdomains.
3. Do not create new Vercel projects.
4. Do not create another PostgreSQL database.
5. Do not duplicate existing API endpoints.
6. Do not create parallel authentication systems.
7. Keep Control Center separate from role dashboards.
8. Validate tenant access on the server.
9. Synchronize data through verified API contracts.
10. Do not require users to clear cache or restart.
11. Keep mobile integration planned for later.
12. Do not push or deploy without approval.

## Integration Status

API route declarations discovered: 22
Dashboard E2E integration: pending verification
Website E2E integration: pending verification
Realtime synchronization: pending implementation

## Important

This policy does not change DNS, Vercel,
environment variables, or running services.
