# FindMySensi — Project Roadmap & Status

**Last updated:** 2026-09-07
**Public repo HEAD:** `015c3a1` (M0-M12 complete and pushed)
**Secure repo HEAD:** `fdd7fb4` (M14 deploy adapter/config pushed)

This is the single durable reference for where FindMySensi is, why it's built the
way it is, and what's left. Read this before picking up work in a new session
instead of re-deriving context from scratch.

---

## 1. What FindMySensi is

A free, open-source, ultra-light browser FPS aim trainer built around one
differentiator: **sensitivity correctness**. Not "KovaaK's with 25,000
scenarios" — instead, a small number of carefully engineered exercises
(12, all shipped) plus deep analytics, benchmarks, and a real sensitivity-finding
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

## 2. Right now — status of the two bugs from your first manual test

### 2a. Overlay / "clicking does nothing" bug — FIXED, pushed

Root cause was `TrainerBootstrap.tsx`'s `acquirePointerLock()` passing
`fallbackToAdjustedMovement: false` (disabling the safe fallback) plus
caller-side gating that checked `rawGranted` before `.locked` and destructively
called `exitPointerLock()`. Both the flag and the gating (in
`startCountdownAndLock()` and `handleResume()`) are fixed and pushed —
`!rawGranted` is now a non-blocking warning, not a hard refusal. Confirmed via
live Chrome DevTools MCP reproduction during this session.

### 2b. Sensitivity feels off vs. Valorant at the "same" number — STILL GATED

Your report: FMS `0.175` (claimed-equal to Valorant `0.125`) felt a little
fast, your own estimate ~`0.16`–`0.165`. Math audit found the Q20 scaler
internally correct against the golden vector; a real ~6% gap, if it survives
re-test, is either the `0.05`/`0.07` constants being slightly off real
Aimlabs/Valorant behavior, or **the original test predating the Bug 2a
Pointer Lock fix** — meaning it may have compared FMS on OS-adjusted input
against Valorant's raw input, which alone would produce exactly this kind of
consistent overshoot.

**Do not touch `0.05`/`0.07` until you re-test on the current (2a-fixed)
build and say go.** This is the P0 frozen-and-verified system the whole
product is built around — a careful audit, not a guess, and it's your call to
make after you've actually felt the corrected build.

---

## 3. What's actually done (verified, tested, pushed)

M0 through M12 are complete and pushed to `origin main`. For the exact commit
list, run `git log --oneline` in the public repo. Highlights beyond the
original M4 checkpoint:

- **All 12 exercise modes** have real `ModeRuntimeAdapter` implementations,
  individually tested, wired into `trainerModeManifest`, playable end-to-end.
  Mode ids are stable and deliberately unchanged from their dev-era names;
  only the display titles follow the current spec:

  | Display name  | `modeId`       | Family    |
  | ------------- | -------------- | --------- |
  | Grid Rush     | `grid`         | click     |
  | Multi Burst   | `multi`        | click     |
  | Precision Six | `pinpoint`     | click     |
  | Anchor Flick  | `anchor-flick` | click     |
  | Micro Flick   | `microshot`    | click     |
  | Motion Flick  | `motion-flick` | click     |
  | Reflex Rush   | `reaction`     | click     |
  | Headshot Lane | `headline`     | click     |
  | 180 Flick     | `turn180`      | click     |
  | Strafe Track  | `strafe`       | tracking  |
  | Sphere Track  | `smooth-track` | tracking  |
  | Switch Track  | `switch-track` | switching |

  Tempo was removed outright. Strafe Track moved from the click family to
  no-click tracking, so it no longer reports `accuracyPercentage`.

- **Miss-direction classification** (`classifyMiss` in `@findmysensi/analytics`)
  wired into every click-discrete mode via the optional `MissBreakdownCapable`
  capability — feature-detected, not forced onto the tracking and switching
  modes that have no spatial-miss concept.
- **Analytics** (M7): `recommendNextExercise` — averages real
  `accuracyPercentage` per click-family mode, returns `null` below 2 distinct
  modes of history rather than fabricating a suggestion.
- **Ranks + benchmarks** (M8): 9-tier rank system (`ranks.ts`, Iron→Elite) on
  a 0-100 accuracy scale, explicitly provisional (no real population data
  yet); skill-category benchmarks (`benchmarks.ts`) grouped by the scenario
  registry's real `presentation.category` field, `null` for categories
  without qualifying data.
- **Workouts** (M9): 4 curated fixed sequences (`workouts.ts`), `/app/workouts`
  route. No user-generated workouts (product boundary).
- **Find My Sensi** (M10): `find-my-sensi.ts` — 5-candidate generation
  symmetric around a base sensitivity, deterministic counterbalanced test
  order, LOW/MODERATE/HIGH confidence recommendation from real measured
  accuracy only. `/app/calibrate` now runs 25 blinded 12-second blocks — five
  sensitivities across Grid Rush, Multi Burst, Strafe Track, Sphere Track and
  Reflex Rush — normalises each mode's scores against its own scale, and
  combines them as a weighted mean. The two tracking modes are weighted 0.5:
  most players track moving targets poorly at every sensitivity, so those
  blocks say more about raw skill than about fit. The candidate spread is
  ±10%, not ±25%, because one lucky block at a wide extreme could otherwise
  recommend a sensitivity far from the player's real one.
- **Mouse Swap** (M11): consolidated onto one game-agnostic
  `calculateMouseSwap(sensitivity, oldMouse, newMouse)` — pure DPI-ratio math,
  no saved profiles, no mouse hardware database (explicitly out of scope).
  Replaced a dead `Math.random()`-based legacy preference-calibration
  scaffold that had zero UI callers.
- **Sensi Battle removed:** its route, runtime kernel, dashboard link, and tests
  were intentionally removed. Find My Sensi is the sole sensitivity-testing
  workflow.

Secure repo now includes the account/product-shell APIs, synced profile
cosmetic IDs, Turso/Resend production guards, and a real Vercel Fetch-function
adapter. The external Turso, Resend, and Vercel resources are not provisioned
or smoke-tested yet.

---

## 4. Full milestone roadmap (from the original brief, kept honest)

Legend: ✅ done · 🟡 in progress · ⬜ not started

- ✅ **M0** — Audit + green baseline, both repos
- ✅ **M1** — Sensitivity verification + automatic input-rate handling (no
  polling-rate UI) — _now needs a second pass, see §2b_
- ✅ **M2** — Gridshot freeze (regression coverage before touching shared code)
- ✅ **M3** — Shared multi-mode trainer runtime (adapter interface, results
  union, mode-manifest routing) — Gridshot only, proven correct
- ✅ **M4** — First static modes: Pinpoint, Multi, Headline, all wired onto
  the M3 runtime as real playable modes
- ✅ **M5** — Dynamic modes: Strafe, Smooth Track, Tempo — each modeled with
  its own metrics family, not forced into `ClickMetrics`
- ✅ **M6** — New final modes: Microshot, Reaction, Switch Track — original
  designs, fully built (engine, scoring, adapter)
- ✅ **M7** — Analytics: miss-direction classification, weakness detection,
  recommended-next-exercise — all deterministic, no fake advice
- ✅ **M8** — Benchmarks + rank system (Iron→Elite, provisional v1 thresholds)
- ✅ **M9** — Workouts / playlists (fixed 4-workout catalog, no UGC)
- ✅ **M10** — Find My Sensi calibration kernel and live five-block flow (real
  performance-based, blinded, counterbalanced, confidence-scored)
- ✅ **M11** — simple Mouse Swap (DPI-only, no saved profiles); Sensi Battle
  was later removed from the product
- ✅ **M12** — Profile cosmetics: avatars (12 free presets), frames + titles
  (derived from `RANK_TIERS`), 25 real deterministic achievements. New
  `/app/profile` route.
- ✅ **M13** — Full frontend redesign: single-page, cyberpunk-minimal pre-login
  marketing site with Turret Road + Zodiak typography, generated editorial
  hero artwork, a lightweight animated training preview and loader, smooth
  reveal motion, and reduced-motion/low-power safeguards. Trainer remains
  Canvas2D-only.
- 🟡 **M14** — Serverless deployment: code/config complete for public + secure
  Vercel projects and same-origin `/api/v1/*` routing; external Turso/Resend
  provisioning, first deploy, and production smoke test remain
- ⬜ **M15** — Verified Gridshot competition pipeline (server-issued ticket →
  canonical run → server-computed score → verified PB), Gridshot first, then
  generalize
- ⬜ **M16** — Full QA / performance / security pass (potato-PC benchmarking,
  security headers, rate limits)
- ⬜ **M17** — Final release

**Current M14 boundary:** repository deployment wiring is complete and tested
locally. M14 is not complete until the owner provisions Turso and Resend,
repairs/authenticates the local Vercel CLI, deploys both projects, and passes
the documented health, registration, and email-delivery smoke checks.

---

## 5. Frozen facts — do not relitigate without new evidence

- **Grid Rush (`grid`):** 3 targets, 93,207 fixed-angle-unit radius (4.0 deg
  across), 128 Hz simulation, exactly 7,680 ticks (60s) per run, 5×5 grid
  slots spanning ±34° × ±22°, canonical wrapped yaw, inverted pitch from
  browser `movementY`. The spawn extents are rounded so both the half-width
  and the slot step stay whole multiples of a small gain — that is what keeps
  slot centres exactly addressable from integer mouse input in the
  deterministic tests, at a cost of 0.02° versus the raw spec figure.
- **Angle units:** 2^24 per full turn, so 1° = 46,603 units. Every scenario
  is authored in angular terms; there is no Z axis anywhere. "Depth" in
  Headshot Lane and Sphere Track is expressed purely as angular size and
  angular speed.
- **Unrestricted yaw** is unlocked by declaring `spawnAreaWidthUnits =
FULL_TURN_UNITS`, because `resolveCameraBounds` derives the yaw clamp from
  the spawn area. Sphere Track and 180 Flick rely on this; no engine change
  was needed for either.
- **Sensitivity golden vector:** Valorant `0.125` @ 2400 DPI = FMS/Aimlabs
  Default `0.175` @ 2400 DPI (`0.125 × 0.07 / 0.05 = 0.175`), `cmPer360 ≈
43.54`, eDPI `420`. A reported mismatch was traced to comparing FMS
  `0.175` against Aimlabs' **Valorant-profile** `0.175`, which is Aimlabs
  Default/FMS `0.245`. Do not add a browser multiplier for that profile error.
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
  the shared shape for the nine click modes; Strafe Track and Sphere Track
  share `TrackingMetrics`, and Switch Track has its own family. Because two
  modes now share the tracking family, `PracticeRunController` takes the mode
  id from the adapter rather than hardcoding one — hardcoding it previously
  filed every no-click run under a single mode.
- **`MissBreakdownCapable`** — optional, feature-detected capability
  (`getMissBreakdown(): Record<MissDirection, number>`), not part of the base
  adapter interface. Implemented by every click-discrete adapter; deliberately
  absent from Strafe Track/Sphere Track/Switch Track, which have no
  spatial-miss concept.
- **Switch Track firing:** the spec calls for damage only while the left
  button is held. The deterministic input pipeline carries discrete
  `MOVE`/`SHOT`/`INVALIDATE` events with no held-button state (`mouseup` is
  bound only to suppress browser gestures), so damage currently accrues from
  crosshair overlap alone. Gating it on a real fire-state needs a new event
  kind plumbed through the ring buffer, reducer, adapter interface and run
  controller — and may be a protocol change. Not yet done.

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

No sensitivity decision is currently required. Device-level parity remains an
explicitly unclaimed gate because the available physical comparison used the
wrong Aimlabs profile and the owner declined another test. The verified
`0.05`/`0.07` constants stay frozen unless new controlled evidence contradicts
them.
