import { describe, expect, it } from "vitest";
import { createRunTraceRecorder, toShotOffsets } from "./run-trace.js";

describe("RunTrace", () => {
  it("collects shots and normalizes offsets to target radius", () => {
    const rec = createRunTraceRecorder();
    rec.record({
      tick: 10,
      aimYaw: 100,
      aimPitch: 0,
      targetYaw: 100,
      targetPitch: 0,
      targetRadius: 50,
      hit: true,
    });
    rec.record({
      tick: 20,
      aimYaw: 175,
      aimPitch: -25,
      targetYaw: 100,
      targetPitch: 0,
      targetRadius: 50,
      hit: false,
    });
    const trace = rec.finish();
    expect(trace.shots).toHaveLength(2);
    const offsets = toShotOffsets(trace);
    expect(offsets[0]).toEqual({ dx: 0, dy: 0, hit: true });
    expect(offsets[1]).toEqual({ dx: 1.5, dy: -0.5, hit: false });
  });

  it("finish() returns a frozen, independent snapshot", () => {
    const rec = createRunTraceRecorder();
    rec.record({
      tick: 1,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: true,
    });
    const a = rec.finish();
    rec.record({
      tick: 2,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    });
    expect(a.shots).toHaveLength(1);
    expect(Object.isFrozen(a.shots)).toBe(true);
  });
});
