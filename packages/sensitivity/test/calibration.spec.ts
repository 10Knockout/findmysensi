import { describe, it, expect } from "vitest";
import { calculateMouseSwap } from "../src/index.js";

describe("Mouse Swap (@findmysensi/sensitivity)", () => {
  it("calculates mouse swap DPI adjustment accurately", () => {
    const res = calculateMouseSwap(
      2.0,
      { name: "Old Mouse", dpi: 400 },
      { name: "New Mouse", dpi: 800 },
    );

    expect(res.adjustedSens).toBeCloseTo(1.0, 4);
    expect(res.dpiScalingFactor).toBe(0.5);
  });

  it("returns the same sensitivity when DPI is unchanged", () => {
    const res = calculateMouseSwap(
      0.4,
      { name: "Same", dpi: 800 },
      { name: "Same", dpi: 800 },
    );
    expect(res.adjustedSens).toBeCloseTo(0.4, 5);
    expect(res.dpiScalingFactor).toBe(1);
  });

  it("rejects non-positive sensitivity or DPI", () => {
    expect(() =>
      calculateMouseSwap(0, { name: "A", dpi: 800 }, { name: "B", dpi: 800 }),
    ).toThrow();
    expect(() =>
      calculateMouseSwap(0.4, { name: "A", dpi: 0 }, { name: "B", dpi: 800 }),
    ).toThrow();
  });
});
