import {
  createAngleUnits,
  createPrngV1,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { MicroshotScenarioEngine } from "../src/microshot/dev-v0.js";

describe("Microshot scenario", () => {
  it("spawns deterministic tiny targets near the last hit", () => {
    const engine = new MicroshotScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    const initial = engine.initialize(prng);
    const next = engine.onTargetHit(
      initial.id,
      initial.xAngleUnits,
      initial.yAngleUnits,
      prng,
    )!;
    const correction = Math.hypot(
      shortestSignedAngleDelta(
        createAngleUnits(initial.xAngleUnits),
        createAngleUnits(next.xAngleUnits),
      ),
      next.yAngleUnits - initial.yAngleUnits,
    );

    expect(initial.radiusAngleUnits).toBe(10_000);
    expect(correction).toBeGreaterThanOrEqual(50_000);
    expect(correction).toBeLessThanOrEqual(180_000);
    expect(next.id).toBe(2);
  });
});
