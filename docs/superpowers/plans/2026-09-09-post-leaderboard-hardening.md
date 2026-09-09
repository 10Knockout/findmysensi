# Post-Leaderboard Hardening & Cleanup — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

## Execution status — 2026-09-09

- **Phase 1** (impossible-value gate) — ✅ done, merged + pushed (`findmysensi-secure` `main`). Ceilings: plan's `maxKps` column, but `hitPoints`/`maxMultiplier` re-derived from each mode's `computeScore` (the plan table's flat `hitPoints: 1000` was wrong — pinpoint 1500, turn180 1800, etc.), plus a `maxMultiplier` factor so legit bonus runs pass. Switch-track cap 180 switches (loose). Live: `POST /api/v2/runs` → `401`.
- **Phase 2** (`/api/v2/*` rate limiting) — ✅ done, merged + pushed (`findmysensi-secure` `main`).
- **Phase 3** (CSP) — ✅ done, merged + pushed (`findmysensi` `main`), **but not as written**: `apps/web/proxy.ts` already shipped a nonce + `'strict-dynamic'` CSP on 2026-09-08 (stronger than this plan's `'unsafe-inline'` version). The `next.config.mjs` CSP added first was reverted (`fix/csp-single-source`); `app/csp.spec.ts` now guards `proxy.ts` instead. The E2E "no CSP violations" test stayed. Also required a standalone `chore(format)` commit first — `main`'s `npm run format:check` was already red on 14 unrelated files from the practice-leaderboard merge.
- **Phase 4** (error surface) — ✅ done, merged + pushed (both repos). Branded `not-found.tsx` / `error.tsx` / `global-error.tsx`; HSTS in the API's `SECURITY_HEADERS`; `error-surface.spec.ts` audit test (leak regex + HSTS assertion). The audit caught two real `message: error.message` sites (`app.ts` OTP resend, `run-v2.ts` run conflict) — both fixed to route-owned generic copy. `npm audit --omit=dev`: public clean; secure has 2 moderate `vitest` dev-only advisories, recorded in a new `findmysensi-secure/SECURITY.md`.
- **Phase 5** (ephemeral movement heatmap) — ✅ done, merged + pushed (`findmysensi` `main`). Added `packages/trainer-runtime/src/run-trace.ts` (`RunTrace` + recorder + `toShotOffsets`), `apps/web/src/features/results/movement-analysis.ts` (view-model — `classifyMiss` is called with aim-minus-target to get landing direction, the inverse of its "how to correct" framing), `MovementHeatmap.tsx` Canvas2D scatter, and `run-trace-handoff.ts` — an **in-memory module variable** the trainer stashes the trace in for the one client-side hop to the results route (the results screen is a separate route reached via `router.push`, so plain React state could not survive; the handoff never serializes and is gone on reload). Manual verification (play a run, see scatter, Play Again resets, reload clears) NOT done — needs the owner.
- **Phase 6** — untouched, design-only, blocked on publishing the sim packages.
- **Phase 7** (Switch Track fire-state) — implemented locally on `feat/switch-track-fire-state`; automated gates green. Detailed decisions and acceptance evidence: `docs/superpowers/plans/2026-09-09-switch-track-fire-state.md`. `scoringVersion` is bumped to `1` for a fresh leaderboard partition; `engineVersion` and `analyticsVersion` stay unchanged because their semantics do not change. Real-mouse verification and merge/push remain.
- **Phase 8** — owner-run manual benchmark.
- **Phase 9** — release; blocked on 7.

**Goal:** Close the remaining pre-launch gaps for FindMySensi after the public per-mode leaderboard shipped: lightweight anti-cheat, `/api/v2` rate limiting, a Content-Security-Policy, error-surface cleanup, an ephemeral (never-stored) post-run movement/heatmap view, and — as a larger later phase — a bounded input-proof verification pass. Everything must stay inside the free tiers of Vercel and Turso and run on a 7th-gen i3 / integrated-GPU / 8 GB potato PC.

**Architecture:** Two repos, kept separate (`findmysensi` public, `findmysensi-secure` private). Anti-cheat, rate limiting, and verification live in the private repo. The heatmap is a public-repo client-only feature that holds its data in React state for one run and is discarded on navigation, restart, or reload — no `localStorage`, no database. The deterministic simulation packages needed for real replay verification live in the public repo and are not yet consumable by the private repo; publishing them is an explicit prerequisite for Phase 6.

**Tech Stack:** TypeScript, Next.js 15 App Router (React 19), Zod, Drizzle ORM + libSQL/Turso, Better Auth, Vitest, Playwright. Canvas2D only in any gameplay or results hot path — no WebGL/Three.js there.

**Spec:** This plan's own "Decisions" section below (agreed over the 2026-09-09 sessions) plus `docs/PROJECT_ROADMAP.md` §4 (milestones M15–M17) and the memory note `practice-leaderboard-2026-09-09.md`.

## Global Constraints

- **Stay free:** Vercel Hobby, Turso free tier (5 GB, ~1B row reads/month). No feature may add unbounded rows or per-request storage growth.
- **Potato PC:** results and gameplay stay Canvas2D. No new heavy client dependency. The pre-login marketing site may be visually ambitious; the trainer and results screen may not.
- **No fake data:** real API or a real empty/error state, never a fabricated fallback. (Existing product boundary.)
- **No minimum-reaction anti-cheat in the public engine.** 45 ms movement→shot sequences are legitimate. Cheat detection is server-side, value- and physics-based, and lives only in `findmysensi-secure`.
- **Anti-cheat is best-effort, not perfect.** Priority order: server validation → impossible-value checks → scenario/version verification → bounded replay of suspicious/top runs.
- **Board id format is frozen:** `` `${modeId}:scenario-${sv}:scoring-${scv}:season-${YYYY-MM}` ``. Monthly UTC seasons; boards reset on the 1st.
- **Leaderboard read params travel as path segments**, not query string: `/api/v2/leaderboards/<mode>/<sv>/<scv>/<limit>/<offset>` (Vercel's API rewrite drops the query string). The query form is still accepted as a fallback.
- **Verify gate — run before calling any task done.**
  Public repo, from `findmysensi/`:
  ```
  npm run format:check && npm run lint && npm run typecheck
  npm run typecheck --workspace @findmysensi/web
  npm test
  npm run check:boundaries && npm run decisions:check && npm run protocol:freeze:check
  npm run build
  ```
  Secure repo, from `findmysensi-secure/`:
  ```
  npm run format:check && npm run lint && npm run typecheck
  npm test && npm run db:migrations:check && npm run build
  ```
- **Node ≥ 22.** Conventional commits, scope by area (`feat(anticheat):`, `fix(csp):`, …). End every commit message with:
  `Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>`
- Both repos are on `main` and deploy from `main` via GitHub → Vercel. Do the work on a branch per phase, merge to `main` when green, push.

## Decisions (agreed 2026-09-09)

1. **Impossible-value gate first** — cheap, server-side, no storage; rejects the "devtools posts `finalScore: 2e9`" attack.
2. **Rate limits on `/api/v2/*`** — none exist today; auth is already covered by Better Auth.
3. **CSP** — the one missing security header on the public app.
4. **Error-surface cleanup** — generic messages only, real 404/500 pages, HSTS on the API, `npm audit`.
5. **Heatmap / movement analysis** — current run only, React state only, wiped on navigate / restart / reload. Never `localStorage`, never DB. Click-discrete modes only.
6. **Bounded input-proof verification** — the real M15, scoped down: the client attaches a few small random windows of raw input; the server re-simulates only those windows and checks consistency; the proof is kept only for the current top ~50 per board. Requires publishing the public simulation packages first.
7. **Switch Track fire-state** — damage should accrue only while the left button is held; today it accrues from crosshair overlap alone. Engine change, possibly a protocol bump.
8. **Potato-PC benchmark** — the owner runs this manually; not in this plan.
9. **M17 final release** — after 1–7.

### Cut permanently (do not build)

Full deterministic replay of every run for every mode; per-second telemetry; daily/weekly/all-time board variants; friend/social graph; cover photos; server-synced achievements; any server-side heatmap or shot-coordinate storage; retrospective per-sensitivity analytics (deferred until after launch — the sensitivity engine itself is frozen and correct).

---

## File Structure

### Phase 1 — Impossible-value gate (`findmysensi-secure`)

| File                                               | Responsibility                                                                             | Action     |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ | ---------- |
| `packages/public-runtime/src/plausibility.ts`      | Pure `assertRunPlausibleV2(run)` — per-mode score / KPS / accuracy ceilings, no I/O        | Create     |
| `packages/public-runtime/src/plausibility.spec.ts` | Ceiling tests: legit run per family passes; inflated score / KPS / accuracy each rejected  | Create     |
| `packages/public-runtime/src/index.ts`             | Barrel                                                                                     | Add export |
| `apps/api/src/run-v2.ts`                           | Call `assertRunPlausibleV2` after schema parse, before `savePracticeRunV2`; 422 on failure | Modify     |
| `apps/api/src/run-v2.spec.ts`                      | Route test: implausible payload → 422, store not called                                    | Modify     |

### Phase 2 — `/api/v2/*` rate limiting (`findmysensi-secure`)

| File                              | Responsibility                                                                            | Action |
| --------------------------------- | ----------------------------------------------------------------------------------------- | ------ |
| `apps/api/src/rate-limit.ts`      | In-memory fixed-window limiter keyed on client IP + bucket name                           | Create |
| `apps/api/src/rate-limit.spec.ts` | Under limit allowed; over limit 429 with `Retry-After`; window resets                     | Create |
| `apps/api/src/run-v2.ts`          | Gate `POST /api/v2/runs` (30/min) and `GET /api/v2/leaderboards/*` (120/min) on client IP | Modify |
| `apps/api/src/run-v2.spec.ts`     | 31st submit in a window → 429                                                             | Modify |

### Phase 3 — Content-Security-Policy (`findmysensi`)

| File                                  | Responsibility                                                                             | Action |
| ------------------------------------- | ------------------------------------------------------------------------------------------ | ------ |
| `apps/web/next.config.mjs`            | Add `Content-Security-Policy` to the existing `headers()` block                            | Modify |
| `apps/web/app/csp.spec.ts`            | Assert the config string contains each required directive                                  | Create |
| `tests/e2e/specs/public-smoke.e2e.ts` | Assert no CSP violations in the browser console on `/`, `/app/train/grid`, `/leaderboards` | Modify |

### Phase 4 — Error-surface cleanup (both repos)

| File                                 | Responsibility                                                                                                                  | Action |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `apps/web/app/not-found.tsx`         | Branded 404, no framework detail                                                                                                | Create |
| `apps/web/app/error.tsx`             | Branded client-error boundary, no stack shown                                                                                   | Create |
| `apps/web/app/global-error.tsx`      | Root error boundary                                                                                                             | Create |
| `apps/api/src/app.ts`                | Add `Strict-Transport-Security` to `SECURITY_HEADERS`                                                                           | Modify |
| `apps/api/src/error-surface.spec.ts` | Grep-style test: every `catch` in `apps/api/src/*.ts` returns a message from a fixed allow-list, never `error.message`/`.stack` | Create |
| `SECURITY.md` (both repos)           | Note the `npm audit` cadence                                                                                                    | Modify |

### Phase 5 — Ephemeral movement / heatmap view (`findmysensi`)

| File                                                      | Responsibility                                                                                                                              | Action     |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `packages/trainer-runtime/src/run-trace.ts`               | `RunTrace` type + `createRunTraceRecorder()` — collects `{tick, aimYaw, aimPitch, targetX, targetY, targetRadius, hit}` per shot, in memory | Create     |
| `packages/trainer-runtime/src/run-trace.spec.ts`          | Recorder appends per shot; `toShotOffsets()` returns target-normalized `(dx, dy)` per shot                                                  | Create     |
| `packages/trainer-runtime/src/index.ts`                   | Barrel                                                                                                                                      | Add export |
| `apps/web/src/features/training/PracticeRunController.ts` | Feed the recorder from `handlePlayerShot`; pass the trace through `onComplete`                                                              | Modify     |
| `apps/web/src/features/results/movement-analysis.ts`      | Pure view-model: trace → scatter points, 5-way miss tally (`classifyMiss`), mean over/under-flick magnitude                                 | Create     |
| `apps/web/src/features/results/movement-analysis.spec.ts` | View-model tests                                                                                                                            | Create     |
| `apps/web/src/features/results/MovementHeatmap.tsx`       | Small Canvas2D scatter, drawn once from the view-model; nothing persisted                                                                   | Create     |
| `apps/web/src/features/results/PracticeResults.tsx`       | Render `<MovementHeatmap>` for click-discrete modes when a trace is present                                                                 | Modify     |

### Phase 6 — Bounded input-proof verification (both repos) — LATER, needs its own detailed sub-plan

| File                                                                   | Responsibility                                                                                                      | Action  |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------- |
| `packages/aim-core`, `packages/scenarios`, `packages/scoring` (public) | Publish as versioned npm packages so the private repo can `import` the deterministic sim                            | Publish |
| `packages/public-runtime/src/run-v2.ts` (secure)                       | Add optional `proof` to `PracticeRunSubmissionV2Schema`                                                             | Modify  |
| `packages/verify/src/replay-window.ts` (secure, new package)           | Re-simulate one tick-window from seed + scenario + the proof's input; return the window's hit count / partial score | Create  |
| `apps/api/src/run-v2.ts` (secure)                                      | On submit: verify N committed windows; mismatch → reject                                                            | Modify  |
| `packages/database/src/schema.ts` + migration `0010` (secure)          | `run_proof_v2` table, rows kept only for current top ~50 per board                                                  | Modify  |

### Phase 7 — Switch Track fire-state (`findmysensi`)

| File                                                      | Responsibility                                                   | Action |
| --------------------------------------------------------- | ---------------------------------------------------------------- | ------ |
| `packages/input-browser/src/ring-buffer.ts`               | Add `EVENT_KIND_FIRE_STATE = 4`                                  | Modify |
| `packages/input-browser/src/reduce.ts`                    | Emit a `fire-state` segment event with a `held: boolean`         | Modify |
| `packages/trainer-runtime/src/adapter.ts`                 | `onSimulationTick` gains a `fireHeld` argument (default `false`) | Modify |
| `packages/scenarios/src/switch-track/dev-v0.ts`           | Accrue damage only when `fireHeld`                               | Modify |
| `apps/web/src/features/training/PracticeRunController.ts` | Track held state from the reducer, pass to `onSimulationTick`    | Modify |
| Deterministic goldens for Switch Track                    | Regenerate                                                       | Modify |

---

## Phase 1 — Impossible-value anti-cheat gate

**Repo:** `findmysensi-secure`. **Storage:** none. **Est:** half a day.

### Task 1.1: `assertRunPlausibleV2` pure function

**Files:**

- Create: `packages/public-runtime/src/plausibility.ts`
- Test: `packages/public-runtime/src/plausibility.spec.ts`
- Modify: `packages/public-runtime/src/index.ts`

**Interfaces:**

- Consumes: `PracticeRunSubmissionV2` (`packages/public-runtime/src/run-v2.ts`) — has `modeId`, `finalScore`, `activeDurationMs`, `summary` (with `hits`, `shots`, `misses`, `accuracyPercentage`, `killsPerSecond` on click families; `onTargetPercentage` on tracking families).
- Produces:
  ```ts
  export class RunNotPlausibleErrorV2 extends Error {
    constructor(public readonly reason: string) {
      super(reason);
      this.name = "RunNotPlausibleErrorV2";
    }
  }
  export function assertRunPlausibleV2(run: PracticeRunSubmissionV2): void; // throws RunNotPlausibleErrorV2
  ```

**Ceiling derivation (documented in the file header):** each mode's ceiling is `world-record rate × 1.5 safety margin`, deliberately loose — the goal is to reject the physically impossible, not to police skill. The click-family score ceiling is `maxHits × hitPoints` where `maxHits = ceil(durationSeconds × maxKps)` and `hitPoints` is the mode's per-hit value; misses only lower a score, so a perfect run has `misses = 0`.

`PLAUSIBILITY_V2` table (fill every mode; grid is the worked example — 60 s runs, `computeGridDevScore` gives 1000 points/hit):

| modeId       | maxKps | hitPoints | maxScore (= ceil(60·maxKps)·hitPoints) | maxAccuracy |
| ------------ | ------ | --------- | -------------------------------------- | ----------- |
| grid         | 12     | 1000      | 720000                                 | 100         |
| multi        | 12     | 1000      | 720000                                 | 100         |
| pinpoint     | 8      | 1000      | 480000                                 | 100         |
| anchor-flick | 8      | 1000      | 480000                                 | 100         |
| microshot    | 10     | 1000      | 600000                                 | 100         |
| motion-flick | 8      | 1000      | 480000                                 | 100         |
| reaction     | 6      | 1000      | 360000                                 | 100         |
| headline     | 10     | 1000      | 600000                                 | 100         |
| turn180      | 4      | 1000      | 240000                                 | 100         |

`hitPoints` and `maxKps` must be re-derived by the implementer from each mode's `computeScore` in `packages/scoring/src/<mode>/dev-v0.ts` and a documented world-record rate; the table above is the shape and the grid values, not a licence to guess the rest.

Tracking families (`strafe`, `smooth-track`, `switch-track`) have no `killsPerSecond`; cap them on `onTargetPercentage ≤ 100` and `finalScore ≤ <perModeTrackingCeiling>` (again from `computeScore` at 100% on-target for `durationTicks`).

Checks `assertRunPlausibleV2` performs, each throwing `RunNotPlausibleErrorV2` with a distinct `reason`:

1. `finalScore > table[modeId].maxScore` → `"score above ceiling"`.
2. click family and `summary.killsPerSecond > table[modeId].maxKps` → `"kps above ceiling"`.
3. `summary.accuracyPercentage > 100` or `summary.onTargetPercentage > 100` → `"accuracy above 100"`.
4. `activeDurationMs` not within ±1 tick (7.8125 ms) of `durationSeconds × 1000` for the mode's canonical `durationTicks` → `"duration not canonical"`.
5. click family and `summary.hits > ceil(durationSeconds × table[modeId].maxKps)` → `"hit count above ceiling"`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import {
  assertRunPlausibleV2,
  RunNotPlausibleErrorV2,
} from "./plausibility.js";
import type { PracticeRunSubmissionV2 } from "./run-v2.js";

function gridRun(
  over: Partial<PracticeRunSubmissionV2> = {},
): PracticeRunSubmissionV2 {
  const summary = {
    id: "practice-x",
    modeId: "grid" as const,
    timestamp: 61_000,
    score: 151_200,
    durationSeconds: 60,
    exactReplayPreserved: true,
    inputOverflowEvents: 0,
    inputHighWaterMark: 8,
    hits: 155,
    shots: 174,
    misses: 19,
    accuracyPercentage: (155 / 174) * 100,
    killsPerSecond: 155 / 60,
    averageAcquisitionTicks: 32,
  };
  return {
    protocolVersion: 2,
    runClass: "practice",
    runId: "practice-x",
    modeId: "grid",
    scenarioVersion: 0,
    scoringVersion: 0,
    analyticsVersion: 1,
    seed: [1, 2, 3, 4],
    startedAt: 1_000,
    completedAt: 61_000,
    activeDurationMs: 60_000,
    finalScore: 151_200,
    clientEligibility: { leaderboardEligible: true, invalidationReasons: [] },
    settings: {
      fmsSensitivity: "0.175",
      nominalDpi: 800,
      cmPer360: 54.43,
      fovDegrees: 103,
      resolution: "1920x1080",
      backingWidth: 1920,
      backingHeight: 1080,
      cssWidth: 1920,
      cssHeight: 1080,
      devicePixelRatio: 1,
      scalingMode: "fill",
      fullscreen: true,
      graphicsPreset: "automatic",
      crosshairCode: null,
      rawPointerInputAccepted: true,
      platform: "Windows",
      browser: "Chrome",
      medianRenderFps: null,
      p95FrameTimeMs: null,
      inputOverflowEvents: 0,
      inputHighWaterMark: 0,
    },
    summary,
    ...over,
  } as PracticeRunSubmissionV2;
}

describe("assertRunPlausibleV2", () => {
  it("accepts a strong but physically possible grid run", () => {
    expect(() => assertRunPlausibleV2(gridRun())).not.toThrow();
  });

  it("rejects a score above the grid ceiling", () => {
    expect(() =>
      assertRunPlausibleV2(gridRun({ finalScore: 2_000_000_000 })),
    ).toThrow(RunNotPlausibleErrorV2);
  });

  it("rejects an impossible kills-per-second", () => {
    const run = gridRun();
    (run.summary as { killsPerSecond: number }).killsPerSecond = 40;
    expect(() => assertRunPlausibleV2(run)).toThrow(/kps/);
  });

  it("rejects accuracy over 100", () => {
    const run = gridRun();
    (run.summary as { accuracyPercentage: number }).accuracyPercentage = 140;
    expect(() => assertRunPlausibleV2(run)).toThrow(/accuracy/);
  });

  it("rejects a non-canonical active duration", () => {
    expect(() =>
      assertRunPlausibleV2(gridRun({ activeDurationMs: 5_000 })),
    ).toThrow(/duration/);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd findmysensi-secure && npx vitest run packages/public-runtime/src/plausibility.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `plausibility.ts`**

Header comment states the derivation rule. Export `PLAUSIBILITY_V2` (the full table — implementer derives every non-grid row from `packages/scoring`), `RunNotPlausibleErrorV2`, and `assertRunPlausibleV2` performing checks 1–5 above. Read `packages/public-runtime/src/run-v2.ts` for the exact `summary` union shape and use a discriminated check (`"killsPerSecond" in run.summary`) to tell click from tracking families. Canonical `durationTicks` per mode: read `packages/scenarios/src/<mode>/dev-v0.ts` `durationTicks` (all are `128 * 60` today) — hard-code a `DURATION_TICKS_V2` map keyed by modeId, do not import the scenarios package into the private repo.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `cd findmysensi-secure && npx vitest run packages/public-runtime/src/plausibility.spec.ts`
Expected: PASS.

- [ ] **Step 5: Export + typecheck**

Add `export * from "./plausibility.js";` to `packages/public-runtime/src/index.ts`. Run `npm run -w @findmysensi-secure/public-runtime typecheck`.

- [ ] **Step 6: Commit**

```bash
cd findmysensi-secure
git add packages/public-runtime/src/plausibility.ts packages/public-runtime/src/plausibility.spec.ts packages/public-runtime/src/index.ts
git commit -m "feat(anticheat): add per-mode impossible-value ceilings for V2 runs

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 1.2: wire the gate into `POST /api/v2/runs`

**Files:**

- Modify: `apps/api/src/run-v2.ts`
- Test: `apps/api/src/run-v2.spec.ts`

**Interfaces:**

- Consumes: `assertRunPlausibleV2`, `RunNotPlausibleErrorV2` from `@findmysensi-secure/public-runtime` (Task 1.1).

- [ ] **Step 1: Update the route test**

In `apps/api/src/run-v2.spec.ts`, add after the "forwards a client-ineligible flag" test:

```ts
it("rejects an implausible score before storing", async () => {
  const payload = validRunPayload();
  payload.finalScore = 2_000_000_000;
  (payload.summary as Record<string, unknown>).score = 2_000_000_000;
  const response = await handleRunV2Request(
    runRequest(JSON.stringify(payload)),
  );
  expect(response?.status).toBe(422);
  expect(mocks.savePracticeRunV2).not.toHaveBeenCalled();
});
```

(`validRunPayload()` already produces an internally consistent grid summary; the schema `superRefine` requires `summary.score === finalScore`, so both fields are set.)

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts`
Expected: FAIL — returns 201/400, not 422.

- [ ] **Step 3: Call the gate in `handlePracticeRunSubmission`**

In `apps/api/src/run-v2.ts`, immediately after the `PracticeRunSubmissionV2Schema.safeParse` success block and before `const canonicalPayload = ...`:

```ts
try {
  assertRunPlausibleV2(parsed.data);
} catch (error) {
  if (error instanceof RunNotPlausibleErrorV2) {
    return json({ message: "This run could not be accepted." }, 422);
  }
  throw error;
}
```

Add `assertRunPlausibleV2, RunNotPlausibleErrorV2` to the existing `@findmysensi-secure/public-runtime` import. Keep the client-facing message generic — do not echo `error.reason`.

- [ ] **Step 4: Run to verify it passes + full secure gate**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts && npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit, merge to main, push**

```bash
cd findmysensi-secure
git add apps/api/src/run-v2.ts apps/api/src/run-v2.spec.ts
git commit -m "feat(anticheat): reject implausible runs at /api/v2/runs with 422

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff feat/anticheat-impossible-values -m "Merge branch 'feat/anticheat-impossible-values'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d feat/anticheat-impossible-values
git push origin main
```

- [ ] **Step 6: Live check after deploy**

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://findmysensi.com/api/v2/runs \
  -H 'Content-Type: application/json' --data '{"bogus":true}'
```

Expected: `401` (auth) — the point is the endpoint is up; a real 422 needs an authed session and is covered by the vitest test.

---

## Phase 2 — Rate limiting on `/api/v2/*`

**Repo:** `findmysensi-secure`. **Storage:** none (in-memory). **Est:** half a day.

**Design note (put in the file header):** the limiter is a per-process in-memory fixed-window counter. Vercel functions are stateless and may run several instances, so the effective limit is `configuredLimit × instanceCount`. That is acceptable at launch scale — the goal is to stop a single script hammering the endpoint, not to enforce an exact global quota. Revisit with the Better Auth DB-backed limiter if abuse is seen.

### Task 2.1: in-memory fixed-window limiter

**Files:**

- Create: `apps/api/src/rate-limit.ts`
- Test: `apps/api/src/rate-limit.spec.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface RateLimitDecision {
    readonly allowed: boolean;
    readonly retryAfterSeconds: number;
  }
  export function createRateLimiter(opts: {
    windowSeconds: number;
    max: number;
  }): {
    check(key: string, now?: number): RateLimitDecision;
  };
  export function clientIpFromRequest(request: Request): string; // "x-vercel-forwarded-for" -> "x-forwarded-for" first entry -> "unknown"
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { clientIpFromRequest, createRateLimiter } from "./rate-limit.js";

describe("createRateLimiter", () => {
  it("allows up to max within a window then blocks with a retry hint", () => {
    const rl = createRateLimiter({ windowSeconds: 60, max: 3 });
    const t0 = 1_000_000;
    expect(rl.check("k", t0).allowed).toBe(true);
    expect(rl.check("k", t0 + 1).allowed).toBe(true);
    expect(rl.check("k", t0 + 2).allowed).toBe(true);
    const blocked = rl.check("k", t0 + 3);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it("resets after the window elapses", () => {
    const rl = createRateLimiter({ windowSeconds: 10, max: 1 });
    expect(rl.check("k", 0).allowed).toBe(true);
    expect(rl.check("k", 5_000).allowed).toBe(false);
    expect(rl.check("k", 10_001).allowed).toBe(true);
  });

  it("keys are independent", () => {
    const rl = createRateLimiter({ windowSeconds: 60, max: 1 });
    expect(rl.check("a", 0).allowed).toBe(true);
    expect(rl.check("b", 0).allowed).toBe(true);
  });
});

describe("clientIpFromRequest", () => {
  it("prefers x-vercel-forwarded-for", () => {
    const r = new Request("https://x.test/", {
      headers: {
        "x-vercel-forwarded-for": "203.0.113.7",
        "x-forwarded-for": "10.0.0.1, 10.0.0.2",
      },
    });
    expect(clientIpFromRequest(r)).toBe("203.0.113.7");
  });
  it("falls back to the first x-forwarded-for entry", () => {
    const r = new Request("https://x.test/", {
      headers: { "x-forwarded-for": "203.0.113.9, 10.0.0.2" },
    });
    expect(clientIpFromRequest(r)).toBe("203.0.113.9");
  });
  it("returns 'unknown' when no header is present", () => {
    expect(clientIpFromRequest(new Request("https://x.test/"))).toBe("unknown");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/rate-limit.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `rate-limit.ts`**

```ts
export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
}

interface Bucket {
  count: number;
  windowStartMs: number;
}

export function createRateLimiter(opts: {
  windowSeconds: number;
  max: number;
}) {
  const windowMs = opts.windowSeconds * 1000;
  const buckets = new Map<string, Bucket>();

  return {
    check(key: string, now: number = Date.now()): RateLimitDecision {
      const bucket = buckets.get(key);
      if (!bucket || now - bucket.windowStartMs >= windowMs) {
        buckets.set(key, { count: 1, windowStartMs: now });
        return { allowed: true, retryAfterSeconds: 0 };
      }
      if (bucket.count < opts.max) {
        bucket.count += 1;
        return { allowed: true, retryAfterSeconds: 0 };
      }
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((bucket.windowStartMs + windowMs - now) / 1000),
      );
      return { allowed: false, retryAfterSeconds };
    },
  };
}

export function clientIpFromRequest(request: Request): string {
  const vercel = request.headers.get("x-vercel-forwarded-for");
  if (vercel && vercel.trim()) return vercel.trim();
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}
```

Note: no unbounded growth in practice — buckets are small and self-expiring on next `check`; if paranoid, add a size cap that clears the map when it exceeds 10_000 keys. Include that cap.

- [ ] **Step 4: Run to verify it passes**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/rate-limit.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd findmysensi-secure
git add apps/api/src/rate-limit.ts apps/api/src/rate-limit.spec.ts
git commit -m "feat(api): in-memory fixed-window rate limiter + client-IP helper

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 2.2: apply the limiter in `handleRunV2Request`

**Files:**

- Modify: `apps/api/src/run-v2.ts`
- Test: `apps/api/src/run-v2.spec.ts`

- [ ] **Step 1: Update the route test**

```ts
it("rate-limits repeated run submissions from one IP", async () => {
  const req = () =>
    new Request("https://findmysensi.com/api/v2/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-vercel-forwarded-for": "203.0.113.50",
      },
      body: JSON.stringify(validRunPayload()),
    });
  let last: Response | null = null;
  for (let i = 0; i < 31; i += 1) last = await handleRunV2Request(req());
  expect(last?.status).toBe(429);
  expect(last?.headers.get("retry-after")).toBeTruthy();
});
```

Add `beforeEach` reset if the limiter is a module singleton — export a `__resetRateLimitersForTest()` from `run-v2.ts` and call it in `beforeEach`.

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts`
Expected: FAIL — 31st request is not 429.

- [ ] **Step 3: Wire the limiter**

At module scope in `apps/api/src/run-v2.ts`:

```ts
import { clientIpFromRequest, createRateLimiter } from "./rate-limit.js";

const submitLimiter = createRateLimiter({ windowSeconds: 60, max: 30 });
const readLimiter = createRateLimiter({ windowSeconds: 60, max: 120 });

export function __resetRateLimitersForTest(): void {
  // reachable only from tests; re-create by reassigning via a mutable holder if needed
}
```

Implement the reset by making the two limiters `let` and reassigning in `__resetRateLimitersForTest`. In `handleRunV2Request`, before dispatching:

```ts
if (url.pathname === RUNS_PATH && request.method === "POST") {
  const decision = submitLimiter.check(clientIpFromRequest(request));
  if (!decision.allowed) {
    return json({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }
}
if (url.pathname.startsWith(LEADERBOARD_PREFIX) && request.method === "GET") {
  const decision = readLimiter.check(clientIpFromRequest(request));
  if (!decision.allowed) {
    return json({ message: "Too many requests. Slow down." }, 429, {
      "Retry-After": String(decision.retryAfterSeconds),
    });
  }
}
```

- [ ] **Step 4: Run to verify it passes + full secure gate**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/run-v2.spec.ts && npm run typecheck && npm run lint && npm test`
Expected: all PASS.

- [ ] **Step 5: Commit, merge, push**

```bash
cd findmysensi-secure
git add apps/api/src/run-v2.ts apps/api/src/run-v2.spec.ts
git commit -m "feat(api): rate-limit /api/v2 run submits (30/min) and leaderboard reads (120/min)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff feat/api-v2-rate-limit -m "Merge branch 'feat/api-v2-rate-limit'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d feat/api-v2-rate-limit
git push origin main
```

---

## Phase 3 — Content-Security-Policy

**Repo:** `findmysensi`. **Storage:** none. **Est:** one evening plus a manual click-through.

### Task 3.1: add the CSP header

**Files:**

- Modify: `apps/web/next.config.mjs`
- Test: `apps/web/app/csp.spec.ts`

**Interfaces:**

- The existing `next.config.mjs` `headers()` returns one entry for `source: "/(.*)"` with a `headers` array. Add one more header object to that array.

**Policy (Next 15 App Router needs `'unsafe-inline'` for its bootstrap `<script>`; a nonce-based policy is a later refinement):**

```
default-src 'self';
base-uri 'self';
form-action 'self';
frame-ancestors 'none';
object-src 'none';
img-src 'self' data:;
font-src 'self' data:;
style-src 'self' 'unsafe-inline';
script-src 'self' 'unsafe-inline';
connect-src 'self';
```

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from "vitest";
import nextConfig from "../next.config.mjs";

describe("Content-Security-Policy header", () => {
  it("is present on all routes with the required directives", async () => {
    process.env.API_URL ||= "https://api.findmysensi.com";
    const groups = await nextConfig.headers();
    const all = groups.flatMap((g) => g.headers);
    const csp = all.find(
      (h) => h.key.toLowerCase() === "content-security-policy",
    );
    expect(csp).toBeTruthy();
    const value = csp!.value.replace(/\s+/g, " ");
    for (const directive of [
      "default-src 'self'",
      "frame-ancestors 'none'",
      "object-src 'none'",
      "img-src 'self' data:",
      "connect-src 'self'",
      "script-src 'self' 'unsafe-inline'",
    ]) {
      expect(value).toContain(directive);
    }
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi && npx vitest run apps/web/app/csp.spec.ts`
Expected: FAIL — no CSP header.

- [ ] **Step 3: Add the header**

In `apps/web/next.config.mjs`, build the policy string once above `nextConfig` and add it to the headers array:

```js
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline'",
  "connect-src 'self'",
].join("; ");
```

Add `{ key: "Content-Security-Policy", value: contentSecurityPolicy }` to the existing `headers` array.

- [ ] **Step 4: Run to verify it passes**

Run: `cd findmysensi && npx vitest run apps/web/app/csp.spec.ts && npm run -w @findmysensi/web typecheck`
Expected: PASS.

### Task 3.2: prove no CSP violations in the browser

**Files:**

- Modify: `tests/e2e/specs/public-smoke.e2e.ts`

- [ ] **Step 1: Add a CSP-violation smoke test**

```ts
test("no CSP violations on the main pages", async ({ page }) => {
  const violations: string[] = [];
  page.on("console", (msg) => {
    if (msg.text().includes("Content Security Policy"))
      violations.push(msg.text());
  });
  for (const path of ["/", "/leaderboards"]) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }
  expect(violations).toEqual([]);
});
```

- [ ] **Step 2: Build and run E2E**

Run:

```
cd findmysensi
NEXT_PUBLIC_ENABLE_INPUT_DIAGNOSTICS=1 API_URL=https://api.findmysensi.com npm run build
cd tests/e2e && API_URL=https://api.findmysensi.com CI= npx playwright test public-smoke.e2e.ts --project=chromium
```

Expected: all pass. If a violation appears, widen exactly the one directive it names (most likely `img-src` for the generated hero art, or `worker-src 'self' blob:` if a Web Worker is used) — do not fall back to `default-src *`.

- [ ] **Step 3: Manual click-through**

`npm run dev`, then load `/`, `/login`, `/register`, `/app`, `/app/train/grid`, play a full Grid Rush run, `/app/train/grid/results`, `/leaderboards`, `/app/profile`, `/tools/converter`. Confirm no console CSP errors and nothing renders broken (fonts, hero art, Canvas trainer, profile avatars).

- [ ] **Step 4: Full public gate, commit, merge, push**

```bash
cd findmysensi
npm run lint && npm run typecheck && npm test
git add apps/web/next.config.mjs apps/web/app/csp.spec.ts tests/e2e/specs/public-smoke.e2e.ts
git commit -m "feat(csp): add a Content-Security-Policy to the public app

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff feat/csp -m "Merge branch 'feat/csp'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d feat/csp
git push origin main
```

---

## Phase 4 — Error-surface cleanup

**Repos:** both. **Storage:** none. **Est:** half a day.

### Task 4.1: branded error pages (public)

**Files:**

- Create: `apps/web/app/not-found.tsx`, `apps/web/app/error.tsx`, `apps/web/app/global-error.tsx`

- [ ] **Step 1: Create `not-found.tsx`**

```tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <main className="app-shell">
      <div className="app-card">
        <h1 className="app-heading">Page not found</h1>
        <p className="app-subtext">That page does not exist.</p>
        <Link href="/" className="app-button">
          Back to home
        </Link>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Create `error.tsx`**

```tsx
"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="app-shell">
      <div className="app-card">
        <h1 className="app-heading">Something went wrong</h1>
        <p className="app-subtext">Try again, or head back to the homepage.</p>
        <button type="button" onClick={reset} className="app-button">
          Try again
        </button>
        <Link href="/" className="app-button app-button-ghost">
          Home
        </Link>
      </div>
    </main>
  );
}
```

No `error.message`, no `error.stack`, no `error.digest` rendered.

- [ ] **Step 3: Create `global-error.tsx`**

```tsx
"use client";

export default function GlobalError({
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <main style={{ fontFamily: "system-ui", padding: 24 }}>
          <h1>Something went wrong</h1>
          <button type="button" onClick={reset}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
```

- [ ] **Step 4: Verify + E2E for the 404**

Add to `tests/e2e/specs/public-smoke.e2e.ts`:

```ts
test("unknown routes render a branded 404 with no stack detail", async ({
  page,
}) => {
  const res = await page.goto("/this-route-does-not-exist");
  expect(res?.status()).toBe(404);
  await expect(
    page.getByRole("heading", { name: "Page not found" }),
  ).toBeVisible();
  await expect(page.locator("body")).not.toContainText("at Object.");
  await expect(page.locator("body")).not.toContainText("node_modules");
});
```

Run the build + E2E as in Phase 3 Step 2.

- [ ] **Step 5: Commit**

```bash
cd findmysensi
git add apps/web/app/not-found.tsx apps/web/app/error.tsx apps/web/app/global-error.tsx tests/e2e/specs/public-smoke.e2e.ts
git commit -m "feat(web): branded 404 and error boundaries, no framework detail leaked

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 4.2: HSTS on the API + catch-message audit (secure)

**Files:**

- Modify: `apps/api/src/app.ts`
- Create: `apps/api/src/error-surface.spec.ts`

- [ ] **Step 1: Write the audit test**

```ts
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const ALLOWED_MESSAGE_FRAGMENTS = [
  "temporarily unavailable",
  "Too many requests",
  "Authentication required",
  "Invalid",
  "not allowed",
  "too large",
  "could not be accepted",
  "already associated",
  "must be application/json",
  "Valid scenario and scoring versions are required",
];

describe("API error surface", () => {
  it("never returns error.message or error.stack to the client", () => {
    const dir = join(import.meta.dirname);
    const files = readdirSync(dir).filter(
      (f) => f.endsWith(".ts") && !f.endsWith(".spec.ts"),
    );
    for (const file of files) {
      const src = readFileSync(join(dir, file), "utf8");
      expect(
        src,
        `${file} must not put error.message in a response`,
      ).not.toMatch(/json\(\s*\{[^}]*message:\s*[^}]*error\.(message|stack)/s);
    }
  });

  it("declares HSTS in the security headers", () => {
    const src = readFileSync(join(import.meta.dirname, "app.ts"), "utf8");
    expect(src).toContain("Strict-Transport-Security");
  });
});
```

- [ ] **Step 2: Run to verify the HSTS assertion fails**

Run: `cd findmysensi-secure && npx vitest run apps/api/src/error-surface.spec.ts`
Expected: FAIL on the HSTS test (the message-leak test should already pass; if it fails, fix the offending `catch` to a generic message first).

- [ ] **Step 3: Add HSTS**

In `apps/api/src/app.ts`, in the `SECURITY_HEADERS` object add:

```ts
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
```

- [ ] **Step 4: Run to verify + `npm audit`**

Run:

```
cd findmysensi-secure && npx vitest run apps/api/src/error-surface.spec.ts && npm run typecheck && npm test
npm audit --omit=dev
cd ../findmysensi && npm audit --omit=dev
```

Fix any `high`/`critical` advisory that has a non-breaking patch; record anything left in each repo's `SECURITY.md` under a new "Known advisories" heading with the date.

- [ ] **Step 5: Update `SECURITY.md` in both repos**

Add a line: "Run `npm audit --omit=dev` before each release; triage `high`/`critical`."

- [ ] **Step 6: Commit, merge both repos, push**

```bash
cd findmysensi-secure
git add apps/api/src/app.ts apps/api/src/error-surface.spec.ts SECURITY.md
git commit -m "chore(security): HSTS on the API, error-surface audit test, audit cadence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff fix/error-surface -m "Merge branch 'fix/error-surface'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d fix/error-surface && git push origin main

cd ../findmysensi
git add SECURITY.md
git commit -m "docs(security): note the npm audit release cadence

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff fix/error-pages -m "Merge branch 'fix/error-pages'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d fix/error-pages && git push origin main
```

---

## Phase 5 — Ephemeral movement / heatmap view

**Repo:** `findmysensi`. **Storage:** none — React state for one run, discarded on navigate / restart / reload. **Est:** 2–3 days. **Applies to:** click-discrete modes only (the same set that implements `MissBreakdownCapable`: `grid`, `multi`, `pinpoint`, `anchor-flick`, `microshot`, `motion-flick`, `reaction`, `headline`, `turn180`).

### Task 5.1: `RunTrace` recorder

**Files:**

- Create: `packages/trainer-runtime/src/run-trace.ts`, `packages/trainer-runtime/src/run-trace.spec.ts`
- Modify: `packages/trainer-runtime/src/index.ts`

**Interfaces:**

- Produces:

  ```ts
  export interface RunTraceShot {
    readonly tick: number;
    readonly aimYaw: number; // angle units at the shot tick
    readonly aimPitch: number;
    readonly targetYaw: number; // nearest target centre at the shot tick
    readonly targetPitch: number;
    readonly targetRadius: number; // angle units
    readonly hit: boolean;
  }
  export interface RunTrace {
    readonly shots: readonly RunTraceShot[];
  }
  export interface RunTraceRecorder {
    record(shot: RunTraceShot): void;
    finish(): RunTrace;
  }
  export function createRunTraceRecorder(): RunTraceRecorder;
  export function toShotOffsets(trace: RunTrace): readonly {
    readonly dx: number;
    readonly dy: number;
    readonly hit: boolean;
  }[];
  // dx,dy are target-normalized: (aim - target) / targetRadius, so 1.0 == one radius off centre
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { createRunTraceRecorder, toShotOffsets } from "./run-trace.js";

describe("RunTrace", () => {
  it("collects shots and normalizes offsets to target radius", () => {
    const rec = createRunTraceRecorder();
    rec.record({
      tick: 10,
      aimYaw: 100,
      aimPitch: 0,
      targetYaw: 100,
      targetPitch: 0,
      targetRadius: 50,
      hit: true,
    });
    rec.record({
      tick: 20,
      aimYaw: 175,
      aimPitch: -25,
      targetYaw: 100,
      targetPitch: 0,
      targetRadius: 50,
      hit: false,
    });
    const trace = rec.finish();
    expect(trace.shots).toHaveLength(2);
    const offsets = toShotOffsets(trace);
    expect(offsets[0]).toEqual({ dx: 0, dy: 0, hit: true });
    expect(offsets[1]).toEqual({ dx: 1.5, dy: -0.5, hit: false });
  });

  it("finish() returns a frozen, independent snapshot", () => {
    const rec = createRunTraceRecorder();
    rec.record({
      tick: 1,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: true,
    });
    const a = rec.finish();
    rec.record({
      tick: 2,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    });
    expect(a.shots).toHaveLength(1);
    expect(Object.isFrozen(a.shots)).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi && npx vitest run packages/trainer-runtime/src/run-trace.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `run-trace.ts`**

Plain array push in `record`; `finish` returns `{ shots: Object.freeze([...shots]) }`. `toShotOffsets` maps each shot to `{ dx: (aimYaw - targetYaw) / targetRadius, dy: (aimPitch - targetPitch) / targetRadius, hit }`. No I/O, no imports beyond types.

- [ ] **Step 4: Run to verify it passes + export**

Add `export * from "./run-trace.js";` to `packages/trainer-runtime/src/index.ts`. Run `cd findmysensi && npx vitest run packages/trainer-runtime/src/run-trace.spec.ts && npm run -w @findmysensi/trainer-runtime typecheck`.

- [ ] **Step 5: Commit**

```bash
cd findmysensi
git add packages/trainer-runtime/src/run-trace.ts packages/trainer-runtime/src/run-trace.spec.ts packages/trainer-runtime/src/index.ts
git commit -m "feat(trainer-runtime): in-memory RunTrace recorder for post-run analysis

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5.2: feed the recorder from `PracticeRunController`, expose via `onComplete`

**Files:**

- Modify: `apps/web/src/features/training/PracticeRunController.ts`

**Interfaces:**

- Consumes: `createRunTraceRecorder`, `RunTrace` (Task 5.1).
- Produces: `PracticeRunCallbacks.onComplete` signature changes to `(result: RuntimeScoreResult, trace: RunTrace | null) => void` — `null` for non-click modes and headless/test harnesses.

- [ ] **Step 1: Read the current shot path**

Open `apps/web/src/features/training/PracticeRunController.ts`. `handlePlayerShot(currentTick)` calls `this.adapter.onShot(tick, this.playerYaw, this.playerPitch, this.prng)`. The adapter exposes `getRenderTargets()` (array of `TargetSpawnSpec` with `xAngleUnits`, `yAngleUnits`, `radiusAngleUnits`). Whether the shot hit is knowable by diffing metrics before/after `onShot`, or (cleaner) by reading `this.adapter.getMissBreakdown()` deltas — but the simplest reliable signal is the hit count from `this.adapter.computeMetrics(tick + 1)` before and after.

- [ ] **Step 2: Add the recorder**

- Add a private field `private traceRecorder: RunTraceRecorder | null = null;`.
- In `start()`, set `this.traceRecorder = this.adapterSupportsTrace() ? createRunTraceRecorder() : null;` where `adapterSupportsTrace()` returns `"getMissBreakdown" in this.adapter` (the click-discrete capability marker).
- In `handlePlayerShot`, before calling `this.adapter.onShot`, capture `hitsBefore = isClickMetrics(this.adapter.computeMetrics(currentTick + 1)) ? metrics.hits : 0`. After `onShot`, recompute `hitsAfter`. `const hit = hitsAfter > hitsBefore;`.
- Find the nearest target to `(playerYaw, playerPitch)` among `this.adapter.getRenderTargets()` at that tick (Euclidean in angle units on `xAngleUnits`/`yAngleUnits`). Record `{ tick: currentTick, aimYaw: Number(this.playerYaw), aimPitch: Number(this.playerPitch), targetYaw: nearest.xAngleUnits, targetPitch: nearest.yAngleUnits, targetRadius: nearest.radiusAngleUnits, hit }`.
- If `getRenderTargets()` is empty at that tick (shot into space), record with `targetYaw/targetPitch = aim`, `targetRadius = 1`, `hit = false` — a max-offset miss.

- [ ] **Step 3: Thread the trace through completion**

In `completeRun()`, replace `this.callbacks.onComplete(finalScore);` with:

```ts
const trace = this.traceRecorder ? this.traceRecorder.finish() : null;
this.callbacks.onComplete(finalScore, trace);
```

Update the `PracticeRunCallbacks` interface and every caller (`grep -rn "onComplete" apps/web/src` — the trainer shell that constructs the controller). Callers that ignore the trace pass through fine.

- [ ] **Step 4: Typecheck + existing controller tests**

Run: `cd findmysensi && npm run -w @findmysensi/web typecheck && npx vitest run apps/web/src/features/training`
Expected: PASS. Fix any controller test that asserts the old `onComplete` arity.

- [ ] **Step 5: Commit**

```bash
cd findmysensi
git add apps/web/src/features/training/PracticeRunController.ts
git commit -m "feat(trainer): record a per-shot RunTrace and hand it to onComplete

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5.3: movement-analysis view-model

**Files:**

- Create: `apps/web/src/features/results/movement-analysis.ts`, `apps/web/src/features/results/movement-analysis.spec.ts`

**Interfaces:**

- Consumes: `RunTrace`, `toShotOffsets` (Task 5.1); `classifyMiss` from `@findmysensi/analytics` (returns `{ direction: "left" | "right" | "up" | "down" | "unclear" }`).
- Produces:

  ```ts
  export interface MovementAnalysis {
    readonly points: readonly {
      readonly dx: number;
      readonly dy: number;
      readonly hit: boolean;
    }[]; // clamped to [-3, 3]
    readonly missTally: Readonly<
      Record<"left" | "right" | "up" | "down" | "unclear", number>
    >;
    readonly meanMissDistanceRadii: number; // mean |offset| over misses, 0 if no misses
    readonly overflickRatio: number; // misses landing beyond one radius / total misses, 0 if no misses
  }
  export function buildMovementAnalysis(trace: RunTrace): MovementAnalysis;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from "vitest";
import { buildMovementAnalysis } from "./movement-analysis.js";
import type { RunTrace } from "@findmysensi/trainer-runtime";

const trace: RunTrace = {
  shots: [
    {
      tick: 1,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: true,
    },
    {
      tick: 2,
      aimYaw: 25,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    }, // dx 2.5 right, overflick
    {
      tick: 3,
      aimYaw: 0,
      aimPitch: -5,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    }, // dy -0.5 down, underflick
  ],
};

describe("buildMovementAnalysis", () => {
  it("tallies miss directions and over/under flick", () => {
    const a = buildMovementAnalysis(trace);
    expect(a.points).toHaveLength(3);
    expect(a.missTally.right).toBe(1);
    expect(a.missTally.down).toBe(1);
    expect(a.meanMissDistanceRadii).toBeCloseTo((2.5 + 0.5) / 2, 5);
    expect(a.overflickRatio).toBeCloseTo(0.5, 5);
  });

  it("is all-zero for a flawless trace", () => {
    const a = buildMovementAnalysis({ shots: [trace.shots[0]!] });
    expect(a.meanMissDistanceRadii).toBe(0);
    expect(a.overflickRatio).toBe(0);
  });

  it("clamps extreme offsets to +/- 3 radii for plotting", () => {
    const a = buildMovementAnalysis({
      shots: [
        {
          tick: 1,
          aimYaw: 1000,
          aimPitch: 0,
          targetYaw: 0,
          targetPitch: 0,
          targetRadius: 10,
          hit: false,
        },
      ],
    });
    expect(a.points[0]!.dx).toBe(3);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `cd findmysensi && npx vitest run apps/web/src/features/results/movement-analysis.spec.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `movement-analysis.ts`**

`points` = `toShotOffsets(trace)` with each `dx`/`dy` clamped to `[-3, 3]`. For each miss, call `classifyMiss` with its offset (map `(dx, dy)` to whatever `classifyMiss`'s signature expects — read `packages/analytics/src/miss-classification.ts`) and increment `missTally`. `meanMissDistanceRadii` = mean of `Math.hypot(dx, dy)` over misses (unclamped). `overflickRatio` = fraction of misses with `Math.hypot(dx, dy) > 1`.

- [ ] **Step 4: Run to verify it passes**

Run: `cd findmysensi && npx vitest run apps/web/src/features/results/movement-analysis.spec.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd findmysensi
git add apps/web/src/features/results/movement-analysis.ts apps/web/src/features/results/movement-analysis.spec.ts
git commit -m "feat(results): movement-analysis view-model (scatter, miss tally, overflick)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

### Task 5.4: `MovementHeatmap` Canvas2D component + wire into results

**Files:**

- Create: `apps/web/src/features/results/MovementHeatmap.tsx`
- Modify: `apps/web/src/features/results/PracticeResults.tsx`

**Interfaces:**

- Consumes: `MovementAnalysis` (Task 5.3). `PracticeResults` already receives the latest run; it must also receive the `RunTrace | null` produced by `onComplete` (Task 5.2) — thread it through `AuthenticatedPracticeResults` → `PracticeResults` as a new optional prop `trace?: RunTrace | null`.

- [ ] **Step 1: Implement `MovementHeatmap.tsx`**

```tsx
"use client";

import { useEffect, useRef } from "react";
import type { MovementAnalysis } from "./movement-analysis.js";

const SIZE = 220;
const RADII_SPAN = 3; // plot covers +/- 3 target radii

export function MovementHeatmap({
  analysis,
}: {
  readonly analysis: MovementAnalysis;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, SIZE, SIZE);

    const toPx = (v: number) => SIZE / 2 + (v / RADII_SPAN) * (SIZE / 2);

    // target ring at radius 1
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.beginPath();
    ctx.arc(SIZE / 2, SIZE / 2, (1 / RADII_SPAN) * (SIZE / 2), 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(SIZE / 2, 0);
    ctx.lineTo(SIZE / 2, SIZE);
    ctx.moveTo(0, SIZE / 2);
    ctx.lineTo(SIZE, SIZE / 2);
    ctx.stroke();

    for (const p of analysis.points) {
      ctx.fillStyle = p.hit ? "rgba(163,230,53,0.85)" : "rgba(244,63,94,0.8)";
      ctx.beginPath();
      ctx.arc(toPx(p.dx), toPx(p.dy), 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [analysis]);

  return (
    <figure className="results-heatmap">
      <canvas
        ref={canvasRef}
        style={{ width: SIZE, height: SIZE }}
        aria-label="Shot placement relative to target centre"
      />
      <figcaption className="app-subtext">
        {analysis.missTally.left +
          analysis.missTally.right +
          analysis.missTally.up +
          analysis.missTally.down +
          analysis.missTally.unclear ===
        0
          ? "No misses this run."
          : `Misses lean ${dominantDirection(analysis.missTally)}. Mean miss ${analysis.meanMissDistanceRadii.toFixed(2)} radii, ${Math.round(analysis.overflickRatio * 100)}% overflick.`}
      </figcaption>
    </figure>
  );
}

function dominantDirection(t: MovementAnalysis["missTally"]): string {
  const entries = Object.entries(t).filter(([k]) => k !== "unclear") as [
    string,
    number,
  ][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0] && entries[0][1] > 0 ? entries[0][0] : "evenly";
}
```

- [ ] **Step 2: Wire into `PracticeResults.tsx`**

Where the results body renders (after the metric cards, before the actions), add:

```tsx
{
  trace && trace.shots.length > 0 ? (
    <section aria-label="Movement analysis" className="results-movement">
      <p className="app-section-label">Movement analysis · this run only</p>
      <MovementHeatmap analysis={buildMovementAnalysis(trace)} />
    </section>
  ) : null;
}
```

Import `buildMovementAnalysis` and `MovementHeatmap`. Add `trace?: RunTrace | null` to the component props and pass it from `AuthenticatedPracticeResults`. The trace comes from the trainer-shell state set in the `onComplete` callback — it lives in React state and is gone on unmount / navigation / reload; **no `localStorage`, no run-record field, nothing to clean up.**

- [ ] **Step 3: Add minimal styles**

Append to `apps/web/app/globals.css`:

```css
.results-movement {
  margin: 20px 0;
}
.results-heatmap {
  margin: 8px 0 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  align-items: flex-start;
}
.results-heatmap canvas {
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.25);
}
```

- [ ] **Step 4: Typecheck, unit, build, manual**

Run: `cd findmysensi && npm run typecheck && npm test && NEXT_PUBLIC_ENABLE_INPUT_DIAGNOSTICS=1 API_URL=https://api.findmysensi.com npm run build`
Manual: `npm run dev`, play a Grid Rush run, confirm the scatter renders on the results screen, press "Play Again" and confirm it resets, reload the results URL directly and confirm the section is absent (no trace after a fresh load — correct).

- [ ] **Step 5: Commit, merge, push**

```bash
cd findmysensi
git add apps/web/src/features/results/MovementHeatmap.tsx apps/web/src/features/results/PracticeResults.tsx apps/web/app/globals.css
git commit -m "feat(results): ephemeral per-run movement heatmap for click modes

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff feat/movement-heatmap -m "Merge branch 'feat/movement-heatmap'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d feat/movement-heatmap && git push origin main
```

---

## Phase 6 — Bounded input-proof verification (LATER — needs its own detailed sub-plan)

**Repos:** both. **Storage:** `run_proof_v2`, capped at the current top ~50 rows per board. **Est:** ~1 week after the prerequisite. **Status:** design only here. When Phases 1–5 are done and the owner greenlights, run the brainstorming skill on this phase and write a dedicated plan file. The blocker below must be cleared first.

### Prerequisite Task 6.0: publish the simulation packages

The deterministic simulation lives in the public repo (`@findmysensi/aim-core`, `@findmysensi/scenarios`, `@findmysensi/scoring`). The private repo cannot import them today — the ADR requires "private consumes immutable published public package releases". So:

- Decide the distribution channel: npm (public registry, matches the open-source posture) or a git submodule pinned to a tag.
- Version and publish `@findmysensi/aim-core`, `@findmysensi/scenarios`, `@findmysensi/scoring` (and their internal deps) at a fixed version.
- Add them to `findmysensi-secure`'s dependencies at that exact version.
- Prove a trivial import + one deterministic sim step runs inside a secure-repo vitest.

This task is the gate for everything else in Phase 6.

### Design (for the sub-plan)

**Client (`findmysensi`):**

- The ring buffer already holds every raw input event. On run completion, pick `K = 3` windows of `W = 1 second` (128 ticks) each. Window start ticks are `HMAC(seed, "windows") mod validRange`, so they are deterministic from the seed and cannot be chosen after the player sees their score.
- Build `proof = { windows: [{ startTick, events: RawInputEvent[] }], inputDigest: sha256(all events) }`. Expect ~1–3 KB; gzip before send.
- Add `proof` (optional) to the submission body.

**Protocol (`packages/public-runtime` in secure):**

- Extend `PracticeRunSubmissionV2Schema` with optional `proof`, strictly shaped and size-bounded (reject > 8 KB decoded).

**Server (`findmysensi-secure`, new `packages/verify`):**

- `replayWindow({ seed, modeId, scenarioVersion, scoringVersion, startTick, events })` → `{ hits, partialScore }` by running the published sim from `startTick` for `W` ticks with the supplied input.
- On submit: recompute the expected window starts from the seed; for each window, `replayWindow` and check the local hit rate is within tolerance of the run's overall claimed rate (e.g. window KPS must not exceed `finalKps × 1.75 + 1`). Any window failing → reject with 422, do not store.
- If `proof` is absent: accept the run but never let it rank above position `LEADERBOARD_PERCENTILE_MIN_PLAYERS_V2` — an unproven run can sit low on the board but cannot claim a top slot.

**Storage (`schema.ts` + migration `0010`):**

- `run_proof_v2 (id, board_id, user_id, run_record_id, proof_json, created_at)`, unique on `run_record_id`.
- When `leaderboard_entry_v2` evicts a user from a board (best-score-wins replaced, or they drop out of the top 50 on read), delete their `run_proof_v2` rows for that board. Net effect: at most ~50 proof rows per board.

**Explicit non-goals for Phase 6:** full-run capture; replaying the whole run; proof for tracking modes in v1 (click families first); any client-side anti-cheat.

---

## Phase 7 — Switch Track fire-state

**Repo:** `findmysensi`. **Est:** 2–3 days. May bump `analyticsVersion` (protocol-adjacent — run `npm run protocol:freeze:check` and update the frozen fixtures deliberately).

### Task 7.1: new input event kind through the pipeline

**Files:**

- Modify: `packages/input-browser/src/ring-buffer.ts`, `packages/input-browser/src/reducer.ts`
- Test: `packages/input-browser/test/*` (follow the existing reducer test style)

- [x] **Step 1: Add `EVENT_KIND_FIRE_STATE = 4`** to `ring-buffer.ts`, extend `EventKindCode`, and let the batch target carry a `held` bit in its existing `buttons: Uint8Array` lane (0 = up, 1 = down). Write a ring-buffer test that a fire-state event round-trips.

- [x] **Step 2: Emit a `fire-state` segment event** in `reducer.ts` — `{ kind: "fire-state", held: boolean, tick }`. The event source de-duplicates DOM state, and the reducer preserves every transition across drain batches. Test: down→up→down produces three canonical transitions with the right values, ticks, and order.

- [ ] **Step 3: Commit** (`feat(input): fire-state event kind for held-button gating`).

### Task 7.2: adapter + Switch Track damage gating

**Files:**

- Modify: `packages/trainer-runtime/src/adapter.ts` (`onSimulationTick(tick, yaw, pitch, fireHeld = false)`)
- Modify: `packages/scenarios/src/switch-track/dev-v0.ts`
- Modify: `apps/web/src/features/training/PracticeRunController.ts`
- Regenerate: Switch Track deterministic goldens

- [x] **Step 1: Add `fireHeld` to `onSimulationTick`** with a default of `false` so the other 11 adapters are unaffected. Update the interface doc comment.

- [x] **Step 2: Gate damage in `switch-track/dev-v0.ts`** — accrue on-target ticks only when `fireHeld === true`. Update the mode's unit tests for the new behaviour (holding vs not holding over a target).

- [x] **Step 3: Track held state in `PracticeRunController`** — maintain a `private fireHeld = false` updated from `fire-state` segment events in `handleSimulationTick`, and pass it into `this.adapter.onSimulationTick(...)`.

- [x] **Step 4: Add fixed-seed Switch Track fire-window golden evidence** and run `npm run protocol:freeze:check`. The audit found no pre-existing Switch Track golden fixture or regeneration command to update; Protocol V1 remains unchanged.

- [ ] **Step 5: Full public gate, commit, merge, push.**

```bash
cd findmysensi
npm run lint && npm run typecheck && npm test && npm run check:boundaries && npm run protocol:freeze:check && npm run build
git add -A
git commit -m "feat(switch-track): damage only while the fire button is held

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git checkout main && git merge --no-ff feat/switch-track-fire-state -m "Merge branch 'feat/switch-track-fire-state'

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git branch -d feat/switch-track-fire-state && git push origin main
```

---

## Phase 8 — Potato-PC benchmark (owner, manual)

Not implemented here. The owner runs the trainer on a real 7th-gen i3 / integrated-GPU / 8 GB / 1280×720 machine with Valorant also running, and records: frame time p50 / p95 / p99, simulation backlog (catch-up ticks per frame), input-buffer high-water mark, memory. If any mode misses the budget, file findings and open a follow-up plan.

## Phase 9 — M17 final release

- [ ] Phases 1–5 and 7 merged and deployed; Phase 6 either landed after its prerequisites or explicitly deferred; Phase 8 findings triaged.
- [ ] Run the full verify gate on both repos one last time.
- [ ] Tag both repos `v1.0.0`, write release notes summarising: 12 modes, Find My Sensi, workouts, monthly per-mode leaderboards, profile cosmetics, impossible-value anti-cheat, bounded-proof verification (if Phase 6 landed), CSP + rate limits.
- [ ] Update `docs/PROJECT_ROADMAP.md`: M14–M17 done.

---

## Self-Review

**Decision coverage:**

- Decision 1 (impossible-value gate) → Phase 1. ✅
- Decision 2 (rate limits) → Phase 2. ✅
- Decision 3 (CSP) → Phase 3. ✅
- Decision 4 (error cleanup, HSTS, npm audit) → Phase 4. ✅
- Decision 5 (ephemeral heatmap, never stored) → Phase 5; Task 5.4 Step 2 states explicitly there is no persistence path. ✅
- Decision 6 (bounded proof) → Phase 6, design + prerequisite only, flagged as needing its own plan. ✅
- Decision 7 (Switch Track fire-state) → Phase 7. ✅
- Decision 8 (potato benchmark) → Phase 8, owner-run. ✅
- Decision 9 (M17) → Phase 9. ✅
- Cut list → "Cut permanently" section; no task builds any of them. ✅

**Placeholder scan:** Phases 1–5 and 7 have concrete code in every code step. Phase 1's `PLAUSIBILITY_V2` table gives grid's real numbers and an explicit derivation rule for the rest (`world-record rate × 1.5`, from each mode's `computeScore`) rather than inventing all values — this is a deliberate "derive from source" instruction, not a TBD. Phase 6 is explicitly design-only with a named prerequisite and a "write its own plan" instruction; that is a scoping decision, not a placeholder.

**Type consistency:**

- `assertRunPlausibleV2(run: PracticeRunSubmissionV2): void` / `RunNotPlausibleErrorV2` — defined Task 1.1, consumed Task 1.2. ✅
- `createRateLimiter({windowSeconds, max}).check(key, now?) → RateLimitDecision` and `clientIpFromRequest(Request) → string` — defined Task 2.1, consumed Task 2.2. ✅
- `RunTrace` / `RunTraceShot` / `createRunTraceRecorder()` / `toShotOffsets()` — defined Task 5.1, consumed Tasks 5.2 (recorder), 5.3 (`toShotOffsets`, `RunTrace`), 5.4 (`RunTrace` prop). ✅
- `PracticeRunCallbacks.onComplete(result, trace)` — new arity defined Task 5.2, consumed Task 5.4. ✅
- `MovementAnalysis` / `buildMovementAnalysis(trace)` — defined Task 5.3, consumed Task 5.4. ✅
- `classifyMiss` returns `{direction: "left"|"right"|"up"|"down"|"unclear"}` — matches `packages/analytics/src/miss-classification.ts`; `missTally` keys in Task 5.3 use the same five. ✅
- Board id / path-segment leaderboard URL / seasonal format — Global Constraints match the shipped code. ✅
