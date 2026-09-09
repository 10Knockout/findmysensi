import { describe, expect, it } from "vitest";
import type { RunTrace } from "@findmysensi/trainer-runtime";
import { buildMovementAnalysis } from "./movement-analysis.js";

const trace: RunTrace = {
  shots: [
    {
      tick: 1,
      aimYaw: 0,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: true,
    },
    {
      tick: 2,
      aimYaw: 25,
      aimPitch: 0,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    }, // dx 2.5 right, overflick
    {
      tick: 3,
      aimYaw: 0,
      aimPitch: -5,
      targetYaw: 0,
      targetPitch: 0,
      targetRadius: 10,
      hit: false,
    }, // dy -0.5 down, underflick
  ],
};

describe("buildMovementAnalysis", () => {
  it("tallies miss directions and over/under flick", () => {
    const a = buildMovementAnalysis(trace);
    expect(a.points).toHaveLength(3);
    expect(a.missTally.right).toBe(1);
    expect(a.missTally.down).toBe(1);
    expect(a.meanMissDistanceRadii).toBeCloseTo((2.5 + 0.5) / 2, 5);
    expect(a.overflickRatio).toBeCloseTo(0.5, 5);
  });

  it("is all-zero for a flawless trace", () => {
    const a = buildMovementAnalysis({ shots: [trace.shots[0]!] });
    expect(a.meanMissDistanceRadii).toBe(0);
    expect(a.overflickRatio).toBe(0);
  });

  it("clamps extreme offsets to +/- 3 radii for plotting", () => {
    const a = buildMovementAnalysis({
      shots: [
        {
          tick: 1,
          aimYaw: 1000,
          aimPitch: 0,
          targetYaw: 0,
          targetPitch: 0,
          targetRadius: 10,
          hit: false,
        },
      ],
    });
    expect(a.points[0]!.dx).toBe(3);
  });
});
