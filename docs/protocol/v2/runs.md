# Protocol V2: Practice Run Sync and Leaderboard Reads

## Status and trust boundary

`POST /api/v2/runs` is an authenticated **practice-run sync**. It stores a
completed run for the player's own history and lists the run on the public
per-mode leaderboard: the server records the client-reported `finalScore` as
the player's best for that board when it beats their previous best.

There is no replay verification — the model is trust-the-client. The only
guard is `clientEligibility.leaderboardEligible`: a run the client marks
ineligible (paused mid-run, pointer-lock lost, incomplete) is still stored to
the player's history but is not written to the board. The browser still cannot
select a run class; every stored run is `runClass: "practice"`.

## Endpoints

### `POST /api/v2/runs`

- Requires an authenticated session and an allowed Origin.
- Requires `Content-Type: application/json`.
- Accepts `PracticeRunSubmissionV2Schema`.
- Returns `201` with `submissionStatus: "stored"` for the first request.
- Returns `200` with `submissionStatus: "already-stored"` for an identical
  retry.
- Returns `409` when the same user reuses a `runId` with different content.
- Always returns `runClass: "practice"`; `competitiveStatus` is `"listed"`
  (transitional builds may still send `"practice-only"`).

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
