import { describe, expect, it } from "vitest";
import { findHitTarget, testAngularHit } from "../src/collision/target.js";
import { createAngleUnits } from "../src/fixed/angle.js";
import { createShotTracker } from "../src/input/shot.js";

describe("Authoritative Shot & Collision Semantics", () => {
  it("enforces UP->DOWN transition is exactly one shot with no autofire on hold", () => {
    const tracker = createShotTracker();

    expect(tracker.processButton(false)).toBe(false);

    // Initial click: UP -> DOWN
    expect(tracker.processButton(true)).toBe(true);

    // Held across multiple frames
    expect(tracker.processButton(true)).toBe(false);
    expect(tracker.processButton(true)).toBe(false);

    // Released: DOWN -> UP
    expect(tracker.processButton(false)).toBe(false);

    // Next click: UP -> DOWN
    expect(tracker.processButton(true)).toBe(true);
  });

  it("evaluates angular circle collision with exact boundary precision", () => {
    const target = {
      id: 1,
      xAngleUnits: 100000,
      yAngleUnits: 50000,
      radiusAngleUnits: 25000,
    };

    // Center hit
    expect(
      testAngularHit(createAngleUnits(100000), createAngleUnits(50000), target),
    ).toBe(true);

    // Hit exactly on boundary (radius = 25000: 100000 + 25000 = 125000)
    expect(
      testAngularHit(createAngleUnits(125000), createAngleUnits(50000), target),
    ).toBe(true);

    // Pythagorean boundary: dx=20000, dy=15000 -> 20000^2 + 15000^2 = 625,000,000 == 25000^2
    expect(
      testAngularHit(createAngleUnits(120000), createAngleUnits(65000), target),
    ).toBe(true);

    // 1 unit outside boundary: dx=20001, dy=15000
    expect(
      testAngularHit(createAngleUnits(120001), createAngleUnits(65000), target),
    ).toBe(false);
  });

  it("identifies the hit target among multiple active candidates or returns null on miss", () => {
    const targets = [
      { id: 10, xAngleUnits: 0, yAngleUnits: 0, radiusAngleUnits: 25000 },
      {
        id: 20,
        xAngleUnits: 200000,
        yAngleUnits: 100000,
        radiusAngleUnits: 25000,
      },
      {
        id: 30,
        xAngleUnits: -200000,
        yAngleUnits: -100000,
        radiusAngleUnits: 25000,
      },
    ];

    // Hit target 10
    const hit1 = findHitTarget(
      createAngleUnits(5000),
      createAngleUnits(5000),
      targets,
    );
    expect(hit1?.id).toBe(10);

    // Hit target 20
    const hit2 = findHitTarget(
      createAngleUnits(201000),
      createAngleUnits(99000),
      targets,
    );
    expect(hit2?.id).toBe(20);

    // Miss into empty space
    const miss = findHitTarget(
      createAngleUnits(100000),
      createAngleUnits(100000),
      targets,
    );
    expect(miss).toBeNull();
  });
});
