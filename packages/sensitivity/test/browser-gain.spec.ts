import { describe, expect, it } from "vitest";
import {
  BASE_BROWSER_GAIN_ANGLE_UNITS,
  resolveBrowserGainAngleUnits,
} from "../src/browser-gain.js";

describe("FindMySensi browser gain", () => {
  it("uses the product default when sensitivity is unset", () => {
    expect(resolveBrowserGainAngleUnits(null)).toBe(
      BASE_BROWSER_GAIN_ANGLE_UNITS,
    );
  });

  it("applies decimal multipliers deterministically", () => {
    expect(resolveBrowserGainAngleUnits("0.5")).toBe(1_250);
    expect(resolveBrowserGainAngleUnits("1.0")).toBe(2_500);
    expect(resolveBrowserGainAngleUnits("1.5")).toBe(3_750);
    expect(resolveBrowserGainAngleUnits("2.25")).toBe(5_625);
  });

  it("rejects zero and malformed values", () => {
    expect(() => resolveBrowserGainAngleUnits("0")).toThrow(RangeError);
    expect(() => resolveBrowserGainAngleUnits("1e2")).toThrow(RangeError);
    expect(() => resolveBrowserGainAngleUnits("abc")).toThrow(RangeError);
  });
});
