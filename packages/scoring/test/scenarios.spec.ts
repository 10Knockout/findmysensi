import { describe, expect, it } from "vitest";
import { computePinpointDevScore } from "../src/pinpoint/dev-v0.js";
import { computeMultiDevScore } from "../src/multi/dev-v0.js";
import { computeHeadlineDevScore } from "../src/headline/dev-v0.js";
import { computeStrafeDevScore } from "../src/strafe/dev-v0.js";
import { computeSmoothTrackDevScore } from "../src/smooth-track/dev-v0.js";
import type { FlickMetrics } from "@findmysensi/analytics";

function makeFlickMetrics(overrides: Partial<FlickMetrics> = {}): FlickMetrics {
  return {
    hits: 20,
    shots: 25,
    misses: 5,
    accuracyPercentage: 80,
    acquisitionTicks: [40, 50, 60],
    avgAcquisitionTicks: 50,
    killsPerSecond: 3,
    ...overrides,
  };
}

describe("Pinpoint Scoring", () => {
  it("scores 1500 per hit minus 300 per miss", () => {
    const metrics = makeFlickMetrics({ hits: 10, misses: 2 });
    const result = computePinpointDevScore(metrics);
    // 10*1500 - 2*300 = 14400
    expect(result.score).toBe(14400);
  });

  it("applies 1.5x bonus at ≥99% accuracy", () => {
    const metrics = makeFlickMetrics({
      hits: 100,
      misses: 0,
      shots: 100,
      accuracyPercentage: 100,
    });
    const result = computePinpointDevScore(metrics);
    // 100*1500*1.5 = 225000
    expect(result.score).toBe(225000);
  });

  it("applies 1.2x bonus at ≥95% accuracy", () => {
    const metrics = makeFlickMetrics({
      hits: 20,
      misses: 1,
      shots: 21,
      accuracyPercentage: 95.24,
    });
    const result = computePinpointDevScore(metrics);
    const base = 20 * 1500 - 1 * 300; // 29700
    expect(result.score).toBe(Math.floor(base * 1.2));
  });
});

describe("Multi Scoring", () => {
  it("scores 800 per hit minus 150 per miss", () => {
    const metrics = makeFlickMetrics({ hits: 15, misses: 3 });
    const result = computeMultiDevScore(metrics);
    expect(result.score).toBe(15 * 800 - 3 * 150);
  });

  it("applies 1.3x speed bonus at ≥6 KPS", () => {
    const metrics = makeFlickMetrics({
      hits: 30,
      misses: 0,
      killsPerSecond: 6,
    });
    const result = computeMultiDevScore(metrics);
    expect(result.score).toBe(Math.floor(30 * 800 * 1.3));
  });
});

describe("Headline Scoring", () => {
  it("scores 1000 per hit minus 200 per miss", () => {
    const metrics = makeFlickMetrics({ hits: 25, misses: 5 });
    const result = computeHeadlineDevScore(metrics);
    expect(result.score).toBe(25 * 1000 - 5 * 200);
  });

  it("applies 1.2x fast acquisition bonus", () => {
    const metrics = makeFlickMetrics({
      hits: 20,
      misses: 0,
      avgAcquisitionTicks: 30,
    });
    const result = computeHeadlineDevScore(metrics);
    expect(result.score).toBe(Math.floor(20 * 1000 * 1.2));
  });
});

describe("Strafe Scoring", () => {
  it("scores 1200 per hit minus 250 per miss", () => {
    const metrics = makeFlickMetrics({ hits: 10, misses: 2 });
    const result = computeStrafeDevScore(metrics);
    expect(result.score).toBe(10 * 1200 - 2 * 250);
  });

  it("applies 1.3x accuracy bonus at ≥95%", () => {
    const metrics = makeFlickMetrics({
      hits: 20,
      misses: 0,
      accuracyPercentage: 100,
    });
    const result = computeStrafeDevScore(metrics);
    expect(result.score).toBe(Math.floor(20 * 1200 * 1.3));
  });
});

describe("Smooth Track Scoring", () => {
  it("scores based on on-target percentage", () => {
    const result = computeSmoothTrackDevScore({
      onTargetTicks: 500,
      totalTicks: 1000,
      onTargetPercentage: 50,
      averageErrorUnits: 30000,
      maxErrorUnits: 100000,
    });
    expect(result.score).toBe(50000);
  });

  it("applies 1.2x accuracy bonus for low average error", () => {
    const result = computeSmoothTrackDevScore({
      onTargetTicks: 800,
      totalTicks: 1000,
      onTargetPercentage: 80,
      averageErrorUnits: 10000,
      maxErrorUnits: 50000,
    });
    expect(result.score).toBe(Math.floor(80000 * 1.2));
  });

  it("applies 0.9x penalty for high max error", () => {
    const result = computeSmoothTrackDevScore({
      onTargetTicks: 700,
      totalTicks: 1000,
      onTargetPercentage: 70,
      averageErrorUnits: 50000,
      maxErrorUnits: 300000,
    });
    expect(result.score).toBe(Math.floor(70000 * 0.9));
  });
});
