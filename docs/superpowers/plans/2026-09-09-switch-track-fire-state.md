# Switch Track Fire-State Implementation Plan

**Status:** Implemented locally on `feat/switch-track-fire-state`. Automated gates are green; the real-mouse Switch Track check and merge/push remain.

**Goal:** Make Switch Track accrue damage only while the primary mouse button is held, without changing click-mode shot behavior or storing new telemetry.

## Decisions

1. A raw fire-state event is a real button transition. The browser event source emits `held: true` on the first captured left-button press and `held: false` on release. The reducer preserves each transition instead of trying to infer state across separate drain batches.
2. `CanonicalInputEvent` gains `CanonicalFireStateEvent`. `stepSimulation` treats it as camera-neutral because held state belongs to the mode runtime, not the shared camera/shot state.
3. `ModeRuntimeAdapter.onSimulationTick` gains an optional `fireHeld` parameter. Existing adapters remain source-compatible; Switch Track defaults a missing value to `false`.
4. Switch Track contact, acquisition, and on-target analytics remain unchanged. Only `damageTicks` is gated by `fireHeld`.
5. Bump Switch Track `scoringVersion` from `0` to `1`. The new trigger requirement changes which contact produces score and must start a fresh leaderboard partition. Keep `engineVersion=1` because fixed-tick/camera simulation and V1 wire encoding do not change. Keep `analyticsVersion=1` because metric fields and formulas do not change.
6. Protocol V1 files remain untouched. The fire-state type is not added to the frozen V1 network binary format. Any future proof serialization belongs to Phase 6 and Protocol V2.
7. No storage, dependency, WebGL, replay, or per-tick telemetry changes.

## Acceptance tests

- Ring buffer round-trips fire-state down and up through the existing `buttons` lane.
- Browser input emits one down transition plus the existing shot on left `mousedown`, one up transition on left `mouseup`, and no duplicates for repeated same-state events.
- Reducer preserves down/up/down transitions with tick and order.
- Shared simulation accepts fire-state events without changing camera, shots, or validity.
- Switch Track contact without fire records on-target time but never kills.
- Sustained fired contact kills only after `SWITCH_TRACK_TTK_TICKS` damage ticks.
- Switch Track adapter forwards held state to the engine.
- Run controller retains held state across simulation ticks and forwards later release.
- Existing click modes still receive the default behavior and their shot tests remain green.
- Switch Track definition reports `scoringVersion: 1`; leaderboard requests therefore use a new board identity.

## Tasks

### 1. Canonical and browser input pipeline

- Modify `packages/aim-core/src/input/types.ts` and `packages/aim-core/src/state/step.ts`.
- Modify `packages/input-browser/src/ring-buffer.ts`, `reducer.ts`, and `event-source.ts`.
- Extend aim-core, ring-buffer, reducer, and event-source tests first.

### 2. Runtime and scenario behavior

- Modify `packages/trainer-runtime/src/adapter.ts` and `switch-track-adapter.ts`.
- Modify `packages/scenarios/src/switch-track/dev-v0.ts`.
- Extend scenario and adapter tests first.
- Add a controller integration test proving down/hold/up propagation.

### 3. Version and deterministic evidence

- Set Switch Track `scoringVersion` to `1`.
- Add deterministic fixed-seed fire-window expectations to the Switch Track scenario tests. No pre-existing Switch Track golden fixture or regeneration command exists in this repository, so this test becomes the first mode-specific golden evidence.
- Run `npm run protocol:freeze:check` and confirm no V1 protocol file changes.

### 4. Verification

Run focused tests, then:

```text
npm run format:check
npm run lint
npm run typecheck
npm run typecheck --workspace @findmysensi/web
npm test
npm run check:boundaries
npm run decisions:check
npm run protocol:freeze:check
npm run build
```

Manual browser gate: hold left mouse while tracking to deal damage; release while still on target and confirm damage stops; press again and confirm damage resumes.
