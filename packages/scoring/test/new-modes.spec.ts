import type { GridMetrics, SwitchTrackMetrics } from "@findmysensi/analytics";
import { describe, expect, it } from "vitest";
import {
  computeMicroshotDevScore,
  computeReactionDevScore,
  computeSwitchTrackDevScore,
} from "../src/index.js";

const clickMetrics: GridMetrics = {
  hits: 10,
  shots: 10,
  misses: 0,
  accuracyPercentage: 100,
  acquisitionTicks: [20],
  avgAcquisitionTicks: 20,
  killsPerSecond: 1,
};

describe("new mode scoring", () => {
  it("rewards precise Microshot hits", () => {
    expect(computeMicroshotDevScore(clickMetrics).score).toBe(13_750);
  });

  it("rewards fast Reaction acquisition", () => {
    expect(computeReactionDevScore(clickMetrics).score).toBe(19_500);
  });

  it("combines Switch Track holds with continuous accuracy", () => {
    const metrics: SwitchTrackMetrics = {
      switchesCompleted: 2,
      onTargetTicks: 64,
      totalTicks: 128,
      onTargetPercentage: 50,
      averageErrorUnits: 20_000,
      maxErrorUnits: 100_000,
      averageAcquisitionTicks: 32,
    };
    expect(computeSwitchTrackDevScore(metrics).score).toBe(10_350);
  });
});
