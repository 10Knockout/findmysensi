import { describe, expect, it } from "vitest";
import { createTick } from "../src/brands.js";
import { STATE_HASH_DOMAIN_V1 } from "../src/ranked/domains.js";
import {
  CanonicalStateV1,
  decodeCanonicalStateV1,
  encodeCanonicalStateV1,
  hashCanonicalStateV1,
} from "../src/ranked/state-encoding.js";

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

describe("Canonical State Encoding and Domain-Separated Hashes (V1)", () => {
  it("defines exact domain separation identifier", () => {
    expect(STATE_HASH_DOMAIN_V1).toBe("FMS:STATE-HASH:V1");
  });

  it("encodes state with domain separation header and little-endian integers", () => {
    const state: CanonicalStateV1 = {
      tick: createTick(120),
      yaw: 4194304,
      pitch: -1000,
      valid: true,
      shotsCount: 5,
    };

    const encoded = encodeCanonicalStateV1(state);

    // Hand-derived expected bytes (35 bytes total):
    // Domain length: 0x11 (17)
    // Domain ASCII: "FMS:STATE-HASH:V1"
    // tick=120: 0x78, 0x00, 0x00, 0x00
    // yaw=4194304: 0x00, 0x00, 0x40, 0x00
    // pitch=-1000: 0x18, 0xFC, 0xFF, 0xFF
    // valid=true: 0x01
    // shotsCount=5: 0x05, 0x00, 0x00, 0x00
    const expectedHex =
      "11464d533a53544154452d484153483a5631780000000000400018fcffff0105000000";

    expect(bytesToHex(encoded)).toBe(expectedHex);
    expect(encoded.byteLength).toBe(35);

    // Verify round-trip decoding
    const decoded = decodeCanonicalStateV1(encoded);
    expect(decoded).toEqual(state);
  });

  it("computes reproducible SHA-256 state hash using Web Crypto subtle digest", async () => {
    const state: CanonicalStateV1 = {
      tick: createTick(120),
      yaw: 4194304,
      pitch: -1000,
      valid: true,
      shotsCount: 5,
    };

    const hash = await hashCanonicalStateV1(state);
    expect(hash.byteLength).toBe(32);

    const hashHex = bytesToHex(hash);

    // Second execution with same inputs produces identical hash (determinism)
    const hash2 = await hashCanonicalStateV1(state);
    expect(bytesToHex(hash2)).toBe(hashHex);

    // Mutation by 1 tick produces completely different hash
    const mutatedState: CanonicalStateV1 = { ...state, tick: createTick(121) };
    const mutatedHash = await hashCanonicalStateV1(mutatedState);
    expect(bytesToHex(mutatedHash)).not.toBe(hashHex);
  });

  it("fails decoding if domain separation prefix does not match", () => {
    const state: CanonicalStateV1 = {
      tick: createTick(1),
      yaw: 0,
      pitch: 0,
      valid: true,
      shotsCount: 0,
    };

    const encoded = encodeCanonicalStateV1(state);
    encoded[5] = 0x58; // Corrupt domain character

    expect(() => decodeCanonicalStateV1(encoded)).toThrow(
      /Invalid state domain/,
    );
  });
});
