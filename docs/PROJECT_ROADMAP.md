# FindMySensi — Project Roadmap & Status

**Last updated:** 2026-09-04
**Public repo HEAD:** `7ea466f` (+ uncommitted working-tree changes, see "Right Now" below)
**Secure repo HEAD:** `cea7dca`

This is the single durable reference for where FindMySensi is, why it's built the
way it is, and what's left. Read this before picking up work in a new session
instead of re-deriving context from scratch.

---

## 1. What FindMySensi is

A free, open-source, ultra-light browser FPS aim trainer built around one
differentiator: **sensitivity correctness**. Not "KovaaK's with 25,000
scenarios" — instead, a small number of carefully engineered exercises
(target: 10) plus deep analytics, benchmarks, and a real sensitivity-finding
system ("Find My Sensi"), all running fast enough to sit beside Valorant on a
weak laptop.

Two repos, kept separate deliberately:

- `findmysensi` (public) — Next.js app, trainer runtime, sensitivity math,
  scenarios. Open-source-suitable.
- `findmysensi-secure` (private) — auth, database, future official-score
  verification. Stays private even though the product is free.

Non-negotiable product boundaries (from the owner, not to be second-guessed):

- No user-generated exercises, no scenario editor, no community marketplace.
- No polling-rate setting exposed to the user anywhere — the input pipeline
  adapts internally and always uses a safe, 8000 Hz-capable buffer.
- No fake/mock data in production paths — real API or a real empty/error
  state, never a fabricated fallback.
- The trainer (post-login) must run on a potato PC: ~7th-gen i3, integrated
  GPU, 8 GB RAM, 1280×720, Valorant possibly running at the same time. Canvas2D
  only in the gameplay hot path — no WebGL/Three.js there. The pre-login
  marketing site is allowed to be visually ambitious; the trainer is not.

---

## 2. Right now — two live bugs from your first real manual test

You ran Gridshot in a real browser for the first time this session and hit two
problems. This is exactly the kind of thing automated tests can't catch (real
Pointer Lock and real mouse hardware don't exist in Vitest/jsdom or in
Playwright's simulated input), so treat manual browser testing as a
first-class verification step going forward, not an afterthought.

### 2a. Overlay / "clicking does nothing" bug — root-caused, fix in progress

Reproduced live in a real browser session: clicking **START GRIDSHOT** with
raw Pointer Lock unavailable causes the game to never actually start.
`gameState` stays `"ready"`, so the pre-game card (`z-20`, no
`pointer-events-none`) sits on top of the canvas forever — clicks land on that
card/backdrop, never reach the game, targets never register hits. That's the
"overlay blocking the mouse" you saw.

**Root cause, confirmed by reading the code:** `TrainerBootstrap.tsx`'s
`acquirePointerLock()` helper requests raw mouse input
(`unadjustedMovement: true`) but passes `fallbackToAdjustedMovement: false` —
explicitly disabling the ordinary-Pointer-Lock fallback that the underlying
`BrowserPointerLockController` already supports safely by default. Worse, the
caller's own gating checks `!acquisition.rawGranted` _before_ checking
`.locked`, and actively calls `document.exitPointerLock()` to undo a lock that
may have already succeeded. This directly contradicts the project's own
approved Phase 2 design constraint: _"Use Pointer Lock with
`unadjustedMovement: true` when supported and ordinary Pointer Lock as the
fallback."_ The code currently does the opposite — raw or nothing.

**Fix applied so far (one edit, uncommitted):** changed
`fallbackToAdjustedMovement: false` → `true` in `TrainerBootstrap.tsx`.

**Still needed:**

- Fix the caller-side gating in `startCountdownAndLock()` and the identical
  pattern in `handleResume()`: check `.locked` first (the real blocking
  condition), and treat `!rawGranted` as a **non-blocking warning** ("raw
  input unconfirmed, training will continue on adjusted input") rather than a
  hard refusal.
- Reconcile with the **uncommitted external changes already sitting in the
  working tree** on `pointer-lock.ts`, `event-source.ts`, and
  `capabilities.spec.ts` (see below) — someone/something has already been
  editing exactly this area. Read those diffs before touching this again;
  they may already contain a fix, a different fix, or work-in-progress that
  would conflict with mine.
- Re-verify live in a real browser (not just automated tests) once done.

### 2b. Sensitivity feels off vs. Valorant at the "same" number

Your report: FMS at `0.125` feels **slower** than Valorant's own `0.125` —
expected, since FMS uses the Aimlabs numeric scale (0.05°/count) which is
lower than Valorant's (0.07°/count), so equal numbers are never equal feel by
design. But then: FMS at `0.175` (the value our golden vector claims equals
Valorant `0.125`) feels _close to_ what real Aimlabs `0.175` should feel like,
but **a little too fast** — your own estimate is the correct value is closer
to `0.16`–`0.165`. That's roughly a 5-8% overshoot in our effective gain, not
a wildly broken architecture.

**Status: not yet investigated.** This needs a careful re-audit of the Q20
fixed-point browser-gain scaler (`packages/sensitivity/src/browser-gain.ts`)
and the DPI/counts-per-360 math, ideally cross-checked against
`docs/evidence/sensitivity-verification.md` — which is _also_ one of the
files with uncommitted external changes right now, so it may already reflect
someone's in-progress recalibration attempt. Read that diff first.

Your instruction: _"you can replace the sensi system and make it the same as
the Aimlabs one, as I think it's easier to make."_ Recommendation once I'm
back in this: audit what's actually different between our formula and
Aimlabs' real one before deciding whether to patch the existing arbitrary-
precision engine or genuinely replace it — a ~6% error smells like a
calibration constant or a rounding/DPI-normalization step, not necessarily a
wrong architecture, but I'll confirm rather than assume once I look.

**Do not touch further until you say go** — this is exactly the P0,
frozen-and-verified system the whole project is built around; it gets a
careful audit, not a guess.

---

## 3. What's actually done (verified, tested, pushed)

| Milestone    | What                                                                                                                                                                                                                                                                                                                                                                                                                                | Status                                                                                                                                                                            |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| M0           | Both repos green (format/lint/typecheck/test/build/E2E)                                                                                                                                                                                                                                                                                                                                                                             | ✅ Done, pushed                                                                                                                                                                   |
| M1           | Sensitivity architecture verified; polling-rate setting removed entirely, replaced with an always-safe 8K-capable buffer                                                                                                                                                                                                                                                                                                            | ✅ Done, pushed — **now in question, see 2b**                                                                                                                                     |
| M2           | Gridshot frozen: regression tests for duration/overflow gaps closed, dead scoring code removed                                                                                                                                                                                                                                                                                                                                      | ✅ Done, pushed                                                                                                                                                                   |
| M3           | Shared `ModeRuntimeAdapter` runtime built and proven against Gridshot with zero behavior change; `PracticeSummaryRecord` is now a discriminated union; routing goes through a `trainerModeManifest` instead of hardcoded `"grid"` checks                                                                                                                                                                                            | ✅ Done, pushed                                                                                                                                                                   |
| M4 (partial) | Pinpoint and Multi adapters built and tested. **Found and fixed a real crash bug** in the process: Pinpoint/Multi/Headline all stored unwrapped (possibly negative) target x-coordinates, which throws inside the collision system on the first shot roughly half the time — invisible until now because nothing before exercised these engines through the real hit-test path. Fixed at the source (wrap at spawn, matching Grid). | 🟡 Pinpoint + Multi adapters done; Headline adapter, results-union extension, `PracticeRunController` modeId generalization, manifest enablement, and UI copy audit still pending |

Public repo commit log for this session, oldest to newest:

```
11c3b8f  feat(sensitivity): arbitrary-precision conversion, verified profiles  [pre-session]
911a538  style: normalize CRLF to LF in 11 files                              [M0]
9501d71  feat(input): remove polling-rate setting, safe 8K buffer            [M1]
e39e6f0  test(grid): freeze duration/overflow regressions, remove dead code   [M2]
5efee91  feat(trainer-runtime): scaffold package, ModeRuntimeAdapter          [M3]
9e48db9  feat(trainer-runtime): discriminated-union PracticeSummaryRecord     [M3]
4e48bcf  feat(trainer-runtime): createGridModeAdapter                        [M3]
a708583  refactor(training): PracticeRunController is adapter-driven         [M3]
8f18fef  docs: M3 spec + implementation plan                                 [M3]
55bbca3  feat(trainer): route dispatch via trainerModeManifest               [M3]
c88f747  feat(analytics): FlickMetricsTracker.recordExpiration               [M4]
0211633  fix(scenarios): wrap spawned x-coordinates (real crash bug fix)     [M4]
7ea466f  feat(trainer-runtime): createMultiModeAdapter                       [M4]  ← current HEAD
```

Secure repo: only M0's formatting fix (`cea7dca`). No feature work there yet
— everything so far has been public-repo sensitivity/trainer work.

---

## 4. Full milestone roadmap (from the original brief, kept honest)

Legend: ✅ done · 🟡 in progress · ⬜ not started

- ✅ **M0** — Audit + green baseline, both repos
- ✅ **M1** — Sensitivity verification + automatic input-rate handling (no
  polling-rate UI) — _now needs a second pass, see §2b_
- ✅ **M2** — Gridshot freeze (regression coverage before touching shared code)
- ✅ **M3** — Shared multi-mode trainer runtime (adapter interface, results
  union, mode-manifest routing) — Gridshot only, proven correct
- 🟡 **M4** — First static modes: Pinpoint (done), Multi (done), Headline
  (pending) wired onto the M3 runtime as real playable modes, including
  results-union extension and route enablement
- ⬜ **M5** — Dynamic modes: Strafe, Smooth Track, Tempo. These have a
  genuinely different interaction model each (moving targets, continuous
  crosshair tracking, beat judgement) — audited in M3 but deliberately not
  built, since the adapter interface needed to prove itself against real
  modes first. **Known landmine to fix on the way in:** Strafe and Tempo
  almost certainly have the same unwrapped-xAngleUnits crash bug fixed for
  Pinpoint/Multi/Headline in M4 — confirmed via grep that neither wraps its
  spawn x-coordinate. Fix before wiring, not after.
- ⬜ **M6** — New final modes: Microshot, Reaction, Switch Track (not built at
  all yet — no engine, no scoring, nothing). Original designs needed, not
  ports of anything existing.
- ⬜ **M7** — Analytics: "why did I miss" classification, weakness detection,
  recommended-next-exercise — all deterministic, no fake advice
- ⬜ **M8** — Benchmarks + rank system (Iron→Elite, original names/art)
- ⬜ **M9** — Workouts / playlists / progressions (fixed 10-exercise catalog
  only, no UGC)
- ⬜ **M10** — Find My Sensi: replace the current preference-oriented
  `Math.random()`-based scaffold with real performance-based calibration
  (coarse → acclimation → precision/flick/tracking tests → counterbalanced
  confirmation → recommendation with LOW/MODERATE/HIGH confidence)
- ⬜ **M11** — Sensi Battle (A/B objective comparison) + simple Mouse Swap
  (DPI-only, no saved profiles)
- ⬜ **M12** — Profile cosmetics: avatars, frames, titles, ~20-30 achievements
- ⬜ **M13** — Full frontend redesign: premium pre-login marketing site
  (WebGL/3D allowed there, with reduced-motion fallback), polished
  authenticated dashboard — trainer itself stays Canvas2D-only
- ⬜ **M14** — Serverless deployment: public + secure Vercel projects, Turso,
  Resend, same-origin `/api/v1/*` rewrite
- ⬜ **M15** — Verified Gridshot competition pipeline (server-issued ticket →
  canonical run → server-computed score → verified PB), Gridshot first, then
  generalize
- ⬜ **M16** — Full QA / performance / security pass (potato-PC benchmarking,
  security headers, rate limits)
- ⬜ **M17** — Final release

---

## 5. Frozen facts — do not relitigate without new evidence

- **Gridshot:** 3 targets, 68,000 fixed-angle-unit radius, 128 Hz simulation,
  exactly 7,680 ticks (60s) per run, 5×5 grid slots, canonical wrapped yaw,
  inverted pitch from browser `movementY`.
- **Sensitivity golden vector:** Valorant `0.125` @ 2400 DPI = FMS/Aimlabs
  Default `0.175` @ 2400 DPI (`0.125 × 0.07 / 0.05 = 0.175`), `cmPer360 ≈
43.54`, eDPI `420`. **This exact vector is what §2b's manual test is now
  questioning — investigate, don't assume it's still right.**
- **Verified game profiles:** Valorant `0.07`, CS2 `0.022`, Apex `0.022`,
  Aimlabs Default `0.05`. Everything else (PUBG, OW2, Fortnite, R6, Quake,
  Unreal) stays explicitly research-required, never exposed as exact.
- **Input pipeline:** always allocates the safe 8000 Hz-capable buffer
  (16,384 events, 2.5ms batch budget) regardless of any setting. No user-
  facing polling-rate concept anywhere. `inputProcessing` stays in the
  protocol schema as a dead, accepted-but-ignored field for backward
  compatibility with old persisted settings.
- **`ModeRuntimeAdapter` interface** (traced against real code, not designed
  abstractly): `initialize(prng)`, `onSimulationTick(tick, yaw, pitch)` (fires
  every tick, click-discrete modes no-op it), `onShot(tick, yaw, pitch, prng)`
  (fires per discrete shot), `getRenderTargets()`, `computeMetrics
(elapsedTicks)`, `computeScore(metrics)`. `ClickMetrics = GridMetrics` is
  the shared shape for Grid/Pinpoint/Multi/Headline/Strafe; Smooth Track and
  Tempo will need their own metrics families when M5 gets there.

---

## 6. How to verify (every session, before calling anything done)

Public repo, from `findmysensi/`:

```
npm run format:check && npm run lint && npm run typecheck
npm run typecheck --workspace @findmysensi/web   # NOT covered by root tsc -b
npm test
npm run check:boundaries && npm run decisions:check && npm run protocol:freeze:check
npm run build
npm test --prefix tests/e2e   # needs a production build served first
```

Secure repo, from `findmysensi-secure/`:

```
npm run format:check && npm run lint && npm run typecheck
npm test && npm run db:migrations:check && npm run build
```

Manual/live-browser testing is not optional for anything touching Pointer
Lock, real mouse input, or sensitivity feel — this session's two bugs are
proof automated tests alone miss real hardware/browser behavior.

---

## 7. What needs a decision from you, not a guess

1. **§2a fix approach** — is "warn but don't block" the right call for
   unconfirmed raw input, or would you rather the game only ever run with
   confirmed raw input (accepting some users can't play at all)? Current plan
   assumes warn-and-continue, matching the project's own documented Phase 2
   intent, but flagging since it trades off strict precision for playability.
2. **§2b approach** — audit-and-patch the existing Decimal/Q20 engine, or a
   genuine replacement "made the same as Aimlabs"? Need to actually diff our
   formula against Aimlabs' real one before recommending either way.
3. **The uncommitted external changes** in the working tree right now
   (`SettingsClient.tsx`, `InGameSettingsModal.tsx`, `pointer-lock.ts`,
   `event-source.ts`, `sensitivity-verification.md`, `next.config.mjs`) need
   to be reviewed with you before I build anything more on top of them — I
   don't know yet whether they're your own in-progress fix, something else's
   work, or leftover experimentation.
