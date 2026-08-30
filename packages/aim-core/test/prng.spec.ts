import { describe, expect, it } from "vitest";
import { createPrngV1 } from "../src/prng/xoshiro128ss.js";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

describe("Deterministic PRNG (PrngV1 - xoshiro128**)", () => {
  it("computes exact deterministic sequence for standard seed", () => {
    const seed = hexToBytes("0102030405060708090a0b0c0d0e0f10");
    const prng = createPrngV1(seed);

    expect(prng.snapshot()).toEqual([
      67305985, 134678021, 202050057, 269422093,
    ]);

    const u32Expected = [
      2651287860, 1388061824, 8917065, 2895752141, 2010147415, 3980143988,
      1901333309, 2443837832, 2830575258, 3369349576,
    ];

    const generated: number[] = [];
    for (let i = 0; i < u32Expected.length; i++) {
      generated.push(prng.nextU32());
    }
    expect(generated).toEqual(u32Expected);
  });

  it("handles all-zero seed with non-zero fractional constants fallback", () => {
    const seed = hexToBytes("00000000000000000000000000000000");
    const prng = createPrngV1(seed);

    expect(prng.snapshot()).toEqual([
      2654435769, 3144134277, 1013904242, 2773480762,
    ]);

    const u32Expected = [
      2631316340, 4130397495, 1280476914, 658290876, 3258317435, 1472675543,
      3228328779, 1513538052, 2241547289, 599676020,
    ];

    const generated: number[] = [];
    for (let i = 0; i < u32Expected.length; i++) {
      generated.push(prng.nextU32());
    }
    expect(generated).toEqual(u32Expected);
  });

  it("computes exact deterministic sequence for ranked scenario seed", () => {
    const seed = hexToBytes("feedfacecafebabedeadbeef01234567");
    const prng = createPrngV1(seed);

    expect(prng.snapshot()).toEqual([
      3472551422, 3199925962, 4022250974, 1732584193,
    ]);

    const firstFiveU32 = [
      1868874812, 3821506951, 3573508822, 1064237771, 2800917846,
    ];

    for (let i = 0; i < firstFiveU32.length; i++) {
      expect(prng.nextU32()).toBe(firstFiveU32[i]);
    }
  });

  describe("Range bounds and rejection sampling invariants", () => {
    it("strictly generates numbers within [minInclusive, maxExclusive)", () => {
      const seed = new Uint8Array(16);
      seed[0] = 42;
      const prng = createPrngV1(seed);

      for (let i = 0; i < 500; i++) {
        const val = prng.nextRange(-10, 10);
        expect(val).toBeGreaterThanOrEqual(-10);
        expect(val).toBeLessThan(10);
        expect(Number.isSafeInteger(val)).toBe(true);
      }
    });

    it("rejects invalid range arguments", () => {
      const seed = new Uint8Array(16);
      const prng = createPrngV1(seed);

      expect(() => prng.nextRange(10, 10)).toThrow(RangeError);
      expect(() => prng.nextRange(10, 5)).toThrow(RangeError);
      expect(() => prng.nextRange(0.5, 10)).toThrow(RangeError);
      expect(() => prng.nextRange(0, 10.5)).toThrow(RangeError);
    });

    it("requires exactly 16 bytes for seed", () => {
      expect(() => createPrngV1(new Uint8Array(15))).toThrow(RangeError);
      expect(() => createPrngV1(new Uint8Array(32))).toThrow(RangeError);
    });
  });
});
