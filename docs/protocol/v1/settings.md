# Protocol V1: Settings

Client settings payload submitted during Handshake A.

## Settings Schema (JSON)
```json
{
  "scenario": "string (enum of valid scenarios)",
  "resolution": {
    "width": "number",
    "height": "number"
  },
  "clientVersion": "string"
}
```
