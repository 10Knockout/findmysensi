# Shared Multi-Mode Trainer Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract Gridshot's engine/scoring-specific logic out of `PracticeRunController` behind a small `ModeRuntimeAdapter` interface, make routing decisions go through a mode manifest instead of hardcoded `"grid"` string checks, and restructure the local results record as a (currently 1-member) discriminated union — all with zero behavior change to Gridshot, proven by the existing frozen test suite passing unmodified.

**Architecture:** New package `@findmysensi/trainer-runtime` owns the adapter interface, the discriminated-union results type, and the first real adapter implementation (`createGridModeAdapter`). `PracticeRunController` keeps everything that was already mode-agnostic (fixed-tick loop, ring buffer, pointer-lock plumbing, sensitivity/movement application, overflow tracking) and delegates only the mode-specific parts (target state, hit resolution, metrics, scoring) to an injected adapter. A new `apps/web/src/trainer/mode-manifest.ts` maps mode id → `{ scenario entry, adapter factory, enabled }`; routes and `TrainerBootstrap`'s guard read it instead of comparing against the literal string `"grid"`.

**Tech Stack:** TypeScript, npm workspaces, Vitest, Next.js 16 (route files), existing fixed-tick 128 Hz simulation.

**Spec:** `docs/superpowers/specs/2026-09-03-shared-trainer-runtime.md`

## Global Constraints

- Gridshot's frozen behavior (M2: target count 3, radius 68,000, duration 7,680 ticks, yaw wrap, pitch inversion, movement-before-shot ordering, pause/resume, paused-input rejection, overflow metadata, deterministic + fresh seeds) must not change. The existing `tests/browser/grid-practice.spec.ts` and `packages/scenarios/test/grid-dev.spec.ts` suites must pass with **zero test-file edits** in Tasks 1–3, and only additive (not modified) assertions in Task 4.
- Do not wire Pinpoint, Multi, Headline, Strafe, Smooth Track, or Tempo to any route or UI in this plan — that is M4/M5. This plan builds the seam only.
- Do not add `TrackingMetrics`/`TempoMetrics` variants to the results union — only the `"grid"` member this milestone.
- `PracticeSummaryRecord`'s `"grid"` variant must be field-for-field identical to today's flat `PracticeSummaryRecord` in `local-history.ts`, so existing `localStorage` records keep parsing with no migration.
- Every new/modified file must pass `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm test` at the repo root before a task is considered done.

---

### Task 1: Scaffold `packages/trainer-runtime` and define the adapter interface

**Files:**

- Create: `packages/trainer-runtime/package.json`
- Create: `packages/trainer-runtime/tsconfig.json`
- Create: `packages/trainer-runtime/src/adapter.ts`
- Create: `packages/trainer-runtime/src/index.ts`
- Modify: `tsconfig.json:9` (root) — add `{ "path": "./packages/trainer-runtime" }` to `references`
- Test: `packages/trainer-runtime/test/adapter.spec.ts`

**Interfaces:**

- Produces: `ModeRuntimeAdapter<TMetrics extends ClickMetrics = ClickMetrics>` interface, `ClickMetrics` type alias (`= GridMetrics` from `@findmysensi/analytics`), both exported from `@findmysensi/trainer-runtime`.

- [ ] **Step 1: Write the failing test**

Create `packages/trainer-runtime/test/adapter.spec.ts`:

```ts
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import type { ModeRuntimeAdapter } from "../src/adapter.js";

describe("ModeRuntimeAdapter shape", () => {
  it("accepts a minimal object satisfying the interface", () => {
    let ticked = 0;
    let shots = 0;

    const adapter: ModeRuntimeAdapter = {
      modeId: "test-mode",
      definition: {
        modeId: "test-mode",
        scenarioVersion: 0,
        engineVersion: 1,
        scoringVersion: 0,
        durationTicks: 100,
        simulation: {
          maxActiveTargets: 1,
          targetRadiusAngleUnits: 1000,
          spawnAreaWidthUnits: 1000,
          spawnAreaHeightUnits: 1000,
          minTargetSeparationUnits: 0,
        },
        rankedSettings: {
          rankedEnabled: false,
          strictInputHealth: false,
          maxLagViolationTicks: 128,
        },
      },
      initialize: () => {},
      onSimulationTick: () => {
        ticked++;
      },
      onShot: () => {
        shots++;
      },
      getRenderTargets: () => [],
      computeMetrics: () => ({
        hits: 0,
        shots: 0,
        misses: 0,
        accuracyPercentage: 0,
        acquisitionTicks: [],
        avgAcquisitionTicks: 0,
        killsPerSecond: 0,
      }),
      computeScore: (metrics) => ({ score: 0, metrics }),
    };

    adapter.onSimulationTick(createTick(0), 0, 0);
    adapter.onShot(createTick(0), 0, 0, {} as never);

    expect(ticked).toBe(1);
    expect(shots).toBe(1);
    expect(adapter.getRenderTargets()).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: FAIL — package/module does not exist yet.

- [ ] **Step 3: Write minimal implementation**

Create `packages/trainer-runtime/package.json`:

```json
{
  "name": "@findmysensi/trainer-runtime",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "dependencies": {
    "@findmysensi/aim-core": "0.1.0",
    "@findmysensi/analytics": "0.1.0",
    "@findmysensi/protocol": "0.1.0",
    "@findmysensi/scenarios": "0.1.0",
    "@findmysensi/scoring": "0.1.0"
  },
  "scripts": {
    "build": "tsc -b",
    "typecheck": "tsc --noEmit",
    "test": "vitest run"
  }
}
```

Create `packages/trainer-runtime/tsconfig.json`:

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src",
    "composite": true
  },
  "include": ["src/**/*"],
  "references": [
    { "path": "../aim-core" },
    { "path": "../analytics" },
    { "path": "../protocol" },
    { "path": "../scenarios" },
    { "path": "../scoring" }
  ]
}
```

Create `packages/trainer-runtime/src/adapter.ts`:

```ts
import type { AngleUnits, PitchUnits, PrngV1 } from "@findmysensi/aim-core";
import type { GridMetrics } from "@findmysensi/analytics";
import type { Tick } from "@findmysensi/protocol";
import type {
  RankedScenarioDefinition,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import type { ScoreResult } from "@findmysensi/scoring";

/**
 * The metrics shape Grid, Pinpoint, Multi, Headline, and Strafe all share
 * (hits/shots/misses/accuracy/acquisition/KPS). Smooth Track and Tempo use
 * different shapes entirely and are not covered by this milestone.
 */
export type ClickMetrics = GridMetrics;

export interface ModeRuntimeAdapter<
  TMetrics extends ClickMetrics = ClickMetrics,
> {
  readonly modeId: string;
  readonly definition: RankedScenarioDefinition;

  initialize(prng: PrngV1): void;

  onSimulationTick(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void;

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

Create `packages/trainer-runtime/src/index.ts`:

```ts
export * from "./adapter.js";
```

Add to root `tsconfig.json` `references` array (after `{ "path": "./packages/scoring" }`):

```json
    { "path": "./packages/trainer-runtime" },
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: PASS (1 test)

Then run: `npm run typecheck` (repo root)
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add packages/trainer-runtime tsconfig.json
git commit -m "feat(trainer-runtime): scaffold package and ModeRuntimeAdapter interface"
```

---

### Task 2: Define the discriminated-union results type

**Files:**

- Create: `packages/trainer-runtime/src/results.ts`
- Modify: `packages/trainer-runtime/src/index.ts`
- Test: `packages/trainer-runtime/test/results.spec.ts`

**Interfaces:**

- Consumes: nothing from Task 1.
- Produces: `PracticeRunSummaryBase`, `GridPracticeSummary`, `PracticeSummaryRecord` (currently `= GridPracticeSummary`), all exported from `@findmysensi/trainer-runtime`.

- [ ] **Step 1: Write the failing test**

Create `packages/trainer-runtime/test/results.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import type { PracticeSummaryRecord } from "../src/results.js";

describe("PracticeSummaryRecord discriminated union", () => {
  it("accepts a grid-mode summary with the exact legacy flat field set", () => {
    const record: PracticeSummaryRecord = {
      id: "run-1",
      modeId: "grid",
      timestamp: 1_000_000,
      score: 54_000,
      hits: 60,
      shots: 65,
      misses: 5,
      accuracyPercentage: 92.3,
      durationSeconds: 60,
      killsPerSecond: 1.0,
      exactReplayPreserved: true,
      inputOverflowEvents: 0,
      inputHighWaterMark: 12,
    };

    expect(record.modeId).toBe("grid");
    expect(record.hits).toBe(60);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: FAIL — `../src/results.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `packages/trainer-runtime/src/results.ts`:

```ts
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

// More variants join this union as each mode ships (M4/M5). Kept as a
// 1-member union rather than a plain interface so future modes are additive,
// not a breaking reshape.
export type PracticeSummaryRecord = GridPracticeSummary;
```

Modify `packages/trainer-runtime/src/index.ts`:

```ts
export * from "./adapter.js";
export * from "./results.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: PASS (2 tests total)

- [ ] **Step 5: Commit**

```bash
git add packages/trainer-runtime
git commit -m "feat(trainer-runtime): add discriminated-union PracticeSummaryRecord"
```

---

### Task 3: Implement `createGridModeAdapter()`

**Files:**

- Create: `packages/trainer-runtime/src/grid-adapter.ts`
- Modify: `packages/trainer-runtime/src/index.ts`
- Modify: `packages/trainer-runtime/package.json` — no change needed (already depends on scenarios/analytics/scoring from Task 1)
- Test: `packages/trainer-runtime/test/grid-adapter.spec.ts`

**Interfaces:**

- Consumes: `ModeRuntimeAdapter` (Task 1), `GridScenarioEngine`/`GRID_DEV_V0_DEFINITION` (`@findmysensi/scenarios`), `createGridMetricsTracker`/`GridMetricsTracker` (`@findmysensi/analytics`), `computeGridDevScore` (`@findmysensi/scoring`), `findHitTarget` (`@findmysensi/aim-core`).
- Produces: `createGridModeAdapter(): ModeRuntimeAdapter<GridMetrics>`, exported from `@findmysensi/trainer-runtime`.

- [ ] **Step 1: Write the failing test**

Create `packages/trainer-runtime/test/grid-adapter.spec.ts`:

```ts
import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createGridModeAdapter } from "../src/grid-adapter.js";

describe("createGridModeAdapter", () => {
  it("initializes exactly 3 targets matching GridScenarioEngine's own determinism", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([101, 202, 303, 404]);

    adapter.initialize(prng);

    const targets = adapter.getRenderTargets();
    expect(targets.length).toBe(3);
    expect(targets.every((t) => t.radiusAngleUnits === 68_000)).toBe(true);
  });

  it("records a hit via onShot and reflects it in computeMetrics", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(5),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(6);
    expect(metrics.hits).toBe(1);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(0);

    // Still exactly 3 active targets after a hit-and-replace.
    expect(adapter.getRenderTargets().length).toBe(3);
  });

  it("records a miss via onShot when no target is at the aim point", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([9, 8, 7, 6]);
    adapter.initialize(prng);

    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
      prng,
    );

    const metrics = adapter.computeMetrics(2);
    expect(metrics.hits).toBe(0);
    expect(metrics.shots).toBe(1);
    expect(metrics.misses).toBe(1);
  });

  it("computeScore matches computeGridDevScore's own formula for the same metrics", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([1, 1, 1, 1]);
    adapter.initialize(prng);

    const target = adapter.getRenderTargets()[0]!;
    adapter.onShot(
      createTick(1),
      createAngleUnits(target.xAngleUnits),
      createPitchUnits(target.yAngleUnits),
      prng,
    );

    const metrics = adapter.computeMetrics(2);
    const result = adapter.computeScore(metrics);
    expect(result.score).toBe(1000); // 1 hit, 0 misses: 1*1000 - 0*200
  });

  it("onSimulationTick is a safe no-op for the click-discrete Grid mode", () => {
    const adapter = createGridModeAdapter();
    const prng = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prng);
    expect(() =>
      adapter.onSimulationTick(
        createTick(0),
        createAngleUnits(0),
        createPitchUnits(0),
      ),
    ).not.toThrow();
  });

  it("re-initializing resets metrics and target state for a second run", () => {
    const adapter = createGridModeAdapter();
    const prngA = createPrngV1([1, 2, 3, 4]);
    adapter.initialize(prngA);
    adapter.onShot(
      createTick(1),
      createAngleUnits(0),
      createPitchUnits(0),
      prngA,
    );
    expect(adapter.computeMetrics(2).shots).toBe(1);

    const prngB = createPrngV1([5, 6, 7, 8]);
    adapter.initialize(prngB);
    expect(adapter.computeMetrics(1).shots).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: FAIL — `../src/grid-adapter.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `packages/trainer-runtime/src/grid-adapter.ts`:

```ts
import {
  AngleUnits,
  findHitTarget,
  PitchUnits,
  PrngV1,
} from "@findmysensi/aim-core";
import {
  createGridMetricsTracker,
  GridMetrics,
  GridMetricsTracker,
} from "@findmysensi/analytics";
import { Tick } from "@findmysensi/protocol";
import {
  GRID_DEV_V0_DEFINITION,
  GridScenarioEngine,
  TargetSpawnSpec,
} from "@findmysensi/scenarios";
import { computeGridDevScore, ScoreResult } from "@findmysensi/scoring";
import { ModeRuntimeAdapter } from "./adapter.js";

class GridModeAdapter implements ModeRuntimeAdapter<GridMetrics> {
  public readonly modeId = "grid";
  public readonly definition = GRID_DEV_V0_DEFINITION;

  private readonly engine = new GridScenarioEngine(GRID_DEV_V0_DEFINITION);
  private metricsTracker: GridMetricsTracker = createGridMetricsTracker();
  private prng: PrngV1 | null = null;

  public initialize(prng: PrngV1): void {
    this.prng = prng;
    this.metricsTracker = createGridMetricsTracker();
    const initialTargets = this.engine.initialize(prng);
    for (const target of initialTargets) {
      this.metricsTracker.recordTargetSpawn(target.id, 0);
    }
  }

  public onSimulationTick(
    _tick: Tick,
    _playerYaw: AngleUnits,
    _playerPitch: PitchUnits,
  ): void {
    // Grid is click-discrete; nothing happens on ticks without a shot.
  }

  public onShot(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
    prng: PrngV1,
  ): void {
    const activeTargets = this.engine.getActiveTargets();
    const hitTarget = findHitTarget(playerYaw, playerPitch, activeTargets);

    if (hitTarget) {
      this.metricsTracker.recordShot(tick, hitTarget.id);
      const newTarget = this.engine.onTargetHit(hitTarget.id, prng);
      if (newTarget) {
        this.metricsTracker.recordTargetSpawn(newTarget.id, tick);
      }
    } else {
      this.metricsTracker.recordShot(tick, null);
    }
  }

  public getRenderTargets(): readonly TargetSpawnSpec[] {
    return this.engine.getActiveTargets();
  }

  public computeMetrics(elapsedTicks: number): GridMetrics {
    return this.metricsTracker.computeMetrics(elapsedTicks);
  }

  public computeScore(metrics: GridMetrics): ScoreResult {
    return computeGridDevScore(metrics);
  }
}

export function createGridModeAdapter(): ModeRuntimeAdapter<GridMetrics> {
  return new GridModeAdapter();
}
```

Modify `packages/trainer-runtime/src/index.ts`:

```ts
export * from "./adapter.js";
export * from "./results.js";
export * from "./grid-adapter.js";
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test --workspace @findmysensi/trainer-runtime`
Expected: PASS (8 tests total)

- [ ] **Step 5: Commit**

```bash
git add packages/trainer-runtime
git commit -m "feat(trainer-runtime): implement createGridModeAdapter"
```

---

### Task 4: Refactor `PracticeRunController` to be adapter-driven

**Files:**

- Modify: `apps/web/src/features/training/PracticeRunController.ts` (full rewrite of imports + engine/metrics-tracker fields + `start`/`handleSimulationTick`/`handlePlayerShot`/`writeSnapshot`/`completeRun`)
- Modify: `apps/web/src/features/training/local-history.ts` — replace the locally-defined `PracticeSummaryRecord` interface with a re-export from `@findmysensi/trainer-runtime` (no logic change)
- Modify: `apps/web/package.json` — add `"@findmysensi/trainer-runtime": "0.1.0"` to `dependencies`
- Modify: `apps/web/tsconfig.json` — add `"@findmysensi/trainer-runtime": ["../../packages/trainer-runtime/src/index.ts"]` to `compilerOptions.paths`
- Test: no new test file — this task's correctness gate is the **existing, unmodified** `tests/browser/grid-practice.spec.ts` (8 tests) and `packages/scenarios/test/grid-dev.spec.ts` (6 tests, frozen in M2) passing without a single edit to either file.

**Interfaces:**

- Consumes: `ModeRuntimeAdapter<GridMetrics>`, `createGridModeAdapter` (Task 3), `PracticeSummaryRecord`, `GridPracticeSummary` (Task 2).
- Produces: `PracticeRunController` constructor gains an optional 4th parameter `adapter: ModeRuntimeAdapter<GridMetrics> = createGridModeAdapter()`. All other public methods (`getRingBuffer`, `getState`, `getActiveSeed`, `setInputGain`, `recordBrowserInputEvent`, `getSensitivityInputVerificationSnapshot`, `start`, `pause`, `resume`, `abort`, `onAnimationFrame`, `handlePlayerShot`) keep identical signatures — this is the whole point of the task, and is what makes the existing test suite pass unmodified.

- [ ] **Step 1: Run the existing tests to establish the baseline**

Run: `npm test -- tests/browser/grid-practice.spec.ts packages/scenarios/test/grid-dev.spec.ts`
Expected: PASS (14 tests) — this is the pre-refactor baseline; Step 4 must show the identical pass count with the refactored controller underneath.

- [ ] **Step 2: N/A — this task is a behavior-preserving refactor, not new behavior**

(No new failing test to write first: the existing suite already specifies every behavior this task must preserve. Skipping straight to the minimal implementation and using the existing suite as the correctness oracle, per the task's own scope note above.)

- [ ] **Step 3: Rewrite `PracticeRunController.ts`**

Replace the import block (lines 1–45) with:

```ts
import {
  AngleUnits,
  clampPitch,
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  createShotTracker,
  createSnapshotBuffer,
  FULL_TURN_UNITS,
  PitchUnits,
  PrngV1,
  SnapshotBuffer,
  wrapYaw,
} from "@findmysensi/aim-core";
import { GridMetrics } from "@findmysensi/analytics";
import {
  createInputRingBuffer,
  createRawInputBatchTarget,
  InputRingBuffer,
  RawInputBatchTarget,
  reduceRawEvents,
} from "@findmysensi/input-browser";
import { createTick, Tick } from "@findmysensi/protocol";
import { AimRenderer } from "@findmysensi/render-canvas";
import {
  BrowserInputGain,
  createBrowserInputScaler,
  DEFAULT_BROWSER_INPUT_GAIN,
  DeterministicBrowserInputScaler,
} from "@findmysensi/sensitivity";
import { ScoreResult } from "@findmysensi/scoring";
import {
  createGridModeAdapter,
  ModeRuntimeAdapter,
} from "@findmysensi/trainer-runtime";
import {
  createFixedTickRunner,
  FixedTickRunner,
} from "../../trainer/fixed-tick-runner.js";
import { localPracticeHistory } from "./local-history.js";
import { generateRunSeed } from "./seed.js";
```

Replace the field declarations and constructor (from `export class PracticeRunController {` through the closing `}` of the constructor) with:

```ts
export class PracticeRunController {
  private state: PracticeRunState = "ready";
  private runner: FixedTickRunner | null = null;
  private prng: PrngV1 | null = null;
  private readonly adapter: ModeRuntimeAdapter<GridMetrics>;
  private shotTracker = createShotTracker();
  private ringBuffer: InputRingBuffer;
  private batchTarget: RawInputBatchTarget;
  private snapshotBuffer: SnapshotBuffer;
  private renderer: AimRenderer | null = null;
  private callbacks: PracticeRunCallbacks;

  private readonly totalDurationTicks: number;
  private inputScaler: DeterministicBrowserInputScaler;
  private playerYaw: AngleUnits = createAngleUnits(0);
  private playerPitch: PitchUnits = createPitchUnits(0);
  private totalInputUnitsX: number = 0;
  private totalInputUnitsY: number = 0;
  private movementEventCount: number = 0;
  private cumulativeEngineYawAngleUnits: number = 0;
  private cumulativeEnginePitchAngleUnits: number = 0;
  private totalOverflowEvents: number = 0;
  private highWaterMark: number = 0;
  private exactReplayPreserved: boolean = true;
  private activeSeed: readonly [number, number, number, number] | null = null;

  constructor(
    callbacks: PracticeRunCallbacks,
    renderer?: AimRenderer,
    optionsOrDuration: PracticeRunOptions | number = {},
    adapter: ModeRuntimeAdapter<GridMetrics> = createGridModeAdapter(),
  ) {
    const options: PracticeRunOptions =
      typeof optionsOrDuration === "number"
        ? { durationTicks: optionsOrDuration }
        : optionsOrDuration;
    const capacity = options.inputBufferCapacity ?? 4096;
    const gain = options.inputGain ?? DEFAULT_BROWSER_INPUT_GAIN;

    if (!Number.isSafeInteger(capacity) || capacity < 2) {
      throw new RangeError("Input buffer capacity must be an integer >= 2.");
    }
    this.callbacks = callbacks;
    this.renderer = renderer ?? null;
    this.adapter = adapter;
    this.totalDurationTicks =
      options.durationTicks ?? adapter.definition.durationTicks;
    this.inputScaler = createBrowserInputScaler(gain);
    this.ringBuffer = createInputRingBuffer(capacity);
    this.batchTarget = createRawInputBatchTarget(capacity);
    this.snapshotBuffer = createSnapshotBuffer(32);
  }
```

Everything from `public getRingBuffer()` through `public setInputGain`, `recordBrowserInputEvent`, and `getSensitivityInputVerificationSnapshot` is unchanged (delete nothing, these don't touch the engine/metrics fields being removed).

Replace `public start(...)`'s body (keep the signature) — remove the `metricsTracker` reset and `engine.initialize` block, replace with the adapter call:

```ts
  public start(seed?: readonly [number, number, number, number]): void {
    const effectiveSeed = seed ?? generateRunSeed();
    this.activeSeed = effectiveSeed;
    this.prng = createPrngV1(effectiveSeed);
    this.shotTracker.reset();
    this.playerYaw = createAngleUnits(0);
    this.playerPitch = createPitchUnits(0);
    this.inputScaler.reset();
    this.totalInputUnitsX = 0;
    this.totalInputUnitsY = 0;
    this.movementEventCount = 0;
    this.cumulativeEngineYawAngleUnits = 0;
    this.cumulativeEnginePitchAngleUnits = 0;
    this.totalOverflowEvents = 0;
    this.highWaterMark = 0;
    this.exactReplayPreserved = true;
    this.ringBuffer.reset();

    this.adapter.initialize(this.prng);

    this.writeSnapshot(0);

    this.runner = createFixedTickRunner({
      tickRateHz: 128,
      maxCatchUpTicksPerFrame: 8,
      onTick: (tick) => this.handleSimulationTick(tick),
      onRender: () => {
        if (this.renderer) {
          this.renderer.render(this.snapshotBuffer.getLatest());
        }
      },
    });

    this.state = "playing";
    this.callbacks.onStateChange(this.state);
    this.runner.start();
  }
```

`pause`, `resume`, `abort`, `onAnimationFrame` are unchanged.

Replace `handleSimulationTick`'s shot branch and add the per-tick adapter hook (keep the move-event branch exactly as-is — it's mode-agnostic):

```ts
  private handleSimulationTick(tick: Tick): void {
    if (tick >= this.totalDurationTicks) {
      this.completeRun();
      return;
    }

    const stats = this.ringBuffer.drainInto(this.batchTarget);
    if (stats.overflowCount > 0) {
      this.totalOverflowEvents += stats.overflowCount;
    }
    if (stats.highWaterMark > this.highWaterMark) {
      this.highWaterMark = stats.highWaterMark;
    }
    if (stats.lostTemporalPrecision) {
      this.exactReplayPreserved = false;
    }

    const clock = {
      timeToTick: (timeMs: number) =>
        createTick(Math.floor(timeMs / (1000 / 128))),
    };

    if (this.batchTarget.count > 0) {
      const segments = reduceRawEvents(this.batchTarget, clock);
      for (const segment of segments) {
        for (const event of segment.events) {
          if (event.kind === "move") {
            const yawDelta = this.inputScaler.scaleYaw(event.dx);
            const pitchDelta = this.inputScaler.scalePitch(event.dy);
            this.playerYaw = wrapYaw(this.playerYaw + yawDelta);
            this.playerPitch = clampPitch(this.playerPitch - pitchDelta);
            this.cumulativeEngineYawAngleUnits += yawDelta;
            this.cumulativeEnginePitchAngleUnits -= pitchDelta;
          } else if (event.kind === "shot") {
            this.handlePlayerShot(tick);
          } else if (event.kind === "invalidate") {
            this.exactReplayPreserved = false;
          }
        }
      }
    }

    this.adapter.onSimulationTick(
      createTick(tick),
      this.playerYaw,
      this.playerPitch,
    );

    this.callbacks.onTickProgress(tick, this.totalDurationTicks);
    this.writeSnapshot(tick);
  }
```

Replace `handlePlayerShot`:

```ts
  public handlePlayerShot(currentTick: number): void {
    if (!this.prng) return;

    const tick = createTick(currentTick);
    this.adapter.onShot(tick, this.playerYaw, this.playerPitch, this.prng);

    const currentMetrics = this.adapter.computeMetrics(currentTick + 1);
    const currentScore = this.adapter.computeScore(currentMetrics);
    this.callbacks.onScoreUpdate(
      currentScore.score,
      currentMetrics.hits,
      currentMetrics.misses,
    );
  }
```

Replace `writeSnapshot`'s target-reading line only (`this.engine.getActiveTargets()` → `this.adapter.getRenderTargets()`), rest unchanged:

```ts
  private writeSnapshot(tick: number): void {
    this.snapshotBuffer.beginWrite(
      createTick(tick),
      this.playerYaw,
      this.playerPitch,
    );

    const active = this.adapter.getRenderTargets();
    for (const target of active) {
      this.snapshotBuffer.writeTarget(
        target.id,
        target.xAngleUnits,
        target.yAngleUnits,
        target.radiusAngleUnits,
      );
    }

    this.snapshotBuffer.endWrite();
    this.snapshotBuffer.swap();
  }
```

Replace `completeRun`:

```ts
  private completeRun(): void {
    if (this.runner) {
      this.runner.stop("completed");
    }
    this.state = "completed";
    this.callbacks.onStateChange(this.state);

    const finalMetrics = this.adapter.computeMetrics(this.totalDurationTicks);
    const finalScore = this.adapter.computeScore(finalMetrics);

    // modeId is hardcoded here (rather than this.adapter.modeId) because
    // GridPracticeSummary is currently the only union member; this line
    // becomes mode-driven once a second variant ships (M4).
    localPracticeHistory.save({
      id: `practice-${Date.now()}`,
      modeId: "grid",
      timestamp: Date.now(),
      score: finalScore.score,
      hits: finalMetrics.hits,
      shots: finalMetrics.shots,
      misses: finalMetrics.misses,
      accuracyPercentage: finalMetrics.accuracyPercentage,
      durationSeconds: Math.round(this.totalDurationTicks / 128),
      killsPerSecond: finalMetrics.killsPerSecond,
      exactReplayPreserved: this.exactReplayPreserved,
      inputOverflowEvents: this.totalOverflowEvents,
      inputHighWaterMark: this.highWaterMark,
    });

    this.callbacks.onComplete(finalScore);
  }
}
```

`PracticeRunState`, `PracticeRunCallbacks`, `PracticeRunOptions`, `SensitivityInputVerificationSnapshot` type declarations above the class are unchanged.

Modify `apps/web/src/features/training/local-history.ts` — replace the local `PracticeSummaryRecord` interface (lines 1–15) with an import, leaving `isPracticeSummaryRecord`'s field checks **exactly as they are today** (do not tighten the `modeId` check — `local-history.spec.ts`'s existing test stores a non-`"grid"` `modeId` value and expects it to round-trip, so the runtime guard must stay permissive on that field even though the exported type only has one union member so far):

```ts
import type { PracticeSummaryRecord } from "@findmysensi/trainer-runtime";

export type { PracticeSummaryRecord };

const STORAGE_KEY = "findmysensi:practice_history:v1";
```

Modify `apps/web/package.json`: add `"@findmysensi/trainer-runtime": "0.1.0",` to the `dependencies` object (alphabetically, after `"@findmysensi/scoring"` and before `"@findmysensi/sensitivity"`).

Modify `apps/web/tsconfig.json`: add `"@findmysensi/trainer-runtime": ["../../packages/trainer-runtime/src/index.ts"],` to `compilerOptions.paths` (after the `"@findmysensi/scoring"` entry).

- [ ] **Step 4: Run the existing tests to verify zero regressions**

Run: `npm test -- tests/browser/grid-practice.spec.ts packages/scenarios/test/grid-dev.spec.ts`
Expected: PASS (14 tests) — identical count and content to Step 1's baseline.

Then run: `npm test` (full suite) and `npm run typecheck` (repo root)
Expected: both PASS with no other files affected.

- [ ] **Step 5: Commit**

```bash
git add apps/web packages/trainer-runtime
git commit -m "refactor(training): make PracticeRunController adapter-driven

PracticeRunController no longer imports GridScenarioEngine,
computeGridDevScore, or GridMetricsTracker directly. It delegates all
mode-specific state to an injected ModeRuntimeAdapter, defaulting to
createGridModeAdapter() for source compatibility with every existing
call site. Zero behavior change: the full pre-existing Gridshot test
suite passes unmodified."
```

---

### Task 5: Build `trainerModeManifest` and generalize routing

**Files:**

- Create: `apps/web/src/trainer/mode-manifest.ts`
- Modify: `apps/web/app/train/[mode]/page.tsx`
- Modify: `apps/web/app/train/[mode]/results/page.tsx`
- Modify: `apps/web/app/app/train/[mode]/page.tsx`
- Modify: `apps/web/app/app/train/[mode]/results/page.tsx`
- Modify: `apps/web/src/trainer/TrainerBootstrap.tsx` (guard at line ~366, `PracticeRunController` construction at line ~247)
- Test: `apps/web/src/trainer/mode-manifest.spec.ts`

**Interfaces:**

- Consumes: `defaultScenarioRegistry`, `ScenarioEntry` (`@findmysensi/scenarios`), `createGridModeAdapter`, `ModeRuntimeAdapter` (`@findmysensi/trainer-runtime`).
- Produces: `TrainerModeManifestEntry` interface, `trainerModeManifest: ReadonlyMap<string, TrainerModeManifestEntry>`, `isTrainerModeEnabled(modeId: string): boolean`, all exported from `apps/web/src/trainer/mode-manifest.ts`.

- [ ] **Step 1: Write the failing test**

Create `apps/web/src/trainer/mode-manifest.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { isTrainerModeEnabled, trainerModeManifest } from "./mode-manifest.js";

describe("Trainer mode manifest", () => {
  it("has an entry for every registered scenario mode", () => {
    const ids = [
      "grid",
      "pinpoint",
      "multi",
      "headline",
      "strafe",
      "smooth-track",
      "tempo",
    ];
    for (const id of ids) {
      expect(trainerModeManifest.has(id)).toBe(true);
    }
  });

  it("enables only grid; every other mode is present but disabled", () => {
    expect(isTrainerModeEnabled("grid")).toBe(true);
    expect(isTrainerModeEnabled("pinpoint")).toBe(false);
    expect(isTrainerModeEnabled("multi")).toBe(false);
    expect(isTrainerModeEnabled("headline")).toBe(false);
    expect(isTrainerModeEnabled("strafe")).toBe(false);
    expect(isTrainerModeEnabled("smooth-track")).toBe(false);
    expect(isTrainerModeEnabled("tempo")).toBe(false);
  });

  it("returns false for an unknown mode id rather than throwing", () => {
    expect(isTrainerModeEnabled("not-a-real-mode")).toBe(false);
  });

  it("only grid carries an adapter factory", () => {
    expect(typeof trainerModeManifest.get("grid")?.createAdapter).toBe(
      "function",
    );
    expect(trainerModeManifest.get("pinpoint")?.createAdapter).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- apps/web/src/trainer/mode-manifest.spec.ts`
Expected: FAIL — `./mode-manifest.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `apps/web/src/trainer/mode-manifest.ts`:

```ts
import { defaultScenarioRegistry, ScenarioEntry } from "@findmysensi/scenarios";
import {
  createGridModeAdapter,
  ModeRuntimeAdapter,
} from "@findmysensi/trainer-runtime";

export interface TrainerModeManifestEntry {
  readonly modeId: string;
  readonly enabled: boolean;
  readonly scenarioEntry: ScenarioEntry;
  readonly createAdapter?: () => ModeRuntimeAdapter;
}

function buildEntry(
  modeId: string,
  enabled: boolean,
  createAdapter?: () => ModeRuntimeAdapter,
): TrainerModeManifestEntry {
  const scenarioEntry = defaultScenarioRegistry.get(modeId, 0);
  if (!scenarioEntry) {
    throw new Error(
      `Trainer mode manifest: no scenario registered for "${modeId}" at version 0.`,
    );
  }
  return { modeId, enabled, scenarioEntry, createAdapter };
}

export const trainerModeManifest: ReadonlyMap<
  string,
  TrainerModeManifestEntry
> = new Map([
  ["grid", buildEntry("grid", true, createGridModeAdapter)],
  ["pinpoint", buildEntry("pinpoint", false)],
  ["multi", buildEntry("multi", false)],
  ["headline", buildEntry("headline", false)],
  ["strafe", buildEntry("strafe", false)],
  ["smooth-track", buildEntry("smooth-track", false)],
  ["tempo", buildEntry("tempo", false)],
]);

export function isTrainerModeEnabled(modeId: string): boolean {
  return trainerModeManifest.get(modeId)?.enabled ?? false;
}
```

Modify `apps/web/app/train/[mode]/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { isTrainerModeEnabled } from "../../../src/trainer/mode-manifest.js";

interface TrainPageProps {
  params: Promise<{
    mode: string;
  }>;
}

export default async function TrainPage({ params }: TrainPageProps) {
  const { mode } = await params;

  if (!isTrainerModeEnabled(mode)) {
    notFound();
  }

  redirect(`/app/train/${mode}`);
}
```

Modify `apps/web/app/train/[mode]/results/page.tsx`:

```tsx
import { notFound, redirect } from "next/navigation";
import { isTrainerModeEnabled } from "../../../../src/trainer/mode-manifest.js";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isTrainerModeEnabled(mode)) notFound();
  redirect(`/app/train/${mode}/results`);
}
```

Modify `apps/web/app/app/train/[mode]/page.tsx`:

```tsx
import React from "react";
import { notFound } from "next/navigation";
import { AuthenticatedTrainer } from "../../../../src/trainer/AuthenticatedTrainer.js";
import { isTrainerModeEnabled } from "../../../../src/trainer/mode-manifest.js";

interface TrainPageProps {
  params: Promise<{
    mode: string;
  }>;
}

export default async function AppTrainPage({ params }: TrainPageProps) {
  const { mode } = await params;

  if (!isTrainerModeEnabled(mode)) {
    notFound();
  }

  return <AuthenticatedTrainer mode={mode} />;
}
```

Modify `apps/web/app/app/train/[mode]/results/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import { AuthenticatedPracticeResults } from "../../../../../src/features/results/AuthenticatedPracticeResults.js";
import { isTrainerModeEnabled } from "../../../../../src/trainer/mode-manifest.js";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isTrainerModeEnabled(mode)) notFound();
  return <AuthenticatedPracticeResults mode={mode} />;
}
```

Modify `apps/web/src/trainer/TrainerBootstrap.tsx`:

Add to the import block (after the `runtime-config.js` import):

```ts
import { trainerModeManifest } from "./mode-manifest.js";
```

Change the guard (currently `if (mode !== "grid") {`):

```tsx
  if (!(trainerModeManifest.get(mode)?.enabled ?? false)) {
```

Change the `PracticeRunController` construction to pass the resolved adapter as the 4th argument:

```tsx
const controller = new PracticeRunController(
  {
    onStateChange: (newState) => {
      setGameState(newState);
      if (newState === "paused") {
        pauseDeadlineRef.current = Date.now() + MAX_PAUSE_MS;
        setPauseSecondsLeft(MAX_PAUSE_MS / 1000);
      } else if (newState === "playing") {
        pauseDeadlineRef.current = null;
      }
      if (newState === "completed") {
        window.setTimeout(() => router.push(`/app/train/${mode}/results`), 600);
      }
    },
    onTickProgress: (currentTick, totalTicks) => {
      setRemainingSeconds(
        Math.max(0, Math.ceil((totalTicks - currentTick) / 128)),
      );
    },
    onScoreUpdate: (newScore, newHits, newMisses) => {
      setScore(newScore);
      setHits(newHits);
      setMisses(newMisses);
      const totalShots = newHits + newMisses;
      setAccuracy(
        totalShots > 0 ? Math.round((newHits / totalShots) * 100) : 100,
      );
    },
    onComplete: () => {},
  },
  renderer,
  {
    durationTicks: 60 * 128,
    inputGain: runtimeConfig.inputGain,
    inputBufferCapacity: runtimeConfig.inputBufferCapacity,
  },
  trainerModeManifest.get(mode)?.createAdapter?.(),
);
```

(The 4th argument evaluates to `undefined` for any mode without a `createAdapter`, which `PracticeRunController`'s default parameter — `createGridModeAdapter()` — then covers. Since the guard above already blocks anything but `"grid"` from reaching this point in practice, this is the same effective behavior as today, now routed through the shared manifest instead of being implicit.)

- [ ] **Step 4: Run tests to verify it passes**

Run: `npm test -- apps/web/src/trainer/mode-manifest.spec.ts`
Expected: PASS (4 tests)

Then run the full suite and E2E:

```bash
npm test
npm run typecheck
npm run build
npm test --prefix tests/e2e
```

Expected: all PASS. The E2E suite in particular must pass **unmodified** — it proves the route generalization didn't change any externally observable behavior (grid still works, everything else still 404s).

- [ ] **Step 5: Commit**

```bash
git add apps/web
git commit -m "feat(trainer): route dispatch and mode gating through trainerModeManifest

Replaces hardcoded mode !== \"grid\" checks in all 4 [mode] route files
and TrainerBootstrap's guard with a shared manifest lookup. Only grid
is enabled; every other mode still 404s exactly as before — this
changes the mechanism, not which modes are playable."
```

---

### Task 6: Full verification and push

- [ ] **Step 1: Run every gate**

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run check:boundaries
npm run decisions:check
npm run protocol:freeze:check
npm run build
```

Expected: every command exits 0.

- [ ] **Step 2: Run E2E against a real build**

```bash
npm --prefix apps/web start -- -H 127.0.0.1 -p 3100 &
npm test --prefix tests/e2e
```

Expected: PASS. Then stop the background `npm --prefix apps/web start` process.

- [ ] **Step 3: Push**

```bash
git push origin main
```
