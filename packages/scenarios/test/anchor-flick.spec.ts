import {
  FULL_TURN_UNITS,
  createAngleUnits,
  createPrngV1,
  shortestSignedAngleDelta,
} from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  ANCHOR_FLICK_HALF_HEIGHT_UNITS,
  ANCHOR_FLICK_HALF_WIDTH_UNITS,
  ANCHOR_FLICK_MAX_OFFSET_UNITS,
  ANCHOR_FLICK_MIN_OFFSET_UNITS,
  ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS,
  ANCHOR_FLICK_RADIUS_UNITS,
  AnchorFlickScenarioEngine,
} from "../src/anchor-flick/dev-v0.js";

function offsetFromCentre(x: number, y: number): number {
  return Math.hypot(
    shortestSignedAngleDelta(createAngleUnits(0), createAngleUnits(x)),
    y,
  );
}

function signedYaw(x: number): number {
  return x > FULL_TURN_UNITS / 2 ? x - FULL_TURN_UNITS : x;
}

describe("Anchor Flick scenario (dev-v0)", () => {
  it("starts on the centre anchor", () => {
    const engine = new AnchorFlickScenarioEngine();
    const centre = engine.initialize(createPrngV1([1, 2, 3, 4]));

    expect(centre.xAngleUnits).toBe(0);
    expect(centre.yAngleUnits).toBe(0);
    expect(centre.radiusAngleUnits).toBe(ANCHOR_FLICK_RADIUS_UNITS);
    // The anchor is the reset point and must never time out.
    expect(centre.lifetimeTicks).toBeUndefined();
  });

  it("alternates centre -> peripheral -> centre", () => {
    const engine = new AnchorFlickScenarioEngine();
    const prng = createPrngV1([1, 2, 3, 4]);
    const centre = engine.initialize(prng);

    const peripheral = engine.onTargetHit(centre.id, 0, prng)!;
    expect(
      offsetFromCentre(peripheral.xAngleUnits, peripheral.yAngleUnits),
    ).toBeGreaterThanOrEqual(ANCHOR_FLICK_MIN_OFFSET_UNITS);

    const back = engine.onTargetHit(peripheral.id, 10, prng)!;
    expect(back.xAngleUnits).toBe(0);
    expect(back.yAngleUnits).toBe(0);
  });

  it("keeps every peripheral inside the offset band and the play area", () => {
    const engine = new AnchorFlickScenarioEngine();
    const prng = createPrngV1([6, 6, 6, 6]);
    let current = engine.initialize(prng);

    for (let i = 0; i < 20; i++) {
      current = engine.onTargetHit(current.id, i * 10, prng)!;
      if (current.xAngleUnits === 0 && current.yAngleUnits === 0) continue;

      const offset = offsetFromCentre(current.xAngleUnits, current.yAngleUnits);
      expect(offset).toBeGreaterThanOrEqual(ANCHOR_FLICK_MIN_OFFSET_UNITS);
      expect(offset).toBeLessThanOrEqual(ANCHOR_FLICK_MAX_OFFSET_UNITS);
      expect(Math.abs(signedYaw(current.xAngleUnits))).toBeLessThanOrEqual(
        ANCHOR_FLICK_HALF_WIDTH_UNITS,
      );
      expect(Math.abs(current.yAngleUnits)).toBeLessThanOrEqual(
        ANCHOR_FLICK_HALF_HEIGHT_UNITS,
      );
    }
  });

  it("expires an untouched peripheral and returns to the anchor", () => {
    const engine = new AnchorFlickScenarioEngine();
    const prng = createPrngV1([2, 2, 2, 2]);
    const centre = engine.initialize(prng);
    const peripheral = engine.onTargetHit(centre.id, 0, prng)!;

    expect(peripheral.lifetimeTicks).toBe(
      ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS,
    );

    // Nothing happens before the deadline.
    expect(
      engine.tick(ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS - 1, prng).expired,
    ).toBeNull();

    const { expired, spawned } = engine.tick(
      ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS,
      prng,
    );
    expect(expired?.id).toBe(peripheral.id);
    expect(spawned?.xAngleUnits).toBe(0);
    expect(spawned?.yAngleUnits).toBe(0);
  });

  it("goes back outward after an expiry, not straight to another peripheral", () => {
    const engine = new AnchorFlickScenarioEngine();
    const prng = createPrngV1([4, 4, 4, 4]);
    const centre = engine.initialize(prng);
    engine.onTargetHit(centre.id, 0, prng);

    const { spawned } = engine.tick(
      ANCHOR_FLICK_PERIPHERAL_LIFETIME_TICKS,
      prng,
    );
    // Hitting the restored anchor must produce a peripheral, proving the
    // centre/peripheral phase survived the expiry.
    const next = engine.onTargetHit(spawned!.id, 300, prng)!;
    expect(
      offsetFromCentre(next.xAngleUnits, next.yAngleUnits),
    ).toBeGreaterThanOrEqual(ANCHOR_FLICK_MIN_OFFSET_UNITS);
  });

  it("ignores a hit on an unknown target id", () => {
    const engine = new AnchorFlickScenarioEngine();
    const prng = createPrngV1([1, 1, 1, 1]);
    engine.initialize(prng);
    expect(engine.onTargetHit(9_999, 0, prng)).toBeNull();
  });

  it("is deterministic for the same seed", () => {
    const first = new AnchorFlickScenarioEngine();
    const second = new AnchorFlickScenarioEngine();
    const prngA = createPrngV1([9, 9, 9, 9]);
    const prngB = createPrngV1([9, 9, 9, 9]);
    const a = first.initialize(prngA);
    const b = second.initialize(prngB);
    expect(first.onTargetHit(a.id, 0, prngA)).toEqual(
      second.onTargetHit(b.id, 0, prngB),
    );
  });
});
