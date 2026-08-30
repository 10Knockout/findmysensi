export interface PrngV1 {
  nextU32(): number;
  nextRange(minInclusive: number, maxExclusive: number): number;
  snapshot(): readonly [number, number, number, number];
}

function rotl(x: number, k: number): number {
  return ((x << k) | (x >>> (32 - k))) >>> 0;
}

export function createPrngV1(seed: Uint8Array): PrngV1 {
  if (seed.byteLength !== 16) {
    throw new RangeError(
      `PrngV1 requires a 16-byte (128-bit) seed. Received ${seed.byteLength} bytes.`,
    );
  }

  const view = new DataView(seed.buffer, seed.byteOffset, seed.byteLength);
  let s0 = view.getUint32(0, true);
  let s1 = view.getUint32(4, true);
  let s2 = view.getUint32(8, true);
  let s3 = view.getUint32(12, true);

  // Non-zero fallback constants (fractional parts of sqrt(2), sqrt(3), sqrt(5), sqrt(7))
  if (s0 === 0 && s1 === 0 && s2 === 0 && s3 === 0) {
    s0 = 0x9e3779b9 >>> 0;
    s1 = 0xbb67ae85 >>> 0;
    s2 = 0x3c6ef372 >>> 0;
    s3 = 0xa54ff53a >>> 0;
  }

  const nextU32 = (): number => {
    const mult5 = Math.imul(s1, 5) >>> 0;
    const rot1 = rotl(mult5, 7);
    const result = Math.imul(rot1, 9) >>> 0;

    const t = (s1 << 9) >>> 0;

    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;

    s2 = (s2 ^ t) >>> 0;
    s3 = rotl(s3, 11);

    return result;
  };

  const nextRange = (minInclusive: number, maxExclusive: number): number => {
    if (
      !Number.isSafeInteger(minInclusive) ||
      !Number.isSafeInteger(maxExclusive) ||
      minInclusive >= maxExclusive
    ) {
      throw new RangeError(
        `Invalid range [${minInclusive}, ${maxExclusive}). Must be safe integers with min < max.`,
      );
    }

    const rangeSize = maxExclusive - minInclusive;
    // Rejection sampling bound to avoid modulo bias
    const threshold = (0x100000000 - (0x100000000 % rangeSize)) % 0x100000000;

    while (true) {
      const raw = nextU32();
      if (raw < threshold) {
        return minInclusive + (raw % rangeSize);
      }
    }
  };

  return {
    nextU32,
    nextRange,
    snapshot(): readonly [number, number, number, number] {
      return [s0, s1, s2, s3];
    },
  };
}
