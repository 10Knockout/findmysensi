# FindMySensi Phase 2 Gridshot Stabilization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Gridshot practice loop mechanically correct and reliable: correct mouse-to-angle movement, fix left/right target disappearance and hit mismatch, use three medium resolution-independent targets, apply relevant saved trainer settings, and prove deterministic behavior under 125–8000 Hz synthetic input before any ranked backend work begins.

**Architecture:** Phase 2 changes the public repository only. Browser input remains raw relative movement captured outside React, then a single explicit deterministic gain conversion turns browser input units into fixed angular deltas before simulation. Authoritative yaw uses canonical wrapped absolute angles, pitch remains signed and clamped, and every renderer/collision comparison uses the same shortest-angle-delta rule so the visual target position and hit geometry cannot disagree.

**Tech Stack:** TypeScript, Next.js 16, React 19, Canvas2D, Pointer Lock, Vitest, fixed-tick simulation at 128 Hz.

**Spec:** `docs/superpowers/specs/2026-08-30-findmysensi-design.md`, plus the approved Phase 1 product-flow constraints captured in `docs/superpowers/plans/2026-08-31-phase1-product-shell.md`.

## Global Constraints

- Phase 2 is **Gridshot only**. Do not expose or repair Pinpoint, Multi, Headline, Strafe, Smooth Track, Tempo, Sensi Lab, Mouse Swap, or ranked submission flows in this phase.
- Keep the private repository unchanged. There is still no browser-authoritative official score write endpoint.
- Gridshot remains a 60-second, 128 Hz practice scenario with exactly **3 stationary circular targets** and one deterministic replacement immediately after a successful hit.
- Phase 2 target radius is **50,000 fixed angle units**. With `2^24` angle units per full turn, that is about `1.073°` angular radius / `2.146°` diameter. This value is scenario geometry, not a user setting.
- Target geometry, target hitbox, movement rules, spawn rules, duration and score formula remain authoritative simulation data and may not be changed by renderer settings.
- Target presentation settings may change color, opacity and outline only.
- Mouse movement must never enter React state. React continues to receive only low-frequency HUD/state updates.
- Use Pointer Lock with `unadjustedMovement: true` when supported and ordinary Pointer Lock as the fallback. Do not assume `movementX/movementY` are hardware sensor counts; browser/OS units can differ.
- `fmsSensitivity` is interpreted in Phase 2 as a **dimensionless FindMySensi browser-gain multiplier**. `1.0` means the product-defined default gain; changing DPI alone never changes browser gain.
- Product-defined default gain: `2,500 fixed angle units per browser input unit` at FMS sensitivity `1.0` (about `0.053644°` per browser input unit). Resolve the multiplier once during runtime setup using exact decimal/rational arithmetic; the hot loop receives one integer gain.
- Horizontal input: positive `movementX` increases yaw. Vertical input: positive browser `movementY` means mouse moved down, therefore player pitch decreases.
- Input Processing presets change buffering/aggregation strategy only. They must never multiply or otherwise alter sensitivity/gain.
- Preserve causal event ordering around shots. Movement before a shot affects that shot; movement after the shot cannot retroactively affect it.
- Keep the existing 10-minute pause behavior from Phase 1. Runtime sensitivity/FOV/input-processing settings are immutable for an active run; newly saved settings apply to the next restart/new run.
- No score normalization or hardware multipliers for polling rate, resolution, refresh rate or graphics preset.
- Do not change the 128 Hz fixed-tick rate in this phase.

## Current Root-Cause Audit

The current code already shows concrete reasons for the reported Gridshot behavior:

1. `PracticeRunController` currently executes `playerYaw += ev.dx` and `playerPitch += ev.dy`. Raw browser deltas are therefore treated as if one browser unit were one engine angle unit. One engine angle unit is only `360 / 16,777,216 ≈ 0.00002146°`, so the input domain and simulation angle domain are not actually mapped.
2. `GridScenarioEngine` stores grid yaw slots as signed values such as `-600000`, while the controller calls `wrapYaw(playerYaw)` before render/collision. A small leftward yaw can therefore become a value near `16,777,216`, while targets remain negative.
3. `renderer.ts` currently computes `rawTargetX - playerYaw`; `collision/target.ts` computes ordinary Euclidean X difference. Neither uses circular shortest-yaw distance, so wrap-boundary movement can make a target render far off-screen or become impossible to hit.
4. `Canvas2DPotatoRenderer` hardcodes 103° when turning target angular radius into pixels instead of deriving radius from the active viewport FOV.
5. The runtime `GridScenarioEngine` uses radius `25,000`, while the older exported `GridMechanics` uses `50,000`. Two conflicting Grid implementations are currently exported.
6. Input Processing policies exist, but `PracticeRunController` always creates a fixed-capacity `4096` ring buffer and does not consume the selected setting.
7. Phase 1 persists FOV, target presentation, crosshair and input-processing settings, but the trainer currently initializes with hardcoded renderer/runtime values.

---

### Task 1: Make yaw/pitch domains explicit and wrap-safe

**Files:**

- Modify: `packages/aim-core/src/fixed/angle.ts`
- Modify: `packages/aim-core/src/fixed/range.ts`
- Modify: `packages/aim-core/src/collision/target.ts`
- Modify: `packages/aim-core/src/render/snapshot.ts`
- Modify: `packages/aim-core/src/index.ts`
- Test: `packages/aim-core/test/fixed-angle.spec.ts`
- Test: `packages/aim-core/test/shot-collision.spec.ts`
- Test: `packages/aim-core/test/render-snapshot.spec.ts`

**Interfaces:**

- Produces `PitchUnits` for signed/clamped pitch.
- Produces `shortestSignedAngleDelta(from: AngleUnits, to: AngleUnits): AngleDeltaUnits`.
- Collision consumes canonical wrapped target yaw and signed target pitch.

- [ ] **Step 1: Add failing shortest-yaw regression tests**

Add to `packages/aim-core/test/fixed-angle.spec.ts`:

```ts
it("returns the shortest signed yaw delta across the wrap seam", () => {
  const nearEnd = createAngleUnits(FULL_TURN_UNITS - 10_000);
  const nearStart = createAngleUnits(5_000);

  expect(shortestSignedAngleDelta(nearEnd, nearStart)).toBe(15_000);
  expect(shortestSignedAngleDelta(nearStart, nearEnd)).toBe(-15_000);
});

it("freezes the exact half-turn tie as negative half-turn", () => {
  expect(
    shortestSignedAngleDelta(
      createAngleUnits(0),
      createAngleUnits(HALF_TURN_UNITS),
    ),
  ).toBe(-HALF_TURN_UNITS);
});
```

Run:

```bash
npx vitest run packages/aim-core/test/fixed-angle.spec.ts
```

Expected: FAIL because `shortestSignedAngleDelta` does not exist.

- [ ] **Step 2: Implement the canonical helper and signed pitch type**

In `packages/aim-core/src/fixed/angle.ts` add:

```ts
export type PitchUnits = number & { readonly __brand: "PitchUnits" };

export function createPitchUnits(value: number): PitchUnits {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Invalid PitchUnits: ${value}. Must be a safe integer.`,
    );
  }
  return (value === 0 ? 0 : value) as PitchUnits;
}

export function shortestSignedAngleDelta(
  from: AngleUnits,
  to: AngleUnits,
): AngleDeltaUnits {
  const raw =
    (((to - from) % FULL_TURN_UNITS) + FULL_TURN_UNITS) % FULL_TURN_UNITS;
  const signed = raw >= HALF_TURN_UNITS ? raw - FULL_TURN_UNITS : raw;
  return createAngleDeltaUnits(signed);
}
```

Change `clampPitch()` to return `PitchUnits` through `createPitchUnits(clamped)` instead of casting to `AngleUnits`.

- [ ] **Step 3: Write failing wrap-aware collision tests**

Add to `packages/aim-core/test/shot-collision.spec.ts`:

```ts
it("hits a target across the yaw wrap seam using shortest angular distance", () => {
  const target = {
    id: 99,
    xAngleUnits: createAngleUnits(5_000),
    yAngleUnits: 0,
    radiusAngleUnits: 20_000,
  };

  expect(
    testAngularHit(
      createAngleUnits(FULL_TURN_UNITS - 10_000),
      createPitchUnits(0),
      target,
    ),
  ).toBe(true);
});
```

Run:

```bash
npx vitest run packages/aim-core/test/shot-collision.spec.ts
```

Expected: FAIL with current ordinary X-distance collision.

- [ ] **Step 4: Make collision use shortest yaw + signed pitch**

Change collision distance inputs conceptually to:

```ts
const dx = shortestSignedAngleDelta(yaw, createAngleUnits(target.xAngleUnits));
const dy = target.yAngleUnits - pitch;
const distSq = BigInt(dx) * BigInt(dx) + BigInt(dy) * BigInt(dy);
```

Keep exact `distSq <= radiusSq` boundary behavior unchanged.

- [ ] **Step 5: Update render snapshot pitch typing**

Change `RenderSnapshotView.playerPitch`, internal snapshot pitch storage and `SnapshotBuffer.beginWrite()` to `PitchUnits`; keep the preallocated double-buffer design unchanged.

- [ ] **Step 6: Run the focused core tests**

```bash
npx vitest run \
  packages/aim-core/test/fixed-angle.spec.ts \
  packages/aim-core/test/shot-collision.spec.ts \
  packages/aim-core/test/render-snapshot.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/aim-core
git commit -m "fix(aim-core): make angular deltas wrap-safe"
```

---

### Task 2: Consolidate Gridshot onto one canonical scenario engine and enlarge targets

**Files:**

- Modify: `packages/scenarios/src/grid/dev-v0.ts`
- Delete: `packages/scenarios/src/grid/mechanics.ts`
- Modify: `packages/scenarios/src/index.ts`
- Modify: `packages/scenarios/test/grid-dev.spec.ts`
- Delete: `packages/scenarios/test/grid.spec.ts`

**Interfaces:**

- `GridScenarioEngine` remains the only runtime Gridshot engine.
- `GRID_DEV_V0_DEFINITION.simulation.targetRadiusAngleUnits` becomes exactly `50_000`.
- Every target yaw returned by the engine is canonical `[0, FULL_TURN_UNITS)`; pitch remains signed.

- [ ] **Step 1: Add failing scenario invariants**

Extend `packages/scenarios/test/grid-dev.spec.ts`:

```ts
it("uses the Phase 2 medium target radius and canonical wrapped yaw", () => {
  const engine = new GridScenarioEngine();
  const prng = createPrngV1([101, 202, 303, 404]);
  const targets = engine.initialize(prng);

  expect(targets).toHaveLength(3);
  for (const target of targets) {
    expect(target.radiusAngleUnits).toBe(50_000);
    expect(target.xAngleUnits).toBeGreaterThanOrEqual(0);
    expect(target.xAngleUnits).toBeLessThan(FULL_TURN_UNITS);
  }
});
```

Run:

```bash
npx vitest run packages/scenarios/test/grid-dev.spec.ts
```

Expected: FAIL because runtime radius is `25_000` and left-side slots are currently negative.

- [ ] **Step 2: Canonicalize yaw at slot creation and set radius 50,000**

Change the runtime definition:

```ts
targetRadiusAngleUnits: 50_000,
```

When generating each slot, store:

```ts
xAngleUnits: wrapYaw(startX + c * stepX),
yAngleUnits: startY + r * stepY,
```

Keep slot index/row/column identity so recent-location exclusion does not rely on reconstructing signed coordinates.

- [ ] **Step 3: Remove the unused duplicate `GridMechanics` implementation**

Delete `packages/scenarios/src/grid/mechanics.ts`, remove its export from `packages/scenarios/src/index.ts`, and delete the duplicate `packages/scenarios/test/grid.spec.ts`. All Gridshot behavior is then owned by `GridScenarioEngine` + `grid-dev.spec.ts`.

- [ ] **Step 4: Re-run scenario determinism tests**

```bash
npx vitest run packages/scenarios/test/grid-dev.spec.ts
```

Expected: PASS for 3 active targets, replacement behavior, canonical yaw and deterministic 20-hit sequence.

- [ ] **Step 5: Commit**

```bash
git add packages/scenarios
git commit -m "fix(gridshot): canonicalize target geometry"
```

---

### Task 3: Define an explicit deterministic FindMySensi browser gain

**Files:**

- Create: `packages/sensitivity/src/browser-gain.ts`
- Modify: `packages/sensitivity/src/index.ts`
- Create: `packages/sensitivity/test/browser-gain.spec.ts`
- Modify: `apps/web/src/features/settings/SettingsClient.tsx`

**Interfaces:**

```ts
export const DEFAULT_FMS_SENSITIVITY = "1";
export const BASE_BROWSER_GAIN_ANGLE_UNITS = 2_500;
export type BrowserGainAngleUnitsPerInputUnit = number & {
  readonly __brand: "BrowserGainAngleUnitsPerInputUnit";
};
export function resolveBrowserGainAngleUnits(
  fmsSensitivity: string | null,
): BrowserGainAngleUnitsPerInputUnit;
```

- [ ] **Step 1: Write failing exact-decimal gain tests**

Create `packages/sensitivity/test/browser-gain.spec.ts`:

```ts
import { describe, expect, it } from "vitest";
import { resolveBrowserGainAngleUnits } from "../src/browser-gain.js";

describe("FindMySensi browser gain", () => {
  it("uses the product default when sensitivity is unset", () => {
    expect(resolveBrowserGainAngleUnits(null)).toBe(2_500);
  });

  it("applies decimal multipliers deterministically", () => {
    expect(resolveBrowserGainAngleUnits("0.5")).toBe(1_250);
    expect(resolveBrowserGainAngleUnits("1.0")).toBe(2_500);
    expect(resolveBrowserGainAngleUnits("1.5")).toBe(3_750);
    expect(resolveBrowserGainAngleUnits("2.25")).toBe(5_625);
  });

  it("does not use DPI as part of browser gain", () => {
    expect(resolveBrowserGainAngleUnits("1.0")).toBe(2_500);
  });
});
```

Run:

```bash
npx vitest run packages/sensitivity/test/browser-gain.spec.ts
```

Expected: FAIL because the module does not exist.

- [ ] **Step 2: Implement exact setup-time parsing without floating-point multiplication**

Parse the decimal string into integer numerator/denominator using string digits, multiply `2_500n * numerator`, divide by denominator, and round half-up once. Convert the final result to a safe integer and brand it. Do not use `parseFloat()` to derive the runtime gain.

The hot loop receives only the final integer.

- [ ] **Step 3: Clarify the Settings copy**

Keep the field name `FindMySensi sensitivity`, but add this exact help text under it:

```text
1.0 is the FindMySensi default browser gain. DPI is stored separately and does not silently change this value.
```

Do not label this value as hardware polling rate or device counts.

- [ ] **Step 4: Run gain + protocol settings tests**

```bash
npx vitest run \
  packages/sensitivity/test/browser-gain.spec.ts \
  packages/protocol/test/product-shell.spec.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/sensitivity apps/web/src/features/settings/SettingsClient.tsx
git commit -m "feat(sensitivity): define browser input gain"
```

---

### Task 4: Apply gain and correct vertical direction inside the deterministic controller

**Files:**

- Modify: `apps/web/src/features/training/PracticeRunController.ts`
- Modify: `tests/browser/grid-practice.spec.ts`
- Modify: `packages/input-browser/src/reducer.ts`
- Modify: `packages/input-browser/test/reducer.spec.ts`

**Interfaces:**

```ts
export interface PracticeRunOptions {
  readonly durationTicks?: number;
  readonly inputGainAngleUnitsPerUnit: number;
  readonly inputBufferCapacity: number;
}
```

`PracticeRunController` owns the conversion from canonical raw movement sums to engine angular deltas. `reduceRawEvents()` no longer has floating sensitivity multipliers.

- [ ] **Step 1: Add a controller test that proves real movement reaches visible angular scale**

Use a capture renderer in `tests/browser/grid-practice.spec.ts` that stores the latest `RenderSnapshotView`. Configure gain `2500`, push `+100` X units into the controller ring buffer, advance one simulation tick, and assert the player yaw moves exactly `250_000` angle units.

Add a second assertion for `movementY = +40`: player pitch becomes `-100_000`, proving browser-down means look-down.

Run:

```bash
npx vitest run tests/browser/grid-practice.spec.ts
```

Expected: FAIL because movement is currently added with gain `1` and Y uses the wrong sign.

- [ ] **Step 2: Remove reducer sensitivity floats**

Delete `ReducerOptions.sensitivityYawMultiplier` and `sensitivityPitchMultiplier`. `reduceRawEvents()` must only preserve/sum raw integer deltas and semantic boundaries:

```ts
accumDx += rawDx;
accumDy += rawDy;
```

Keep shot/invalidation flush behavior exactly as-is.

- [ ] **Step 3: Make controller input conversion explicit**

For each canonical move event:

```ts
const yawDelta = ev.dx * this.options.inputGainAngleUnitsPerUnit;
const pitchDelta = ev.dy * this.options.inputGainAngleUnitsPerUnit;

this.playerYaw = wrapYaw(this.playerYaw + yawDelta);
this.playerPitch = clampPitch(this.playerPitch - pitchDelta);
```

Before multiplication, require raw deltas and gain to be safe integers; reject/abort on unsafe overflow rather than allowing precision loss.

- [ ] **Step 4: Make ring-buffer capacity configurable**

Replace hardcoded `createInputRingBuffer(4096)` / batch capacity `4096` with `PracticeRunOptions.inputBufferCapacity`. Use the same capacity for ring + preallocated drain target.

- [ ] **Step 5: Preserve movement/shot causal ordering with an integration regression**

Add a test sequence:

```text
MOVE +100
SHOT
MOVE -60
```

with gain `2500`. The shot must evaluate at yaw `250_000`; the final aim after the tick must be yaw `100_000`. Do not collapse this into `MOVE +40, SHOT`.

- [ ] **Step 6: Run focused controller/reducer tests**

```bash
npx vitest run \
  packages/input-browser/test/reducer.spec.ts \
  tests/browser/grid-practice.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/features/training/PracticeRunController.ts packages/input-browser tests/browser/grid-practice.spec.ts
git commit -m "fix(gridshot): map browser input into angular movement"
```

---

### Task 5: Make Canvas rendering use the exact same yaw math and active FOV as collision

**Files:**

- Modify: `packages/render-canvas/src/viewport-transform.ts`
- Modify: `packages/render-canvas/src/types.ts`
- Modify: `packages/render-canvas/src/renderer.ts`
- Modify: `packages/render-canvas/test/viewport-transform.spec.ts`
- Modify: `packages/render-canvas/test/renderer.spec.ts`

**Interfaces:**

Add to `ViewportTransform`:

```ts
readonly horizontalFovUnits: number;
angleRadiusToPixels(radiusAngleUnits: number): number;
```

- [ ] **Step 1: Write a failing wrap-seam renderer test**

Build a snapshot with player yaw `FULL_TURN_UNITS - 10_000` and a target yaw `5_000`. Assert the target arc center is only `15_000` angle units to the right of screen center rather than millions of units off-screen.

- [ ] **Step 2: Write a failing active-FOV radius test**

Create 103° and 90° viewport transforms at the same 1920×1080 resolution. For radius `50_000`, assert `angleRadiusToPixels(50_000)` is larger at 90° than 103°. This proves radius derives from active FOV rather than a hardcoded renderer constant.

- [ ] **Step 3: Implement viewport radius conversion**

```ts
public readonly horizontalFovUnits = this.hFovUnits;

public angleRadiusToPixels(radiusAngleUnits: number): number {
  return radiusAngleUnits * this.pxPerAngleUnitX;
}
```

- [ ] **Step 4: Replace raw subtraction in renderer**

Use:

```ts
const relYaw = shortestSignedAngleDelta(
  playerYaw,
  createAngleUnits(rawTargetX),
);
const relPitch = rawTargetY - playerPitch;
const screenPos = vp.simToDisplay(relYaw, relPitch);
const radiusPx = Math.max(2, vp.angleRadiusToPixels(rawRadius));
```

Delete `DEFAULT_HFOV_UNITS` from `renderer.ts`.

- [ ] **Step 5: Add target presentation opacity/outline support without changing geometry**

Renderer options consume target color, opacity and outline. Apply alpha only during target draw and restore `ctx.globalAlpha = 1` immediately after. `targetOutline=false` means border width `0`; it must not alter target radius or collision.

- [ ] **Step 6: Run renderer tests**

```bash
npx vitest run \
  packages/render-canvas/test/viewport-transform.spec.ts \
  packages/render-canvas/test/renderer.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add packages/render-canvas
git commit -m "fix(renderer): align Gridshot projection with collision"
```

---

### Task 6: Resolve saved trainer settings into one immutable run configuration

**Files:**

- Create: `apps/web/src/trainer/runtime-config.ts`
- Create: `apps/web/src/trainer/runtime-config.spec.ts`
- Modify: `apps/web/src/trainer/TrainerBootstrap.tsx`
- Modify: `apps/web/src/features/training/PracticeRunController.ts`

**Interfaces:**

```ts
export interface GridshotRuntimeConfig {
  readonly fovDegrees: number;
  readonly inputGainAngleUnitsPerUnit: number;
  readonly inputBufferCapacity: number;
  readonly scalingMode: "fit" | "stretch" | "black-bars";
  readonly targetColor: string;
  readonly targetOpacity: number;
  readonly targetOutline: boolean;
  readonly crosshairCode: string | null;
}

export function resolveGridshotRuntimeConfig(
  settings: TrainerSettings,
  observedInputRateHz?: number,
): GridshotRuntimeConfig;
```

- [ ] **Step 1: Write failing config mapping tests**

Test exact mappings:

```ts
expect(
  resolveGridshotRuntimeConfig({ ...defaults, fmsSensitivity: "1.5" })
    .inputGainAngleUnitsPerUnit,
).toBe(3_750);

expect(
  resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "1000" })
    .inputBufferCapacity,
).toBe(2_048);

expect(
  resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "8000" })
    .inputBufferCapacity,
).toBe(16_384);

expect(
  resolveGridshotRuntimeConfig({ ...defaults, inputProcessing: "maximum" })
    .inputBufferCapacity,
).toBe(32_768);
```

Also assert changing only `inputProcessing` does not change `inputGainAngleUnitsPerUnit`.

- [ ] **Step 2: Normalize protocol strings to input-browser presets**

Use this exact adapter:

```ts
function toProcessingPreset(
  value: TrainerSettings["inputProcessing"],
): InputProcessingPreset {
  if (value === "automatic") return "auto";
  if (value === "maximum") return "maximum";
  return Number(value) as 1000 | 2000 | 4000 | 8000;
}
```

Use `createDefaultProcessingPolicy().getEffectiveCapacity(...)` to resolve capacity.

- [ ] **Step 3: Load settings before creating the renderer/controller**

`TrainerBootstrap` must enter a low-frequency `loading-settings` UI state, call `BrowserApiClient.getTrainerSettings()`, validate with `TrainerSettingsSchema`, resolve one `GridshotRuntimeConfig`, then initialize viewport/renderer/controller.

If the session/settings request returns 401, redirect to `/login?next=/app/train/grid`. If loading fails otherwise, show an explicit retry/error surface; do not fall back to invented server data.

- [ ] **Step 4: Apply relevant settings**

Use runtime config for:

```text
fovDegrees          -> createViewportTransform(horizontalFovDegrees)
scalingMode         -> createViewportTransform(scaleMode)
fmsSensitivity      -> controller integer input gain
inputProcessing     -> controller ring/batch capacity
targetColor         -> renderer target body color
targetOpacity       -> renderer target alpha
targetOutline       -> renderer border enabled/disabled
crosshairCode       -> decode saved crosshair; valid default preset when null
```

Do not implement WebGL, weapon skins, target size controls or graphics-quality-specific scoring behavior.

- [ ] **Step 5: Freeze settings for an active run**

Opening Settings while paused must not mutate the active controller. Resume uses the original runtime config. Restart/new entry reloads settings and creates/reset the run with the newly resolved config.

- [ ] **Step 6: Run config + Phase 1 settings tests**

```bash
npx vitest run \
  apps/web/src/trainer/runtime-config.spec.ts \
  packages/protocol/test/product-shell.spec.ts \
  tests/browser/grid-practice.spec.ts
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/trainer apps/web/src/features/training/PracticeRunController.ts
git commit -m "feat(gridshot): apply saved runtime settings"
```

---

### Task 7: Prove 125–8000 Hz input equivalence and buffer safety

**Files:**

- Modify: `tests/performance/input-harness.spec.ts`
- Modify: `packages/input-browser/test/ring-buffer.spec.ts`
- Modify: `packages/input-browser/test/processing-policy.spec.ts`
- Modify: `apps/web/src/trainer/fixed-tick-runner.spec.ts`

**Interfaces:**

- Synthetic input harness produces identical canonical movement totals and shot ordering regardless of source event frequency.
- Polling/processing presets may affect buffering granularity/capacity only, never final aim gain.

- [ ] **Step 1: Add deterministic frequency-equivalence cases**

For each synthetic rate:

```ts
const rates = [125, 1000, 2000, 4000, 8000] as const;
```

Generate the same one-second physical intent: equal total `dx`, equal total `dy`, and shots at the same semantic progress points. Feed each through ring buffer + reducer + fixed controller gain. Assert identical final yaw, pitch, hit/miss sequence and deterministic output digest for every rate.

- [ ] **Step 2: Add a fast reaction ordering case**

Generate a movement-onset → shot interval of `45 ms`. Assert the shot remains in causal order and is not rejected, rounded away or delayed merely because it is fast.

- [ ] **Step 3: Add saturation behavior tests**

For manual 1000 mode, deliberately exceed its `2048` capacity and assert overflow/lost-temporal-precision statistics become visible. For 8000/Maximum capacities, feed the same burst and assert no overflow under the defined harness load.

Practice may continue with health metadata; this phase still does not create a ranked result.

- [ ] **Step 4: Keep long-frame recovery bounded**

Extend fixed-runner tests so a large wall-clock jump executes no more than `maxCatchUpTicksPerFrame`, reports lag through the existing hook, and never changes the configured input gain or rewrites past shot ordering.

- [ ] **Step 5: Run the performance suite repeatedly**

```bash
for i in 1 2 3 4 5; do
  npx vitest run \
    tests/performance/input-harness.spec.ts \
    packages/input-browser/test/ring-buffer.spec.ts \
    packages/input-browser/test/processing-policy.spec.ts \
    apps/web/src/trainer/fixed-tick-runner.spec.ts || exit 1
done
```

Expected: all five runs PASS with identical deterministic expectations.

- [ ] **Step 6: Commit**

```bash
git add tests/performance packages/input-browser/test apps/web/src/trainer/fixed-tick-runner.spec.ts
git commit -m "test(input): stress Gridshot across polling rates"
```

---

### Task 8: Add direct Gridshot regression coverage for the reported gameplay bugs

**Files:**

- Modify: `tests/browser/grid-practice.spec.ts`
- Modify: `packages/render-canvas/test/renderer.spec.ts`
- Modify: `packages/aim-core/test/shot-collision.spec.ts`

- [ ] **Step 1: Regression — moving left must not make targets disappear**

Start from yaw `0`, apply enough negative X movement to cross the wrap seam, render a target just left of center, and assert its projected center remains within the training viewport.

- [ ] **Step 2: Regression — visual center and collision center must agree**

For a known target, compute its rendered center using the viewport transform. Aim the simulation at the target's canonical yaw/pitch and fire. Assert the target is hit/replaced. Then aim exactly one radius unit outside and assert a miss/no replacement.

- [ ] **Step 3: Regression — exactly three targets throughout rapid hits**

Perform at least 100 deterministic successive valid target-center hits and assert after every hit:

```ts
expect(engine.getActiveTargets()).toHaveLength(3);
```

Also assert no two active target IDs or slots are identical.

- [ ] **Step 4: Regression — target mechanical size is resolution-independent**

Use the same `radiusAngleUnits = 50_000` at 1280×720 and 2560×1440. Assert collision inputs/radius are byte-for-byte identical; only rendered pixel radius changes with viewport resolution/FOV.

- [ ] **Step 5: Run the combined Gridshot regression set**

```bash
npx vitest run \
  tests/browser/grid-practice.spec.ts \
  packages/render-canvas/test/renderer.spec.ts \
  packages/aim-core/test/shot-collision.spec.ts \
  packages/scenarios/test/grid-dev.spec.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add tests/browser packages/render-canvas/test packages/aim-core/test packages/scenarios/test
git commit -m "test(gridshot): lock gameplay regressions"
```

---

### Task 9: Real-browser acceptance before declaring Gridshot stabilized

**Files:**

- No product-code file is required unless a reproducible browser failure is found.
- If a browser-only bug is found, add its regression test to the nearest Task 1–8 test file before fixing it.

- [ ] **Step 1: Run the web app against the real private API**

```bash
npm run build
npm run dev --workspace=@findmysensi/web
```

Use a real authenticated development account and real persisted trainer settings. Do not enable mock API mode.

- [ ] **Step 2: Verify Pointer Lock fallback behavior**

In a browser that supports raw lock, confirm `unadjustedMovement: true` locks successfully. In an environment where raw lock is rejected with `NotSupportedError`, confirm ordinary Pointer Lock is requested and gameplay remains usable. This matches current Pointer Lock 2.0/MDN behavior; do not UA-sniff.

- [ ] **Step 3: Manual gameplay acceptance checklist**

Verify all of the following in one 60-second Gridshot run:

```text
[ ] Moving mouse right turns right; left turns left.
[ ] Moving mouse down looks down; up looks up.
[ ] Repeated left/right motion never makes all targets disappear.
[ ] Three targets are visible after start and remain exactly three after every hit.
[ ] Targets are visibly larger than Phase 1 and match the 50,000-unit radius.
[ ] Clicking the visual center of a target registers a hit/replacement.
[ ] Clicking visibly outside the circle registers a miss and does not replace a target.
[ ] Fast flick + click input is accepted without an artificial minimum reaction delay.
[ ] Esc pauses; resume reacquires Pointer Lock; pause time does not advance run time.
[ ] Pause >10 minutes exits to /app as Phase 1 specified.
[ ] Changing FOV changes projection but not authoritative angular target radius.
[ ] Target color/opacity/outline and saved crosshair render as configured.
[ ] Changing Input Processing preset does not change mouse sensitivity.
```

- [ ] **Step 4: Test a low-end graphics path**

Run Canvas2D/Potato presentation with no particles, bloom, shadows or target-break animation. Record average/p95/p99 frame time using the existing system-health instrumentation; do not alter score based on hardware.

- [ ] **Step 5: Commit any browser regression fix only after a RED→GREEN test**

If no browser-only defect is found, no commit is required for this task.

---

### Task 10: Final Phase 2 verification and PR gate

**Files:**

- Update this plan's checkboxes during execution.
- No private-repository change.

- [ ] **Step 1: Run all public verification commands from a clean install**

```bash
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
```

Expected: every command exits `0`.

- [ ] **Step 2: Confirm architecture/bundle invariants**

```bash
npm run check:boundaries
```

Also run the existing bundle-boundary test and confirm landing/login/profile/leaderboard routes still do not pull the trainer runtime graph.

- [ ] **Step 3: Review the diff for forbidden Phase 2 scope creep**

The final diff must contain no:

```text
private-repo changes
ranked score write endpoint
new competitive mode exposure
user-editable target radius/size/hitbox
hardware score normalization
React mousemove hot-loop state
mock production data
```

- [ ] **Step 4: Open the Phase 2 PR against `main`**

Use title:

```text
Phase 2: stabilize Gridshot input and gameplay
```

PR body must list the fixed root causes, focused test evidence, 125–8000 Hz harness results and real-browser acceptance result.

- [ ] **Step 5: Merge only after exact-head CI is green**

Use the same evidence rule as Phase 1: the exact final head must pass format, lint, typecheck, tests and production build. After merge, require the `main` push CI to pass before calling Phase 2 complete.

## Phase 2 Exit Criteria

Phase 2 is complete only when all are true:

```text
1. Gridshot has exactly 3 medium static circular targets at 50,000 angular radius.
2. Left/right yaw and up/down pitch movement feel directionally correct.
3. Wrapped yaw cannot make targets disappear or create visual/collision disagreement.
4. Mouse input uses an explicit deterministic browser gain instead of raw-delta == angle-unit.
5. 45 ms movement-to-shot ordering remains valid.
6. 125/1000/2000/4000/8000 Hz synthetic streams with equal intent produce equal deterministic gameplay output.
7. Input Processing changes buffering strategy, never sensitivity.
8. FOV/target presentation/crosshair/scaling settings relevant to Gridshot are applied from persisted settings.
9. Resolution/rendering changes do not mutate authoritative target geometry or scoring.
10. Pause/resume behavior from Phase 1 remains intact.
11. No ranked backend or official score submission is introduced.
12. Exact final PR head and post-merge main both pass full public CI.
```
