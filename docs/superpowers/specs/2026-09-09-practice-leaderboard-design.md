# Practice Leaderboard Design

**Date:** 2026-09-09
**Status:** Approved (brainstorming), pending implementation plan
**Repos:** `findmysensi` (public web + protocol), `findmysensi-secure` (API + database)

## Problem

A player verifies their email, plays a mode, and the results screen shows
**Leaderboard Rank**, **Percentile**, and **Vs Personal Best** as `—`. This is
current, correct behaviour: practice runs are stored to `run_record_v2` but
nothing writes `leaderboard_entry_v2`, and the only writer
(`storeAuthoritativelyVerifiedRunV2`) is an unused "authoritative replay"
seam that no route calls. The product decision is to **remove the Ranked /
verified concept entirely** and make every synced practice run appear on a
per-mode leaderboard with a visible rank and score.

## Decisions (from brainstorming)

1. **Trust model:** full trust, minimal guards. The server stores the score the
   browser reports. Only the checks already enforced by
   `PracticeRunSubmissionV2Schema` apply (score within schema bounds,
   `hits + misses === shots`, `durationSeconds` matches `activeDurationMs`,
   `completedAt >= startedAt`). No rate limiting, no anomaly detection, no
   flagging in this version.
2. **Board identity:** one board per `modeId + scenarioVersion + scoringVersion`
   (unchanged from the existing V2 board id
   `"{modeId}:scenario-{sv}:scoring-{scv}"`). A future scoring/scenario bump
   starts a fresh board; old boards freeze.
3. **Listing:** automatic. Any run synced while logged in places the player's
   best score on the public board under their `username`. The
   `leaderboard_publication_v2` opt-in is removed from the live path.
4. **UI scope:** results-screen rank + a new per-mode leaderboard page +
   repoint the homepage widget. No global `/leaderboards` hub in this version.
5. **Approach:** extend the existing V2 practice path (Approach A). Reuse
   `getLeaderboardV2` (already returns ranked rows, `totalPlayers`, per-user
   `standing`, percentile). The only missing piece server-side is a writer.

## Non-goals

- Authoritative replay / anti-cheat verification.
- Rate limiting or anomaly detection.
- A global multi-mode leaderboard hub page.
- Touching Protocol V1 (`leaderboard_entry`, `/api/v1/leaderboards/*`) beyond
  letting the homepage widget stop calling it. V1 tables and routes stay as-is.
- Season resets or manual board administration.

---

## Architecture

### Data flow (after change)

```
Browser: PracticeRunController completes run
  -> localRunHistory.save(RunRecord)                 [unchanged]
  -> PracticeResults submits toPracticeRunSubmissionV2 -> POST /api/v2/runs
       -> savePracticeRunV2()                         [CHANGED: also upserts board entry]
            - insert run_record_v2 (run_class "practice", server_disposition "practice-only")
            - upsert leaderboard_entry_v2 on (board_id, user_id), best-score-wins
       -> getLeaderboardV2(mode, sv, scv, userId)     [unchanged: now returns a real standing]
       -> response { ..., competitiveStatus: "listed", leaderboard }   [CHANGED literal]
  -> results-overview renders standing.rank / percentile   [unchanged logic, changed copy]

Leaderboard page: GET /api/v2/leaderboards/:mode?scenarioVersion&scoringVersion   [unchanged route]
Homepage widget:  GET /api/v2/leaderboards/grid?scenarioVersion=0&scoringVersion=0 [CHANGED caller]
```

### Components touched

| Component                                                       | Repo   | Change                                                                                                                                                                   |
| --------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/database/src/run-v2.ts` `savePracticeRunV2`           | secure | Wrap in a transaction; after the run insert, upsert `leaderboard_entry_v2`. Remove publication dependency.                                                               |
| `packages/database/drizzle/0009_*.sql` + `meta`                 | secure | Migration: no structural change required to `leaderboard_entry_v2`; migration exists to record intent. `leaderboard_publication_v2` retained, unused.                    |
| `apps/api/src/run-v2.ts` `handlePracticeRunSubmission`          | secure | Response literal `competitiveStatus: "practice-only"` -> `"listed"`. No other change (already fetches + returns `leaderboard`).                                          |
| `packages/public-runtime/src/run-v2.ts`                         | secure | No change (holds request schema only; response is a plain object literal in the route).                                                                                  |
| `packages/protocol/src/v2/run-submission.ts`                    | public | `PracticeRunSubmissionResponseV2Schema.competitiveStatus` literal `"practice-only"` -> `"listed"` (see O3 for a transitional union).                                     |
| `packages/api-client/src/browser.ts`                            | public | No functional change; `submitPracticeRunV2` already validates the response schema. `getLeaderboardV2` already present for page use.                                      |
| `apps/web/src/features/results/results-overview.ts`             | public | Rewrite the two leaderboard-metric notes and the score-delta note wording. No branching-logic change.                                                                    |
| `apps/web/src/features/results/PracticeResults.tsx`             | public | `getRunSyncCopy` "saved" tag/description rewritten. Eligibility `role="note"` block wording updated. Add a link to the new leaderboard page.                             |
| `apps/web/app/app/train/[mode]/leaderboard/page.tsx`            | public | **New.** Server component: resolve mode from `trainerModeManifest`, 404 if disabled, render `<ModeLeaderboard>`.                                                         |
| `apps/web/app/train/[mode]/leaderboard/page.tsx`                | public | **New.** Redirect stub -> `/app/train/[mode]/leaderboard` (mirrors the results route pattern).                                                                           |
| `apps/web/src/features/leaderboard/ModeLeaderboard.tsx`         | public | **New.** Client component: calls `getLeaderboardV2`, renders top 50 + highlighted self row + own standing when outside top 50 + empty/error states.                      |
| `apps/web/src/features/leaderboard/routes.ts`                   | public | **New.** `getModeLeaderboardRoutes(mode)` helper, mirroring `results/routes.ts`.                                                                                         |
| `apps/web/src/features/landing/LiveLeaderboard.tsx`             | public | Switch to `getLeaderboardV2("grid", 0, 0)`; adapt row shape (`LeaderboardRowV2`: `rank/username/score/achievedAt`, no `userId`).                                         |
| `apps/web/app/app/workouts/page.tsx` + `[mode]` training page   | public | Add a "Leaderboard" link per mode.                                                                                                                                       |
| `docs/adr/0001-repository-and-trust-boundary.md`                | public | Note that practice runs now populate the public board directly; the "verified-only projection" statement is superseded for practice modes.                               |
| `docs/protocol/v2/runs.md`, `docs/protocol/v2/compatibility.md` | public | Rewrite: `POST /api/v2/runs` now lists the run on the public board; remove "no public route may create a leaderboard row" language; document the trust-the-client model. |

---

## Detailed behaviour

### Writer: `savePracticeRunV2`

Current shape: single `insert ... onConflictDoNothing().returning()`, then a
follow-up `select` to detect an idempotent retry vs a genuine conflict.

New shape (transaction):

1. `insert run_record_v2 ... onConflictDoNothing().returning({ id })`.
2. Resolve `runRecordId` and `status`:
   - insert returned a row -> `runRecordId = inserted.id`, `status = "stored"`.
   - else `select` existing by `(userId, runId)`; if missing or
     `payloadHash` / `runClass` / `serverDisposition` differ ->
     `throw new RunSubmissionConflictErrorV2()`.
   - else `runRecordId = existing.id`, `status = "already-stored"`.
3. Upsert the board entry (both `"stored"` and `"already-stored"` paths):

```
insert into leaderboard_entry_v2
  (id, board_id, mode_id, scenario_version, scoring_version,
   user_id, run_record_id, score, achieved_at, updated_at)
values (randomUUID(), boardId, modeId, sv, scv,
        userId, runRecordId, finalScore, completedAt, now)
onConflictDoUpdate({
  target: [board_id, user_id],
  set: { run_record_id, score, achieved_at, updated_at: now },
  setWhere: sql`${leaderboardEntryV2.score} < excluded.score`,
})
```

- Best-score-wins: a lower or equal score leaves the existing row untouched.
- `run_record_id` has a `unique` index. When a **new** run improves the score,
  the update points the row at the new `runRecordId` — fine. When the score
  does **not** improve, `setWhere` blocks the update, so the old
  `run_record_id` stays and no uniqueness conflict occurs.
- Edge case — idempotent retry of the current best: `(board_id, user_id)`
  conflict + `setWhere` false -> no-op. Correct.
- Edge case — a brand-new run that ties the current best: not written (score
  not strictly greater). Acceptable; matches "best-score-wins, earliest achiever
  keeps the rank" already implied by the read ordering
  (`desc(score), asc(achievedAt), asc(userId)`).

Wrap steps 1–3 in `db.transaction(...)`. `RunSubmissionConflictErrorV2` thrown
inside the transaction propagates out and is caught by the route as a 409.

### `getLeaderboardV2` — no change

Already computes: ranked `rows` (dense rank, ties share a rank), `totalPlayers`
(count of board entries), and, when `userId` is supplied, `standing`
`{ rank, score, percentile, totalPlayers, achievedAt }`. Percentile is `null`
below `LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2` (10). Keep all of this.

The `run-v2.ts` route already calls it with `userId` after a save and strips
`rows` before returning the `leaderboard` context, so the submit response
carries the player's fresh `standing` with zero route changes beyond the
literal rename.

### Results screen copy

`results-overview.ts` `getLeaderboardMetrics`:

- `standing` present ->
  - Rank: `#${rank}` note `"Best of ${totalPlayers} on this board"`.
  - Percentile present -> `"${pct}%"` note reworded to "Ranked players".
  - Percentile `null` -> `"—"` note `"Shown once ${percentileMinimumPlayers} players have a score"`.
- `standing` absent (sync pending / offline) ->
  - Rank: `"—"` note `"Sync your run to see your rank"`.
  - Percentile: `"—"` note `"Awaiting sync"`.

`getScoreDeltaNote`: unchanged logic. `"First eligible result"` -> `"First run"`;
`"No eligible comparison"` wording kept but de-jargoned.

`PracticeResults.tsx` `getRunSyncCopy("saved")`:

- tag: `"Saved to Account"` (drop `· Practice`).
- description: `"Your best score for this mode is now on the public leaderboard."`

The `!latestRun.leaderboardEligible` note block: see **O1**.

### New leaderboard page

- `GET /app/train/[mode]/leaderboard`:
  - Server component resolves `trainerModeManifest.get(mode)`; `notFound()` if
    absent or `!enabled`.
  - Passes `mode`, `taskName` (`presentation.title`), `scenarioVersion`,
    `scoringVersion` (from `scenarioEntry.definition`) to `<ModeLeaderboard>`.
- `<ModeLeaderboard>` (client):
  - `new BrowserApiClient().getLeaderboardV2(mode, sv, scv)`.
  - States: loading, error (`result.error`), empty (`rows.length === 0` ->
    "No scores yet. Be the first."), populated.
  - Table: `Rank | Player | Score | When`. Highlight the row whose `username`
    matches the session user (fetch session via `getSession`, best-effort; no
    redirect — the page is public).
  - `getLeaderboardV2` returns at most 50 rows. If the signed-in player is not
    in the returned rows, show a pinned "Your standing" row from the same
    response's `standing` field (present when the request carries the session
    cookie — see O2).
  - "Play this mode" and "Back to results" links.
- `/train/[mode]/leaderboard` redirect stub mirrors
  `apps/web/app/train/[mode]/results/page.tsx`.

### Homepage widget

`LiveLeaderboard.tsx`:

- Replace `client.getLeaderboard("gridshot")` with
  `client.getLeaderboardV2("grid", 0, 0)`.
- Row type becomes `LeaderboardRowV2` (`rank`, `username`, `score`,
  `achievedAt`). Update the render (no `userId`; key on `rank`).
- Keep the 15s visible-tab refresh, empty state, and error state.
- Hardcoded featured mode `"grid"` is acceptable for this version.

---

## Error handling

| Situation                                             | Behaviour                                                                                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Board upsert fails inside the transaction             | Whole `savePracticeRunV2` transaction rolls back; route returns `503`. The run is **not** stored — consistent with today's all-or-nothing save. Client keeps the local run and retries on next results view. |
| `runId` reused with different payload                 | `409` (unchanged).                                                                                                                                                                                           |
| Idempotent resubmit                                   | `200 already-stored`; board upsert is a no-op or a harmless re-point; response still carries current `standing`.                                                                                             |
| Leaderboard read route down while submitting          | Route currently lets `getLeaderboardV2` throw -> `503`. Leave as-is.                                                                                                                                         |
| Leaderboard page: API error / offline                 | Component shows its error state; no crash.                                                                                                                                                                   |
| Leaderboard page: unknown / disabled mode             | `notFound()` (404).                                                                                                                                                                                          |
| Player has no score on a board yet (viewing the page) | Empty or "not on this board yet" pinned row; never an error.                                                                                                                                                 |

## Testing

**Secure repo (`vitest`):**

- `savePracticeRunV2`:
  - first submit -> `run_record_v2` row **and** `leaderboard_entry_v2` row, score matches.
  - second submit, higher score -> entry updated, `run_record_id` re-pointed.
  - second submit, lower score -> entry unchanged.
  - idempotent resubmit of best -> no-op, `status "already-stored"`.
  - conflicting payload -> `RunSubmissionConflictErrorV2`, **no** partial board row (transaction rollback).
  - two users, same board -> `totalPlayers === 2`, ranks correct, ties share rank.
- `handlePracticeRunSubmission` integration: response has `competitiveStatus: "listed"` and a non-null `leaderboard.standing` after the first submit.
- `getLeaderboardV2`: existing tests still pass; add a case asserting a practice-written entry appears.

**Public repo (`vitest`):**

- `PracticeRunSubmissionResponseV2Schema` accepts `"listed"` (and, transitionally, `"practice-only"` per O3).
- `results-overview.spec.ts`: update expected note strings; add a case with a populated `standing` asserting `#rank` + percentile rendering.
- `practice-results.spec.ts`: update the "cannot enter the official leaderboard" assertion to the new copy.
- New `ModeLeaderboard` component test: loading / empty / populated / error; self-row highlight.
- `api-client` `run-v2.spec.ts`: response fixture uses `"listed"`.

**E2E (`tests/e2e`, Chromium):**

- Existing `public-smoke` updated if it asserts leaderboard copy.
- Optional new journey: authenticated run -> results shows a numeric rank -> leaderboard page lists the player.

## Migration / rollout

1. Land secure-repo change (schema migration `0009` + writer + literal) and
   deploy the API. `0009` makes no breaking structural change, so it is safe to
   apply before the web deploy.
2. Land public-repo change (protocol literal, results copy, new page, widget,
   docs) and deploy web.
3. Deploy ordering for the literal: ship the protocol schema as a transitional
   `z.enum(["practice-only", "listed"])` first, deploy web, then deploy the API
   sending `"listed"`, then narrow the enum to `"listed"` in a follow-up. See O3.
4. No backfill: existing `run_record_v2` rows are not swept into
   `leaderboard_entry_v2`. Boards populate from the first run after deploy. See O4.

## Resolved decisions (were open questions; confirmed 2026-09-09)

- **D1 — ineligible local runs are excluded from the board.** `savePracticeRunV2`
  skips the `leaderboard_entry_v2` upsert when
  `clientEligibility.leaderboardEligible === false` (paused mid-run, pointer-lock
  lost, raw input unavailable, incomplete, etc.). The `run_record_v2` row is
  still stored — the run stays in the player's history, it just does not set or
  update a board score. This is the only guard; it is not framed as anti-cheat.
- **D2 — personal standing needs no route change.**
  `GET /api/v2/leaderboards/:mode` already computes `standing` when a session
  cookie is present, and `LeaderboardResponseV2Schema` already carries it. The
  leaderboard page relies on this; an added test asserts that a signed-in caller
  outside the top 50 still receives a `standing` with the default
  `credentials: "include"`.
- **D3 — transitional response literal.** `@findmysensi/protocol`
  `PracticeRunSubmissionResponseV2Schema.competitiveStatus` ships as
  `z.enum(["practice-only", "listed"])` for one release so web can deploy before
  the API starts sending `"listed"`. A follow-up change narrows it to
  `z.literal("listed")` once the API is deployed.
- **D4 — no backfill.** Existing `run_record_v2` rows are not swept into
  `leaderboard_entry_v2`. Boards populate from the first eligible run after
  deploy. No `tools/` backfill script in this version.

## Rough build order

1. Secure: migration `0009` + `savePracticeRunV2` writer + unit tests.
2. Secure: route literal `"listed"` + integration test.
3. Public: protocol literal (transitional enum) + `api-client` fixture.
4. Public: results-overview + PracticeResults copy + tests.
5. Public: `getModeLeaderboardRoutes`, `ModeLeaderboard`, the two route files.
6. Public: nav links (workouts hub, `[mode]` training page, results screen).
7. Public: `LiveLeaderboard` repoint.
8. Docs: ADR 0001, protocol v2 runs/compatibility.
9. Full verify (typecheck, lint, unit, E2E) in both repos.
