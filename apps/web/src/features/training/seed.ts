/**
 * Generates a fresh 128-bit cryptographic seed for non-official local runs.
 *
 * This runs strictly outside @findmysensi/aim-core so the simulation engine
 * remains pure and deterministic for any provided seed.
 */
export type RunSeed = readonly [number, number, number, number];

export function generateRunSeed(): [number, number, number, number] {
  const words = new Uint32Array(4);
  globalThis.crypto.getRandomValues(words);
  return [words[0]! >>> 0, words[1]! >>> 0, words[2]! >>> 0, words[3]! >>> 0];
}

export function isValidRunSeed(
  value: unknown,
): value is readonly [number, number, number, number] {
  if (!Array.isArray(value) || value.length !== 4) return false;
  return value.every(
    (word) =>
      typeof word === "number" &&
      Number.isInteger(word) &&
      word >= 0 &&
      word <= 0xffffffff,
  );
}
