# Security & Multi-Tenant Isolation Rules

## 1. Multi-Tenant Data Isolation
- Enforce PostgreSQL Row-Level Security (RLS) or explicit tenant query filtering (`WHERE tenant_id = current_tenant`) on all tenant data tables.
- Database helper functions marked `SECURITY DEFINER` must specify `SET search_path = public` to prevent privilege escalation.

## 2. Authentication & Secrets
- Never commit or log API keys, private keys, JWT secrets, or database credentials.
- All protected API routes must validate bearer token claims, scopes, and expiration times.
- Secure environment files with `chmod 600 .env` owned by the service user.

## 3. Rate Limiting & Concurrency
- Public endpoints (authentication, OTP dispatch, search) must enforce IP-based rate limiting.
- Guard mutation buttons (`if (loading) return;` / disabled states) and enforce database uniqueness constraints to prevent double-click race conditions.
