# Protocol V1: Compatibility

Rules for evolving Protocol V1 without breaking clients.

- V1 is completely immutable once frozen.
- Any new fields require V2.
- Unrecognized JSON fields MUST be rejected (strict schema validation).
- Extraneous binary trailing bytes MUST be rejected.
