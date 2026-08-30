import { CanonicalReader } from "../binary/reader.js";
import { CanonicalWriter } from "../binary/writer.js";
import { Tick, createTick } from "../brands.js";
import { STATE_HASH_DOMAIN_V1 } from "./domains.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export interface CanonicalStateV1 {
  readonly tick: Tick;
  readonly yaw: number;
  readonly pitch: number;
  readonly valid: boolean;
  readonly shotsCount: number;
}

export function encodeCanonicalStateV1(state: CanonicalStateV1): Uint8Array {
  const writer = new CanonicalWriter(64);

  // 1. Domain Separation Header
  const domainBytes = textEncoder.encode(STATE_HASH_DOMAIN_V1);
  writer.u8(domainBytes.length);
  writer.bytes(domainBytes);

  // 2. Canonical Simulation State Fields
  writer.u32(state.tick);
  writer.u32(state.yaw);
  writer.i32(state.pitch);
  writer.u8(state.valid ? 1 : 0);
  writer.u32(state.shotsCount);

  return writer.finish();
}

export function decodeCanonicalStateV1(bytes: Uint8Array): CanonicalStateV1 {
  const reader = new CanonicalReader(bytes);

  // 1. Verify Domain Separation Header
  const domainLen = reader.u8();
  const domainBytes = reader.bytes(domainLen);
  const domain = textDecoder.decode(domainBytes);
  if (domain !== STATE_HASH_DOMAIN_V1) {
    throw new Error(
      `Invalid state domain: "${domain}". Expected "${STATE_HASH_DOMAIN_V1}".`,
    );
  }

  // 2. Read Fields
  const tick = createTick(reader.u32());
  const yaw = reader.u32();
  const pitch = reader.i32();
  const valid = reader.u8() !== 0;
  const shotsCount = reader.u32();

  reader.assertExhausted();

  return {
    tick,
    yaw,
    pitch,
    valid,
    shotsCount,
  };
}

export async function hashCanonicalStateV1(
  state: CanonicalStateV1,
): Promise<Uint8Array> {
  const encoded = encodeCanonicalStateV1(state);
  const digestBuffer = await globalThis.crypto.subtle.digest(
    "SHA-256",
    encoded as unknown as BufferSource,
  );
  return new Uint8Array(digestBuffer);
}
