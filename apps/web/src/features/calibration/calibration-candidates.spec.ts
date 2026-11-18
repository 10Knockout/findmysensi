import { describe, expect, it } from "vitest";
import {
  discoveryCandidates,
  parseCalibrationSensitivity,
  refinementCandidates,
} from "./calibration-candidates.js";

describe("sensitivity comparison candidates", () => {
  it("keeps the entered value in discovery and compares 0.01 steps in refinement", () => {
    expect(discoveryCandidates(0.25)).toEqual([0.2, 0.225, 0.25, 0.275, 0.3]);
    expect(refinementCandidates(0.25)).toEqual([0.24, 0.25, 0.26]);
  });

  it("compares valid 0.01 steps even near the browser sensitivity limits", () => {
    expect(refinementCandidates(0.004)).toEqual([0.004, 0.014, 0.024]);
    expect(refinementCandidates(99.999)).toEqual([99.979, 99.989, 99.999]);
    expect(discoveryCandidates(100)).toEqual([80, 90, 100]);
  });

  it("accepts fractional text and rejects empty or out-of-range inputs", () => {
    expect(parseCalibrationSensitivity("0.125")).toBe(0.125);
    expect(parseCalibrationSensitivity(".125")).toBe(0.125);
    expect(parseCalibrationSensitivity("")).toBeNull();
    expect(parseCalibrationSensitivity("0.")).toBeNull();
    expect(parseCalibrationSensitivity("100.001")).toBeNull();
  });
});
