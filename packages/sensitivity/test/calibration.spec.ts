import { describe, it, expect } from "vitest";
import {
  initializeCalibration,
  submitCalibrationChoice,
  calculateMouseSwap,
} from "../src/index.js";

describe("Calibration and Mouse Swap (@findmysensi/sensitivity)", () => {
  it("initializes blind calibration state properly", () => {
    const state = initializeCalibration(0.5, 2.0, 5);
    expect(state.round).toBe(1);
    expect(state.maxRounds).toBe(5);
    expect(state.isComplete).toBe(false);
    expect(state.currentA).toBeGreaterThan(0);
    expect(state.currentB).toBeGreaterThan(0);
  });

  it("progresses and terminates calibration with a recommended sensitivity", () => {
    let state = initializeCalibration(0.2, 1.8, 3);
    state = submitCalibrationChoice(state, "A");
    expect(state.round).toBe(2);
    expect(state.isComplete).toBe(false);

    state = submitCalibrationChoice(state, "B");
    expect(state.round).toBe(3);
    expect(state.isComplete).toBe(false);

    state = submitCalibrationChoice(state, "A");
    expect(state.round).toBe(4);
    expect(state.isComplete).toBe(true);
    expect(state.recommendedSens).toBeDefined();
    expect(state.recommendedSens!).toBeGreaterThan(0.2);
    expect(state.recommendedSens!).toBeLessThan(1.8);
  });

  it("calculates mouse swap DPI adjustment accurately", () => {
    const res = calculateMouseSwap(
      2.0,
      { name: "Old Mouse", dpi: 400 },
      { name: "New Mouse", dpi: 800 },
    );

    expect(res.adjustedSens).toBeCloseTo(1.0, 4);
    expect(res.dpiScalingFactor).toBe(0.5);
  });
});
