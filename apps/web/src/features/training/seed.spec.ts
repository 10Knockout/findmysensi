import { describe, expect, it } from "vitest";
import { generateRunSeed, isValidRunSeed } from "./seed.js";

describe("seed generator", () => {
  it("generates a valid 4-word unsigned 32-bit seed", () => {
    const seed = generateRunSeed();
    expect(seed).toHaveLength(4);
    expect(isValidRunSeed(seed)).toBe(true);

    for (const word of seed) {
      expect(Number.isInteger(word)).toBe(true);
      expect(word).toBeGreaterThanOrEqual(0);
      expect(word).toBeLessThanOrEqual(0xffffffff);
    }
  });

  it("produces high-entropy differing seeds on successive invocations", () => {
    const seed1 = generateRunSeed();
    const seed2 = generateRunSeed();
    expect(seed1).not.toEqual(seed2);
  });

  it("validates seed tuples correctly", () => {
    expect(isValidRunSeed([0, 1, 2, 3])).toBe(true);
    expect(isValidRunSeed([0, 1, 2])).toBe(false);
    expect(isValidRunSeed([0, 1, 2, 3, 4])).toBe(false);
    expect(isValidRunSeed([-1, 1, 2, 3])).toBe(false);
    expect(isValidRunSeed([0x100000000, 1, 2, 3])).toBe(false);
    expect(isValidRunSeed("invalid")).toBe(false);
  });
});
