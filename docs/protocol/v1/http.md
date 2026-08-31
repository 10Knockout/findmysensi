# Protocol V1: HTTP Shell

This document defines the exact HTTP shell for Handshake A (Handshake B is Ranked-only).

## Endpoints

- `GET /api/v1/health`
  - Purpose: Liveness check.
  - Response: `200 OK`, JSON `{"status": "ok"}`
- `POST /api/v1/handshake-a`
  - Purpose: Exchange client identity and settings for a secure session ticket.
  - Request format: JSON body following `settings.md` schema.
  - Response format: JSON body following `ticket.md` schema.

## Security Constraints

- All routes MUST require `Origin` headers matching the allowed domain list (or `localhost` bypass in dev).
- All `POST` routes MUST require `Content-Type: application/json`.
- CSRF Protection: No cookies are used; all session tickets are delivered in JSON and must be sent as Bearer tokens in Ranked websocket requests.
