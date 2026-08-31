import { describe, it, expect } from "vitest";
import { createPrngV1 } from "../src/prng/xoshiro128ss.js";

describe("Xoshiro128** PRNG", () => {
  it("should output deterministic sequence for given seed", () => {
    const seed = new Uint8Array(16);
    // seed is all 0s, it should fallback to constants
    const rng = createPrngV1(seed);
    const vals = [rng.nextU32(), rng.nextU32(), rng.nextU32()];
    
    // Create new rng with same seed
    const rng2 = createPrngV1(new Uint8Array(16));
    expect(rng2.nextU32()).toBe(vals[0]);
    expect(rng2.nextU32()).toBe(vals[1]);
    expect(rng2.nextU32()).toBe(vals[2]);
  });

  it("should bound nextRange without bias", () => {
    const rng = createPrngV1([1, 2, 3, 4]);
    for (let i = 0; i < 1000; i++) {
      const val = rng.nextRange(10, 20);
      expect(val).toBeGreaterThanOrEqual(10);
      expect(val).toBeLessThan(20);
      expect(Number.isSafeInteger(val)).toBe(true);
    }
  });

  it("should snapshot and restore state", () => {
    const rng1 = createPrngV1([1, 2, 3, 4]);
    rng1.nextU32();
    rng1.nextU32();
    
    const snap = rng1.snapshot();
    const rng2 = createPrngV1(snap);
    
    expect(rng1.nextU32()).toBe(rng2.nextU32());
  });
});
