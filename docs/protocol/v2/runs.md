# Protocol V2: Practice Run Sync and Verified Leaderboard Reads

## Status and trust boundary

`POST /api/v2/runs` is an authenticated, private **practice-summary sync**.
It stores a completed run for the player's own history. It does not turn that
run into Ranked, an official personal best, or a global leaderboard entry.

The request's `clientEligibility` field describes local technical conditions
for user feedback. It is never accepted as an authoritative competitive
decision, and the browser cannot select a competitive run class.

An official leaderboard projection may only consume a server-side run whose
immutable disposition is `verified`. No public V2 route can create that
disposition until server-issued run identity, bounded proof capture, and
authoritative deterministic replay are implemented and reviewed.

## Endpoints

### `POST /api/v2/runs`

- Requires an authenticated session and an allowed Origin.
- Requires `Content-Type: application/json`.
- Accepts `PracticeRunSubmissionV2Schema`.
- Returns `201` with `submissionStatus: "stored"` for the first request.
- Returns `200` with `submissionStatus: "already-stored"` for an identical
  retry.
- Returns `409` when the same user reuses a `runId` with different content.
- Always returns `runClass: "practice"` and
  `competitiveStatus: "practice-only"`.

### `GET /api/v2/leaderboards/:modeId`

Required query parameters:

- `scenarioVersion`
- `scoringVersion`

The response contains the board identity, top rows, unique verified-player
count, and the authenticated player's verified standing when one exists.
Standard competition ranking is used: equal scores share a rank and the next
rank skips accordingly.

Percentile is:

`100 * (1 - (rank - 1) / max(1, totalPlayers - 1))`

It uses one verified best row per player and is `null` until at least 10
verified players exist on that exact board.
