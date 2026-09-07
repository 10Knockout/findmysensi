import {
  createAngleUnits,
  createPrngV1,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import { MicroshotScenarioEngine } from "../src/microshot/dev-v0.js";

const CENTRE_RADIUS_UNITS = 37_283;
const MIN_OFFSET_UNITS = 186_414;
const MAX_OFFSET_UNITS = 559_240;

function offsetFromCentre(x: number, y: number): number {
  return Math.hypot(
    shortestSignedAngleDelta(createAngleUnits(0), createAngleUnits(x)),
    y,
  );
}

describe("Microshot scenario", () => {
  it("alternates centre -> peripheral -> centre", () => {
    const engine = new MicroshotScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);

    const centre = engine.initialize(prng);
    expect(centre.id).toBe(1);
    expect(centre.xAngleUnits).toBe(0);
    expect(centre.yAngleUnits).toBe(0);
    expect(centre.radiusAngleUnits).toBe(CENTRE_RADIUS_UNITS);

    const peripheral = engine.onTargetHit(centre.id, 0, 0, prng)!;
    expect(peripheral.id).toBe(2);
    const offset = offsetFromCentre(
      peripheral.xAngleUnits,
      peripheral.yAngleUnits,
    );
    expect(offset).toBeGreaterThanOrEqual(MIN_OFFSET_UNITS);
    expect(offset).toBeLessThanOrEqual(MAX_OFFSET_UNITS);

    const backToCentre = engine.onTargetHit(peripheral.id, 0, 0, prng)!;
    expect(backToCentre.id).toBe(3);
    expect(backToCentre.xAngleUnits).toBe(0);
    expect(backToCentre.yAngleUnits).toBe(0);
  });

  it("anchors every peripheral flick to the centre, not to the previous target", () => {
    const engine = new MicroshotScenarioEngine();
    const prng = createPrngV1([7, 7, 7, 7]);

    let current = engine.initialize(prng);
    const peripherals: number[] = [];
    for (let i = 0; i < 6; i++) {
      current = engine.onTargetHit(current.id, 0, 0, prng)!;
      if (current.xAngleUnits !== 0 || current.yAngleUnits !== 0) {
        peripherals.push(
          offsetFromCentre(current.xAngleUnits, current.yAngleUnits),
        );
      }
    }

    expect(peripherals.length).toBeGreaterThan(0);
    for (const offset of peripherals) {
      expect(offset).toBeGreaterThanOrEqual(MIN_OFFSET_UNITS);
      expect(offset).toBeLessThanOrEqual(MAX_OFFSET_UNITS);
    }
  });

  it("is deterministic for the same seed", () => {
    const first = new MicroshotScenarioEngine();
    const second = new MicroshotScenarioEngine();
    const prngA = createPrngV1([9, 8, 7, 6]);
    const prngB = createPrngV1([9, 8, 7, 6]);

    const centreA = first.initialize(prngA);
    const centreB = second.initialize(prngB);
    expect(first.onTargetHit(centreA.id, 0, 0, prngA)).toEqual(
      second.onTargetHit(centreB.id, 0, 0, prngB),
    );
  });
});
