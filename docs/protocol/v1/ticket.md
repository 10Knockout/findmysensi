# Protocol V1: Tickets

This specifies the schema for secure session tickets issued by Handshake A.

## Ticket Schema (JSON)
```json
{
  "ticketId": "string (UUID v4)",
  "expiresAt": "string (ISO-8601)",
  "claims": {
    "userId": "string (optional)",
    "scenarioId": "string"
  },
  "signature": "string (HMAC-SHA256, hex encoded)"
}
```
