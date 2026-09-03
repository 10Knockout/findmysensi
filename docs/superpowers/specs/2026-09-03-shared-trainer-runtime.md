# Shared Multi-Mode Trainer Runtime — Design Spec

**Date:** 2026-09-03
**Status:** Approved for M3 (see master project brief, sections 26–30)

## Problem

`PracticeRunController` (`apps/web/src/features/training/PracticeRunController.ts`)
is Gridshot's runtime, but it is not generic: it directly imports
`GridScenarioEngine` and `computeGridDevScore`, hardcodes `modeId: "grid"` when
saving results, and its options type has no mode concept. Six other scenario
engines exist (Pinpoint, Multi, Headline, Strafe, Smooth Track, Tempo) with
real, tested engine/scoring logic, but zero frontend wiring — no route, no
component, not a single reference to their mode ids anywhere under `apps/web`.
All four `/app/train/[mode]` route files gate on a literal `mode !== "grid"`
string check, and `TrainerBootstrap.tsx` has its own redundant hardcoded guard.

An audit of all six unwired modes' actual engine interfaces (see
`docs/superpowers/plans/2026-09-03-shared-trainer-runtime.md` §Audit Findings
below) found they are **not** interchangeable behind a single "hit target by
id" verb:

- Grid / Pinpoint / Multi / Headline / Strafe are click-discrete
  (`onTargetHit(targetId, prng[, currentTick]) → replacement | null`), but the
  parameter list already isn't uniform across them.
- Tempo replaces the hit verb entirely with
  `processShot(currentTick, hitTargetId) → "perfect"|"early"|"late"|"miss"`.
- Smooth Track has no discrete hit verb at all — its per-frame call is
  `tick(currentTick, playerYaw, playerPitch) → { target, onTarget, errorUnits }`,
  driven by continuous crosshair position, not a shot event.
- Scoring/metrics are three incompatible families with zero shared fields
  (`GridMetrics`/`FlickMetrics`: hits/shots/misses/accuracy/KPS;
  `TrackingMetrics`: onTarget%/avg error; `TempoMetrics`: judgement counts).

Designing one interface that already knows how to represent all of this,
before a second real mode is ever wired to the frontend to validate it
against, would be guessing. That is explicitly out of scope for this
milestone — the master brief splits mode integration into M4 (Pinpoint,
Multi, Headline — the click-discrete family closest to Grid) and M5 (Strafe,
Smooth Track, Tempo — the genuinely divergent ones), specifically so the
abstraction gets validated incrementally against real modes instead of
speculatively.

## Scope for this milestone (M3)

Build the seam, prove it against the one mode that's actually finished and
frozen (Gridshot), and leave the seam correctly shaped for M4/M5 to extend —
without trying to solve M4/M5's problems now.

1. A small `ModeRuntimeAdapter<TMetrics>` interface that the generic runtime
   calls into every tick. Designed against all 7 modes' real current
   signatures (from the audit) so `onTick` already accommodates "process 0+
   shot events" (the click-discrete family), "ignore shot events, sample
   continuous player yaw/pitch every tick" (Smooth Track), and "advance a
   pre-baked schedule and record judgements" (Tempo) — without requiring any
   of those three families to share behavior, only a tick boundary and a
   render-target getter.
2. `createGridModeAdapter()` — the first (and only, this milestone) real
   adapter, wrapping the existing `GridScenarioEngine` /
   `computeGridDevScore` / `GridMetricsTracker` with zero behavior change.
   Gridshot's M2 freeze tests and existing `tests/browser/grid-practice.spec.ts`
   suite must pass unchanged against the refactored controller.
3. `PracticeRunController` becomes generic: it takes a `ModeRuntimeAdapter`
   instance instead of importing Grid's engine/scoring directly, and drives
   it through the existing fixed-tick/ring-buffer/pointer-lock plumbing
   (unchanged — that plumbing was already mode-agnostic).
4. `PracticeSummaryRecord` becomes a discriminated union on `modeId`, with
   exactly one member (`"grid"`) this milestone. The `"grid"` member's field
   shape is byte-identical to today's flat record, so no data migration is
   needed for existing `localStorage` history — this is a type-level
   restructuring only. Future modes add union members as they ship.
5. A frontend `trainerModeManifest` (keyed by mode id, entries carry the
   scenario registry entry, an optional adapter factory, and `enabled`)
   replaces the hardcoded `"grid"` string checks in all 4 route files and in
   `TrainerBootstrap`'s internal guard. Only `"grid"` is `enabled: true`.
   Every other mode still 404s — this milestone changes the _mechanism_
   routing decisions are made through, not which modes are actually playable.

## Explicitly not in scope for M3

- Wiring Pinpoint, Multi, Headline, Strafe, Smooth Track, or Tempo to any
  route or UI (M4/M5).
- Adding `TrackingMetrics`/`TempoMetrics` variants to the results union
  (speculative until a mode using them actually ships).
- Reconciling the duplicated `GridMetrics`/`FlickMetrics` classes, or the
  `Strafe` mode's "tracking" presentation category vs. its actual
  click-discrete engine (both are pre-existing inconsistencies noted for a
  future cleanup pass, not blockers for this milestone).
- Any change to Gridshot's actual gameplay values (target count, radius,
  duration, scoring formula) — those are frozen per M2.

## Interfaces

Traced directly against `PracticeRunController.handleSimulationTick`'s real
call structure (movement events update yaw/pitch inline in the tick loop
already, unrelated to any mode; shot events are the only branch that touches
mode-specific engine/metrics state). Two separate hooks, not one bundled
per-tick call, so each family only implements what it needs:

```ts
// packages/trainer-runtime/src/adapter.ts
export type ClickMetrics = GridMetrics; // the shape Grid/Pinpoint/Multi/Headline/Strafe share

export interface ModeRuntimeAdapter<
  TMetrics extends ClickMetrics = ClickMetrics,
> {
  readonly modeId: string;
  readonly definition: RankedScenarioDefinition;
  initialize(prng: PrngV1): void;
  /** Called once per simulation tick, always, after that tick's movement
   *  events have updated playerYaw/playerPitch. Continuous-tracking modes
   *  (M5's Smooth Track) sample the crosshair here. Click-discrete modes
   *  (this milestone's Grid) no-op. */
  onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void;
  /** Called once per discrete shot input event, in causal order, at the
   *  point in the tick loop the shot occurred. */
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

```ts
// packages/trainer-runtime/src/results.ts
export interface PracticeRunSummaryBase {
  readonly id: string;
  readonly timestamp: number;
  readonly score: number;
  readonly durationSeconds: number;
  readonly exactReplayPreserved: boolean;
  readonly inputOverflowEvents: number;
  readonly inputHighWaterMark: number;
}

export interface GridPracticeSummary extends PracticeRunSummaryBase {
  readonly modeId: "grid";
  readonly hits: number;
  readonly shots: number;
  readonly misses: number;
  readonly accuracyPercentage: number;
  readonly killsPerSecond: number;
}

export type PracticeSummaryRecord = GridPracticeSummary; // more variants join as modes ship
```

See the implementation plan for the full task breakdown.
