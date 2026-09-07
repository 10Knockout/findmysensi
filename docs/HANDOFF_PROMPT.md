# FindMySensi — Continuation Prompt

Paste everything below to the AI picking up this project. It has zero prior
context — this document is the entire briefing. Do not skip the "Before you
touch anything" section.

---

## Who you are

You are the primary implementation engineer for **FindMySensi**, a free,
open-source browser FPS aim trainer. This is not a greenfield project — a
large amount of working, tested code already exists. Your job is to continue
it, not rewrite it. Audit before you assume; the actual repository state is
the source of truth, not this document's memory of it, which may be stale by
the time you read it.

## Repositories

```
FindMySensi/
├── findmysensi/          (public — Next.js app, trainer, sensitivity math)
└── findmysensi-secure/   (private — auth, database; keep separate, never merge)
```

Public repo remote: `https://github.com/10Knockout/findmysensi.git`
Secure repo remote: `https://github.com/10Knockout/findmysensi-secure.git`

At the time this was written:

- Public repo HEAD: `7ea466f` — but the working tree has uncommitted changes,
  see "Before you touch anything" below. Run `git log -5 --oneline` and
  `git status` yourself before doing anything else.
- Secure repo HEAD: `cea7dca`, clean, no feature work done there this session.

---

## Before you touch anything

1. Run `git status` and `git log -10 --oneline` in **both** repos. Do not
   trust the commit hash above — it will be stale.
2. In the public repo, the working tree very likely has **uncommitted changes
   on top of `7ea466f`** to these files, made by someone/something other than
   the session that produced this document:
   - `apps/web/src/features/settings/SettingsClient.tsx`
   - `apps/web/src/trainer/InGameSettingsModal.tsx`
   - `apps/web/src/trainer/TrainerBootstrap.tsx`
   - `apps/web/next.config.mjs`
   - `docs/evidence/sensitivity-verification.md`
   - `packages/input-browser/src/event-source.ts`
   - `packages/input-browser/src/pointer-lock.ts`
   - `packages/input-browser/test/capabilities.spec.ts`

   **Read every one of these diffs (`git diff <path>`) before writing a
   single line of code.** They touch exactly the two bug areas described
   below (Pointer Lock and sensitivity). They may already contain a fix, a
   different fix, or abandoned work-in-progress. Do not blindly overwrite
   them, and do not blindly build on top of them without understanding what
   they do. If genuinely unsure whether to keep, discard, or continue them,
   stop and ask the human (Hitesh) rather than guessing.

3. Only after you understand that diff, proceed to the two bugs below.

---

## Product identity (do not relitigate these without new instruction)

FindMySensi's differentiator is **sensitivity correctness**, not scenario
count. Target: exactly **10 curated exercises** (not thousands), plus deep
analytics, benchmarks, ranks, and a real sensitivity-finding tool ("Find My
Sensi"). Think "the useful core of Aiming.Pro, rebuilt independently, smaller,
faster, sensitivity-first" — not "open-source KovaaK's."

Hard boundaries, not up for reinterpretation:

- **No user-generated content.** No scenario editor, no custom exercise
  creator, no community marketplace. The 10-exercise catalog is fixed and
  curated.
- **No polling-rate setting anywhere in the UI.** The input pipeline
  auto-adapts internally and always uses a safe, 8000 Hz-capable buffer
  (16,384 events, 2.5ms batch budget). Never ask the user their mouse's
  polling rate. Never display "your mouse is 8000 Hz." This was explicitly
  removed already (see Milestone M1) — do not reintroduce it.
- **No fake/mock/placeholder data in production paths.** If an API call
  fails, show a real error state. If there's no data, show a real empty
  state. Never fall back to fabricated leaderboard entries, fake stats, fake
  online-player counts, or fake AI-sounding recommendations. Mocks are
  test-only, never reachable from production code paths.
- **Potato-PC trainer.** The post-login gameplay must run at a stable 60 FPS
  on: 7th-gen Intel i3-class CPU, integrated GPU, ~512MB shared graphics
  memory, 8GB RAM, 1280×720, with Valorant possibly running simultaneously in
  the background. Canvas2D only in the gameplay hot path — no WebGL,
  Three.js, shader backgrounds, or particle systems in the trainer itself.
  The **pre-login marketing site** may be visually rich (WebGL/3D allowed
  there) with a reduced-motion/no-WebGL fallback — that budget does not
  extend to the trainer.
- **Sensitivity is the P0 system.** It is deliberately over-engineered
  (arbitrary-precision decimal math, versioned profiles, cross-verified
  values) because correctness here is the entire point of the product. Do
  not casually adjust constants in this system. Any change needs to be
  audited against real evidence, not guessed.

---

## Architecture as it actually exists right now

### Package layout (public repo, npm workspaces)

```
apps/web/                      Next.js 16 app (App Router)
packages/aim-core/             fixed-point angle math, PRNG, collision, ticks
packages/input-browser/        ring buffer, pointer lock, event source, capacity policy
packages/protocol/             zod schemas (settings, auth, leaderboard, profile), Tick type
packages/render-canvas/        Canvas2D renderer, viewport transform
packages/scenarios/            per-mode scenario engines + scenario registry
packages/analytics/            per-mode metrics trackers (GridMetrics, FlickMetrics, ...)
packages/scoring/               per-mode score formulas
packages/sensitivity/          Decimal math, browser-gain scaler, game profile conversions
packages/trainer-runtime/      NEW this session — ModeRuntimeAdapter + concrete adapters
packages/crosshair/            crosshair editor/share-code
tests/e2e/                     Playwright, runs against a real production build
tests/browser/                 vitest-based integration tests exercising the real controller
tests/performance/             synthetic 125Hz-8000Hz input stress tests
```

### The trainer runtime (built this session, M3)

`apps/web/src/features/training/PracticeRunController.ts` is the actual
gameplay runtime. It is **mode-agnostic** — it owns the fixed 128Hz tick loop,
the input ring buffer, Pointer Lock wiring (via `TrainerBootstrap.tsx`),
sensitivity/movement application, and overflow tracking. It does **not**
import any specific scenario engine directly anymore. Instead it takes a
`ModeRuntimeAdapter` (constructor's 4th param, defaults to
`createGridModeAdapter()` for backward compatibility):

```ts
// packages/trainer-runtime/src/adapter.ts
export type ClickMetrics = GridMetrics; // shared shape: Grid/Pinpoint/Multi/Headline/Strafe

export interface ModeRuntimeAdapter<
  TMetrics extends ClickMetrics = ClickMetrics,
> {
  readonly modeId: string;
  readonly definition: RankedScenarioDefinition;
  initialize(prng: PrngV1): void;
  // Fires every simulation tick, always, after that tick's movement events
  // have updated playerYaw/playerPitch. Click-discrete modes no-op this.
  // Continuous-tracking modes (Smooth Track, later) sample the crosshair here.
  onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void;
  // Fires once per discrete shot input event, in causal order.
  onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void;
  getRenderTargets(): readonly TargetSpawnSpec[];
  computeMetrics(elapsedTicks: number): TMetrics;
  computeScore(metrics: TMetrics): ScoreResult;
}
```

Real adapters implemented so far: `createGridModeAdapter()`,
`createPinpointModeAdapter()`, `createMultiModeAdapter()`. All three live in
`packages/trainer-runtime/src/*-adapter.ts`, each with a full test suite in
`packages/trainer-runtime/test/`. **Read `packages/trainer-runtime/src/grid-adapter.ts`
and its test before writing a fourth adapter — copy its shape exactly.**

Routing goes through `apps/web/src/trainer/mode-manifest.ts`
(`trainerModeManifest: ReadonlyMap<string, TrainerModeManifestEntry>`,
`isTrainerModeEnabled(modeId)`). All four `/train/[mode]` and
`/app/train/[mode]` route files, plus `TrainerBootstrap.tsx`'s own guard, read
this manifest instead of comparing against a hardcoded `"grid"` string. Only
`"grid"` is currently `enabled: true`. Pinpoint and Multi have working
adapters but are **not yet enabled** in the manifest — that's part of the
unfinished M4 work below.

`PracticeSummaryRecord` (in `packages/trainer-runtime/src/results.ts`) is a
discriminated union on `modeId`, currently one member
(`GridPracticeSummary`). `apps/web/src/features/training/local-history.ts`
re-exports it and persists to `localStorage` under
`findmysensi:practice_history:v1`. **`PracticeRunController.completeRun()`
still hardcodes `modeId: "grid"` literally** — this is the next thing that
needs generalizing once a second mode is wired into the manifest (see M4
tasks below); there's an explicit code comment marking exactly this spot.

---

## KNOWN BUGS — fix these first, before any new feature work

### Bug 1: Game becomes unclickable ("overlay blocking everything")

**Reported symptom (from the product owner, testing live in a real browser):**
Clicking "START GRIDSHOT" appears to do something (countdown may or may not
run), but afterward the mouse feels captured/blocked and clicking on visible
targets does nothing — they never get destroyed. Feels like an invisible
overlay is intercepting all input.

**Root cause, confirmed by direct reproduction in a live browser session
(Chrome via CDP automation):** `TrainerBootstrap.tsx`'s `acquirePointerLock()`
helper requests raw mouse input (`unadjustedMovement: true`) but explicitly
passes `fallbackToAdjustedMovement: false` to the pointer-lock controller —
disabling a fallback that `packages/input-browser/src/pointer-lock.ts`'s
`BrowserPointerLockController` already implements safely and defaults to
`true` on its own. On top of that, the caller's gating logic in
`startCountdownAndLock()` checks `!acquisition.rawGranted` _before_ checking
`.locked`, and on that branch actively calls `document.exitPointerLock()` —
undoing a lock that may have already succeeded — then returns without
starting the run. Net effect: whenever the browser/OS/GPU combination can't
grant `unadjustedMovement` raw pointer lock (verified to happen under
automation; plausible under various real Chrome/Edge builds, OS mouse-
acceleration settings, or GPU driver combinations too), the game silently
refuses to ever start. `gameState` stays `"ready"`, and the pre-game overlay
(`className="absolute inset-0 z-20 ..."`, no `pointer-events-none`, around
line 597 of `TrainerBootstrap.tsx`) sits on top of the canvas forever,
swallowing every click.

This directly contradicts the project's own previously-approved design intent
(from `docs/superpowers/plans/2026-08-31-phase2-gridshot-stabilization.md`):
_"Use Pointer Lock with `unadjustedMovement: true` when supported and
ordinary Pointer Lock as the fallback."_ The current code does the opposite.

**Fix (partially applied already — check the uncommitted diff first per
"Before you touch anything" above; this may already be done, half-done, or
done differently):**

1. In `acquirePointerLock()`, change `fallbackToAdjustedMovement: false` to
   `true`.
2. In `startCountdownAndLock()`, reorder the gating: check `.locked` first
   (the actual blocking condition). If locked but `!rawGranted`, do **not**
   block — set a non-fatal warning (e.g. "Raw mouse input could not be
   confirmed in this browser; training will continue on adjusted input") and
   proceed to start the countdown/run anyway.
3. Apply the identical fix to `handleResume()`, which has the exact same
   raw-or-nothing pattern for resuming a paused run.
4. This is a browser-hardware-dependent bug — automated tests (Vitest,
   Playwright) do not exercise real Pointer Lock and will not catch
   regressions here. **Verify by actually running the dev server and clicking
   through it in a real Chrome window**, not just by running the test suite.

### Bug 2: Sensitivity comparison used the wrong Aimlabs profile

**Reported symptom:** Aimlabs `0.175` felt close to FMS `0.265`-`0.285`, while
Valorant `0.125` felt close to FMS `0.175`.

**Diagnosis (2026-09-07):** Aimlabs' persisted active game profile was
`VALORANT`, not `Aimlabs Default`. The number shown by Aimlabs is interpreted
on the active profile's scale. Therefore Aimlabs Valorant-profile `0.175` is
Aimlabs Default/FMS `0.245` (`0.175 × 0.07 / 0.05`), not FMS `0.175`. The rough
hand match around `0.275` is consistent with comparing against the wrong base
number plus measurement error; it does not establish a browser calibration
factor.

The controlled equivalences at equal DPI are:

- Valorant `0.125` = Aimlabs Valorant-profile `0.125`
- Aimlabs Valorant-profile `0.125` = Aimlabs Default `0.175` = FMS `0.175`
- Aimlabs Valorant-profile `0.175` = Aimlabs Default `0.245` = FMS `0.245`

**Resolution:** Keep the verified Valorant `0.07` and Aimlabs Default `0.05`
constants. Do not introduce the proposed global `~1.57` browser multiplier.
The UI now states which Aimlabs profile must be used, and the development
overlay accounts separately for DOM, ring-buffered, display-consumed, and
simulation-consumed movement. Device-level parity remains unclaimed because
the available physical test used the wrong profile and the owner declined
further tests.

---

## What's done and verified (as of this document)

All of the following passed the full verification gate (see "Verification
commands" below) and is pushed to `main` on the public repo. None of it
required manual browser testing to validate except where noted.

- **Both repos' CI baseline restored** (Prettier drift was CRLF-vs-LF, not
  real formatting issues).
- **Polling-rate setting removed entirely.** No user-facing choice anywhere.
  Input buffer always sized for the safe 8000Hz-capable case. Verified with
  125/500/1000/2000/4000/8000Hz synthetic stress tests plus a 45ms
  movement-to-shot ordering test, all still passing.
- **Gridshot frozen and regression-covered:** exact target count (3), radius
  (68,000 fixed-angle units), duration (7,680 ticks / 60s @ 128Hz), yaw
  wrapping, pitch inversion, deterministic + fresh seeds, pause/resume,
  paused-input rejection (verified at the correct layer —
  `attachInputListener`'s `shouldCaptureGameplayInput` gate, not the
  simulation tick), input overflow metadata (end-to-end, forced a real
  overflow and verified it surfaces into the saved result), settings
  application, results persistence. A dead scoring class (`GridEvaluator`,
  superseded by `computeGridDevScore`) was removed.
- **Shared multi-mode runtime (M3)** — the `ModeRuntimeAdapter` architecture
  described above, proven against Gridshot with the _entire pre-existing
  Gridshot test suite passing with zero edits to the test files themselves_.
- **Pinpoint and Multi adapters (M4, partial)** — both fully implemented and
  tested (hits, misses, Pinpoint's target-lifetime expiration via a new
  `FlickMetricsTracker.recordExpiration()` method, Multi's 60-target quota
  exhaustion). **A real, previously-invisible crash bug was found and fixed
  in the process:** `PinpointScenarioEngine`, `MultiScenarioEngine`, and
  `HeadlineScenarioEngine` all generated target x-coordinates via
  `prng.nextRange(-halfWidth, halfWidth+1)` and stored them **unwrapped**
  (i.e. sometimes negative), unlike `GridScenarioEngine` which wraps via
  `wrapYaw()` at spawn time. Every hit test
  (`packages/aim-core/src/collision/target.ts`'s `testAngularHit`) calls
  `createAngleUnits(target.xAngleUnits)` internally, which **throws a
  RangeError for negative input**. This means any of these three modes would
  have crashed on the first shot roughly half the time the moment they went
  live — invisible until now because no test before this exercised these
  engines through the real collision path (only in isolation). Fixed at the
  source: wrap `x` immediately at generation time in each engine's
  `spawnTarget`, matching Grid's existing pattern exactly.
  **This same bug almost certainly also affects Strafe and Tempo (M5,
  unstarted) — confirmed via `grep` that neither wraps its spawn
  x-coordinate either. Fix this before wiring those modes, not after.**

---

## Remaining milestone roadmap

Work in order. Each milestone should end with the full verification gate
green (see below), a real commit, and a push, before starting the next one.
Use small, TDD-style vertical slices (write the failing test, watch it fail
for the right reason, implement the minimum, watch it pass, commit) rather
than large speculative changes — this is exactly how M0-M4 were done and it
caught two real regressions early that a bigger, less incremental approach
would likely have missed.

### M4 — finish wiring Pinpoint, Multi, Headline (in progress)

Remaining tasks:

1. Implement `createHeadlineModeAdapter()` in
   `packages/trainer-runtime/src/headline-adapter.ts`, mirroring
   `grid-adapter.ts`'s shape exactly (Headline's engine signature is
   identical to Grid's: `initialize(prng)`, `onTargetHit(targetId, prng)` —
   no `currentTick` parameter, unlike Pinpoint). Full test suite matching the
   Pinpoint/Multi adapter test pattern.
2. Extend `PracticeSummaryRecord` in `packages/trainer-runtime/src/results.ts`
   with `PinpointPracticeSummary`, `MultiPracticeSummary`,
   `HeadlinePracticeSummary` — each identical in shape to
   `GridPracticeSummary` (same `FlickMetrics`/`GridMetrics` fields), differing
   only by the `modeId` literal discriminant.
3. Generalize `PracticeRunController.completeRun()` to write
   `modeId: this.adapter.modeId` (with an appropriate type assertion) instead
   of the hardcoded `"grid"` literal — the exact spot is marked with a code
   comment already.
4. Enable `pinpoint`, `multi`, `headline` in `trainerModeManifest`
   (`enabled: true`, wire their `createAdapter` factories).
5. Audit `TrainerBootstrap.tsx` and `InGameSettingsModal.tsx` for any
   Gridshot-specific copy/branding that would be misleading once other modes
   are reachable (e.g. hardcoded "Gridshot" title text, "GRIDSHOT" badge).
   Fix only what's actually wrong for a generic mode — don't do a full visual
   redesign here, that's M13.
6. **Manually play all three modes in a real browser** before calling this
   done — do not trust automated tests alone for gameplay feel, per both bugs
   found this session.

### M5 — dynamic modes: Strafe, Smooth Track, Tempo

These have three genuinely different interaction models (already audited,
not yet built):

- **Strafe**: click-discrete like Grid, but targets move — needs a per-tick
  physics step (`engine.tick(currentTick)`) wired into `onSimulationTick`
  before hit-testing in `onShot`. **Fix its unwrapped-x spawn bug first**
  (same fix pattern as M4's Pinpoint/Multi/Headline fix).
- **Smooth Track**: no discrete "shot" concept at all. Its real interaction
  is `engine.tick(currentTick, playerYaw, playerPitch) -> {target, onTarget,
errorUnits}`, called every tick regardless of clicks. Uses a completely
  different metrics shape (`TrackingMetrics`: onTarget%, average/max error --
  no hits/shots/misses/accuracy/KPS at all). This will require extending
  `ModeRuntimeAdapter`'s generic bound beyond `ClickMetrics`, or a parallel
  adapter concept -- think carefully about the interface here rather than
  forcing it into the click-discrete shape.
- **Tempo**: replaces the hit verb entirely with `processShot(currentTick,
hitTargetId) -> "perfect"|"early"|"late"|"miss"` (4-way outcome, not
  hit/miss). Uses `TempoMetrics` (judgement counts, no hits/shots/misses
  either). `computeTempoDevScore` also takes a second parameter
  (`maxConsecutivePerfects`) that the engine doesn't itself track -- the
  adapter will need to track streaks separately. **Fix its unwrapped-x spawn
  bug too.**

### M6 — new final modes: Microshot, Reaction, Switch Track

Not built at all yet — no engine, no scoring, nothing exists. These need
original design (not ports of anything), following the product brief's
descriptions: Microshot (small corrections near the crosshair, not just a
smaller Gridshot), Reaction (visual reaction + acquisition, timing must be
tick-authoritative not wall-clock), Switch Track (acquire -> track -> switch
-> reacquire, combining switching and tracking skills).

### M7 — analytics

"Why did I miss" classification (overshoot/undershoot/horizontal/vertical/
early/target-moved -- never fabricate a reason without evidence), deterministic
weakness detection, recommended-next-exercise based on real recent
performance data. No LLM calls, no random advice.

### M8 — benchmarks + rank system

Overall + per-skill benchmarks (Flick, Precision, Tracking, Switching,
Timing), each running a fixed subset of the 10 exercises. Original rank
names/tiers (suggested: Iron->Elite, 9 tiers) -- do not copy competitor rank
art or naming verbatim.

### M9 — workouts / playlists / progressions

All built from the fixed 10-exercise catalog only -- ordered sequences with
repeat counts, no new mechanics, no user-created exercises.

### M10 — Find My Sensi (flagship feature, real rebuild needed)

The current scaffold uses `Math.random()` and is preference-oriented -- replace
with real performance-based calibration: preflight -> reference block -> coarse
candidates -> acclimation -> precision/flick/tracking tests -> narrowed
finalists -> counterbalanced confirmation -> recommendation with an honest
LOW/MODERATE/HIGH confidence label. Never fabricate decimal precision the
evidence doesn't support.

### M11 — Sensi Battle + simple Mouse Swap

Sensi Battle: objective A/B sensitivity comparison using counterbalanced
blocks. Mouse Swap: simple DPI-ratio calculator only -- explicitly no saved
mouse profiles, no mouse hardware database (out of scope, decided already).

### M12 — profile cosmetics

~12-20 avatars, frame tiers, player titles, ~20-30 achievements. All backed
by real earned state, never fake/default-unlocked-looking-earned.

### M13 — full frontend redesign

Pre-login marketing site: premium, original, single-flow scrolling
experience. WebGL/3D/scroll-driven animation allowed here specifically, with
a genuine non-WebGL/reduced-motion fallback -- never make the site
unreadable without WebGL. Authenticated dashboard: polished but stays
lightweight. The trainer itself does **not** get this treatment -- it stays
Canvas2D, minimal UI, per the potato-PC requirement above.

### M14 — serverless deployment

Public + secure Vercel projects, Turso for persistent data (write-efficient --
one compact run-summary write per completed exercise, never raw mouse event
streams), Resend for email, same-origin `/api/v1/*` rewrite so cookies/CORS
stay simple.

### M15 — verified official score pipeline

Do not trust browser-submitted scores. Server-issued ticket -> canonical
seed/settings/version -> run -> bounded proof -> server-side replay/verification
-> server-computed score -> verified PB. Build this for **Gridshot only**
first, prove it end-to-end, then generalize to other modes. Do not build a
10-mode verification system before one mode's version works.

### M16 — full QA / performance / security pass

Potato-PC benchmarking (frame time p50/p95/p99, simulation backlog, memory,
input buffer high-water mark) -- browser CPU throttling is not a substitute
for real low-end hardware testing; ask the human to test on real hardware
before calling this done. Security headers, rate limits, CSP, no leaked stack
traces.

### M17 — final release

---

## Verification gate — run before calling ANY milestone done

Public repo (`findmysensi/`):

```bash
npm run format:check
npm run lint
npm run typecheck                              # root tsc -b, covers packages/*
npm run typecheck --workspace @findmysensi/web # NOT covered by the root command above -- apps/web has its own tsconfig with path aliases; this is the one that would have caught the sensitivity-verification.spec.ts / local-history.spec.ts type-narrowing issues found this session
npm test
npm run check:boundaries
npm run decisions:check
npm run protocol:freeze:check
npm run build
npm test --prefix tests/e2e     # needs a real production server running first, e.g. `npm run build && npm --prefix apps/web start -- -H 127.0.0.1 -p 3100` in the background, then point tests/e2e's config at that port
```

Secure repo (`findmysensi-secure/`):

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run db:migrations:check
npm run build
```

**Manual browser testing is not optional** for anything touching Pointer
Lock, real mouse/keyboard input, or sensitivity feel. Both bugs in this
document were invisible to the full automated suite above and only surfaced
from a human actually playing the game. Treat "all tests green" as necessary,
not sufficient, for those areas.

---

## Working conventions established this session (follow them)

- **Commit messages**: conventional-commit style (`feat(scope): ...`,
  `fix(scope): ...`, `test(scope): ...`, `docs: ...`), body explains _why_
  when the fix isn't self-evident from the diff.
- **Plans and specs** live in `docs/superpowers/plans/` and
  `docs/superpowers/specs/` respectively, dated `YYYY-MM-DD-<name>.md`. Look
  at `docs/superpowers/plans/2026-09-03-shared-trainer-runtime.md` for the
  house style before writing a new one for M5+.
- **No speculative genericity.** The `ModeRuntimeAdapter` interface was
  designed by tracing the _actual_ current call structure of
  `PracticeRunController`, not by imagining what a generic system should
  look like -- and it was deliberately scoped to only what Grid/Pinpoint/Multi
  needed, leaving Smooth Track/Tempo's harder problems for when those modes
  are actually being built. Keep doing this: audit real code before designing
  an abstraction, and don't build for a mode you're not implementing this
  milestone.
- **Every new package/module needs**: `package.json`, `tsconfig.json`
  referencing its real dependencies, registration in the **root**
  `tsconfig.json`'s `references` array, and if consumed from `apps/web`, an
  entry in `apps/web/package.json`'s `dependencies` **and**
  `apps/web/tsconfig.json`'s `compilerOptions.paths` -- miss any of these and
  `apps/web`'s typecheck (not the root one) will fail. Also run `npm install`
  once at the repo root after adding a new workspace package, or the module
  won't resolve at runtime even though the TS path alias resolves at
  typecheck time (this bit us this session).
- **`exactOptionalPropertyTypes` is enabled** in this repo's TS config.
  Setting an optional property to `undefined` explicitly is a type error --
  omit the property entirely instead (conditionally spread it in, don't
  assign `undefined`).
