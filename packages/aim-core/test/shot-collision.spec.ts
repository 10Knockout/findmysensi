import { describe, expect, it } from "vitest";
import { findHitTarget, testAngularHit } from "../src/collision/target.js";
import {
  createAngleUnits,
  createPitchUnits,
  FULL_TURN_UNITS,
  wrapYaw,
} from "../src/fixed/angle.js";
import { createShotTracker } from "../src/input/shot.js";

describe("Authoritative Shot & Collision Semantics", () => {
  it("enforces UP->DOWN transition is exactly one shot with no autofire on hold", () => {
    const tracker = createShotTracker();

    expect(tracker.processButton(false)).toBe(false);
    expect(tracker.processButton(true)).toBe(true);
    expect(tracker.processButton(true)).toBe(false);
    expect(tracker.processButton(true)).toBe(false);
    expect(tracker.processButton(false)).toBe(false);
    expect(tracker.processButton(true)).toBe(true);
  });

  it("evaluates angular circle collision with exact boundary precision", () => {
    const target = {
      id: 1,
      xAngleUnits: 100000,
      yAngleUnits: 50000,
      radiusAngleUnits: 25000,
    };

    expect(
      testAngularHit(
        createAngleUnits(100000),
        createPitchUnits(50000),
        target,
      ),
    ).toBe(true);

    expect(
      testAngularHit(
        createAngleUnits(125000),
        createPitchUnits(50000),
        target,
      ),
    ).toBe(true);

    expect(
      testAngularHit(
        createAngleUnits(120000),
        createPitchUnits(65000),
        target,
      ),
    ).toBe(true);

    expect(
      testAngularHit(
        createAngleUnits(120001),
        createPitchUnits(65000),
        target,
      ),
    ).toBe(false);
  });

  it("hits across the yaw wrap seam using shortest angular distance", () => {
    const target = {
      id: 99,
      xAngleUnits: 5_000,
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
        xAngleUnits: wrapYaw(-200000),
        yAngleUnits: -100000,
        radiusAngleUnits: 25000,
      },
    ];

    const hit1 = findHitTarget(
      createAngleUnits(5000),
      createPitchUnits(5000),
      targets,
    );
    expect(hit1?.id).toBe(10);

    const hit2 = findHitTarget(
      createAngleUnits(201000),
      createPitchUnits(99000),
      targets,
    );
    expect(hit2?.id).toBe(20);

    const miss = findHitTarget(
      createAngleUnits(100000),
      createPitchUnits(100000),
      targets,
    );
    expect(miss).toBeNull();
  });
});
