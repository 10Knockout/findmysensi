# Protocol V2: Compatibility

V2 is additive. Protocol V1 remains byte-for-byte and field-for-field
unchanged.

- V2 endpoints live under `/api/v2`.
- Every JSON object is strict; unknown fields are rejected.
- A retry with the same authenticated user, `runId`, and canonical payload is
  idempotent.
- Reusing a `runId` with a different canonical payload is a conflict.
- Mode, scenario, and scoring versions identify one immutable leaderboard
  board. Incompatible versions are never mixed.
- Practice runs populate the public leaderboard directly under a
  trust-the-client model; there is no Ranked / verified flow.

Rollback is routing-only: clients may stop calling `/api/v2` while V1 routes
continue unchanged. Additive V2 tables are retained so accepted private run
history is not destroyed.
