import { FULL_TURN_UNITS, createPrngV1 } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  TURN180_DEV_V0_DEFINITION,
  TURN180_MAX_PITCH_UNITS,
  TURN180_MAX_TURN_UNITS,
  TURN180_MIN_TURN_UNITS,
  TURN180_RADIUS_UNITS,
  Turn180ScenarioEngine,
} from "../src/turn180/dev-v0.js";

describe("180 Flick scenario (dev-v0)", () => {
  it("declares a full turn of spawn width so yaw is unclamped", () => {
    // Without this the camera could not physically reach the next target.
    expect(TURN180_DEV_V0_DEFINITION.simulation.spawnAreaWidthUnits).toBe(
      FULL_TURN_UNITS,
    );
  });

  it("starts facing forward", () => {
    const engine = new Turn180ScenarioEngine();
    const first = engine.initialize(createPrngV1([1, 2, 3, 4]));
    expect(first.xAngleUnits).toBe(0);
    expect(first.yAngleUnits).toBe(0);
    expect(first.radiusAngleUnits).toBe(TURN180_RADIUS_UNITS);
  });

  it("places each new target roughly a half turn from the last", () => {
    const engine = new Turn180ScenarioEngine();
    const prng = createPrngV1([5, 6, 7, 8]);
    let current = engine.initialize(prng);

    for (let i = 0; i < 25; i++) {
      const previousYaw = current.xAngleUnits;
      current = engine.onTargetHit(current.id, prng)!;
      const turn = Turn180ScenarioEngine.shortestTurnBetween(
        previousYaw,
        current.xAngleUnits,
      );
      expect(turn).toBeGreaterThanOrEqual(TURN180_MIN_TURN_UNITS);
      expect(turn).toBeLessThanOrEqual(TURN180_MAX_TURN_UNITS);
    }
  });

  it("keeps pitch inside the spec band", () => {
    const engine = new Turn180ScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    let current = engine.initialize(prng);

    for (let i = 0; i < 25; i++) {
      current = engine.onTargetHit(current.id, prng)!;
      expect(Math.abs(current.yAngleUnits)).toBeLessThanOrEqual(
        TURN180_MAX_PITCH_UNITS,
      );
    }
  });

  it("does not settle into two memorised positions", () => {
    const engine = new Turn180ScenarioEngine();
    const prng = createPrngV1([4, 4, 4, 4]);
    let current = engine.initialize(prng);

    const seen = new Set<number>();
    for (let i = 0; i < 20; i++) {
      current = engine.onTargetHit(current.id, prng)!;
      seen.add(current.xAngleUnits);
    }

    // A fixed two-point ping-pong would produce at most two distinct yaws.
    expect(seen.size).toBeGreaterThan(2);
  });

  it("ignores a hit on an unknown target id", () => {
    const engine = new Turn180ScenarioEngine();
    const prng = createPrngV1([1, 1, 1, 1]);
    engine.initialize(prng);
    expect(engine.onTargetHit(9_999, prng)).toBeNull();
  });

  it("is deterministic for the same seed", () => {
    const first = new Turn180ScenarioEngine();
    const second = new Turn180ScenarioEngine();
    const prngA = createPrngV1([9, 9, 9, 9]);
    const prngB = createPrngV1([9, 9, 9, 9]);
    const a = first.initialize(prngA);
    const b = second.initialize(prngB);
    expect(first.onTargetHit(a.id, prngA)).toEqual(
      second.onTargetHit(b.id, prngB),
    );
  });
});
