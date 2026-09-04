import { describe, expect, it } from "vitest";
import { classifyMiss } from "../src/miss-classification.js";

describe("classifyMiss", () => {
  it("reports right when the target is to the right of the aim point", () => {
    const result = classifyMiss(30_000, 0, 20_000);
    expect(result.direction).toBe("right");
    expect(result.overshootAngleUnits).toBe(10_000);
  });

  it("reports left when the target is to the left of the aim point", () => {
    const result = classifyMiss(-30_000, 0, 20_000);
    expect(result.direction).toBe("left");
  });

  it("reports up when the target is above the aim point", () => {
    const result = classifyMiss(0, 30_000, 20_000);
    expect(result.direction).toBe("up");
  });

  it("reports down when the target is below the aim point", () => {
    const result = classifyMiss(0, -30_000, 20_000);
    expect(result.direction).toBe("down");
  });

  it("reports unclear for a near-exact diagonal miss rather than guessing", () => {
    const result = classifyMiss(20_000, 20_000, 5_000);
    expect(result.direction).toBe("unclear");
  });

  it("never reports a negative overshoot even for a near-hit boundary case", () => {
    const result = classifyMiss(20_000, 0, 25_000);
    expect(result.overshootAngleUnits).toBe(0);
  });
});
