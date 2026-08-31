import { describe, it, expect } from "vitest";
import { checkFixed, toFixed, toFloat, distSqBigInt } from "../src/fixed/range.js";

describe("Fixed Point Math", () => {
  it("should convert to and from fixed point accurately", () => {
    expect(toFixed(1.2345)).toBe(12345);
    expect(toFixed(-1.2345)).toBe(-12345);
    
    // Rounding
    expect(toFixed(1.23456)).toBe(12346);

    expect(toFloat(12345)).toBe(1.2345);
    expect(toFloat(-12345)).toBe(-1.2345);
  });

  it("should throw on non-safe integers", () => {
    expect(() => checkFixed(1.5)).toThrow();
    expect(() => checkFixed(Number.MAX_SAFE_INTEGER + 1)).toThrow();
    expect(() => checkFixed(Number.NaN)).toThrow();
    expect(() => checkFixed(Number.POSITIVE_INFINITY)).toThrow();
  });

  it("should compute accurate BigInt squared distances", () => {
    const x1 = toFixed(0);
    const y1 = toFixed(0);
    const x2 = toFixed(3);
    const y2 = toFixed(4);
    
    const dSq = distSqBigInt(x1, y1, x2, y2);
    // 30000^2 + 40000^2 = 900,000,000 + 1,600,000,000 = 2,500,000,000
    expect(dSq).toBe(2500000000n);
  });
});
