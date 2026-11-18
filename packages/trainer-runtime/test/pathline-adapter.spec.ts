import {
  createAngleUnits,
  createPitchUnits,
  createPrngV1,
  degreesToAngleDeltaUnits,
  shortestSignedAngleDelta,
  wrapYaw,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createPathlineModeAdapter } from "../src/pathline-adapter.js";

function startPath() {
  const adapter = createPathlineModeAdapter();
  const prng = createPrngV1([5, 6, 7, 8]);
  adapter.initialize(prng);
  const guide = adapter.getAimCorridor?.();
  if (!guide) throw new Error("Missing path corridor");
  adapter.onShot(
    createTick(1),
    createAngleUnits(guide.startYaw),
    createPitchUnits(guide.startPitch),
    prng,
  );
  return { adapter, guide, prng };
}

describe("Pathline practice", () => {
  it("seeds a visible path and scores travel across the yaw seam", () => {
    const { adapter, guide, prng } = startPath();
    expect(startPath().guide).toEqual(guide);
    const start = createAngleUnits(guide.startYaw);
    const end = createAngleUnits(guide.endYaw);
    const middleYaw = wrapYaw(
      start + Math.round(shortestSignedAngleDelta(start, end) / 2),
    );
    const middlePitch = createPitchUnits(
      Math.round((guide.startPitch + guide.endPitch) / 2),
    );
    adapter.onSimulationTick(createTick(2), middleYaw, middlePitch);
    adapter.onShot(createTick(3), end, createPitchUnits(guide.endPitch), prng);

    const metrics = adapter.computeMetrics(3);
    expect(metrics).toMatchObject({
      segmentsCompleted: 1,
      cleanSegments: 1,
      pathTicks: 1,
      corridorTicks: 1,
    });
    expect(adapter.computeScore(metrics).score).toBe(1000);
    expect(adapter.getAimCorridor?.()?.startYaw).toBe(guide.endYaw);
  });

  it("blocks completion after a detour until the player restarts from the same orb", () => {
    const { adapter, guide, prng } = startPath();
    adapter.onAimMove?.(
      createAngleUnits(guide.startYaw),
      createPitchUnits(degreesToAngleDeltaUnits(20)),
    );
    expect(adapter.getAimCorridor?.()?.leftCorridor).toBe(true);
    adapter.onShot(
      createTick(2),
      createAngleUnits(guide.endYaw),
      createPitchUnits(guide.endPitch),
      prng,
    );

    const failedAttempt = adapter.computeMetrics(2);
    expect(failedAttempt).toMatchObject({
      segmentsCompleted: 0,
      cleanSegments: 0,
      hits: 1,
    });
    expect(adapter.computeScore(failedAttempt).score).toBe(0);
    expect(adapter.getAimCorridor?.()?.leftCorridor).toBe(true);
    expect(adapter.getRenderTargets()[0]?.xAngleUnits).toBe(guide.startYaw);

    adapter.onShot(
      createTick(3),
      createAngleUnits(guide.startYaw),
      createPitchUnits(guide.startPitch),
      prng,
    );
    expect(adapter.getAimCorridor?.()?.leftCorridor).toBe(false);
    adapter.onShot(
      createTick(4),
      createAngleUnits(guide.endYaw),
      createPitchUnits(guide.endPitch),
      prng,
    );
    const metrics = adapter.computeMetrics(4);
    expect(metrics).toMatchObject({ segmentsCompleted: 1, cleanSegments: 1 });
    expect(adapter.computeScore(metrics).score).toBe(900);
  });
});
