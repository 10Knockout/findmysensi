import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import type { ModeRuntimeAdapter } from "../src/adapter.js";

describe("ModeRuntimeAdapter shape", () => {
  it("accepts a minimal object satisfying the interface", () => {
    let ticked = 0;
    let shots = 0;

    const adapter: ModeRuntimeAdapter = {
      modeId: "test-mode",
      definition: {
        modeId: "test-mode",
        scenarioVersion: 0,
        engineVersion: 1,
        scoringVersion: 0,
        durationTicks: 100,
        simulation: {
          maxActiveTargets: 1,
          targetRadiusAngleUnits: 1000,
          spawnAreaWidthUnits: 1000,
          spawnAreaHeightUnits: 1000,
          minTargetSeparationUnits: 0,
        },
        rankedSettings: {
          rankedEnabled: false,
          strictInputHealth: false,
          maxLagViolationTicks: 128,
        },
      },
      initialize: () => {},
      onSimulationTick: () => {
        ticked++;
      },
      onShot: () => {
        shots++;
      },
      getRenderTargets: () => [],
      computeMetrics: () => ({
        hits: 0,
        shots: 0,
        misses: 0,
        accuracyPercentage: 0,
        acquisitionTicks: [],
        avgAcquisitionTicks: 0,
        killsPerSecond: 0,
      }),
      computeScore: (metrics) => ({ score: 0, metrics }),
    };

    adapter.onSimulationTick(createTick(0), 0, 0);
    adapter.onShot(createTick(0), 0, 0, {} as never);

    expect(ticked).toBe(1);
    expect(shots).toBe(1);
    expect(adapter.getRenderTargets()).toEqual([]);
  });
});
