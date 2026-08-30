import { describe, expect, it } from "vitest";
import { CanonicalReader } from "../src/binary/reader.js";
import { CanonicalWriter } from "../src/binary/writer.js";

describe("Canonical Binary Codec", () => {
  describe("CanonicalWriter & CanonicalReader primitives", () => {
    it("encodes and decodes u8 with range checks", () => {
      const writer = new CanonicalWriter();
      writer.u8(0);
      writer.u8(127);
      writer.u8(255);
      const bytes = writer.finish();

      expect(bytes).toEqual(new Uint8Array([0x00, 0x7f, 0xff]));

      const reader = new CanonicalReader(bytes);
      expect(reader.u8()).toBe(0);
      expect(reader.u8()).toBe(127);
      expect(reader.u8()).toBe(255);
      expect(reader.isExhausted()).toBe(true);

      expect(() => new CanonicalWriter().u8(-1)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u8(256)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u8(1.5)).toThrow(RangeError);
    });

    it("encodes and decodes u16 in little-endian with range checks", () => {
      const writer = new CanonicalWriter();
      writer.u16(0);
      writer.u16(0x1234);
      writer.u16(65535);
      const bytes = writer.finish();

      expect(bytes).toEqual(
        new Uint8Array([
          0x00,
          0x00, // 0
          0x34,
          0x12, // 0x1234 (little-endian)
          0xff,
          0xff, // 65535
        ]),
      );

      const reader = new CanonicalReader(bytes);
      expect(reader.u16()).toBe(0);
      expect(reader.u16()).toBe(0x1234);
      expect(reader.u16()).toBe(65535);
      expect(reader.isExhausted()).toBe(true);

      expect(() => new CanonicalWriter().u16(-1)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u16(65536)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u16(12.3)).toThrow(RangeError);
    });

    it("encodes and decodes u32 in little-endian with range checks", () => {
      const writer = new CanonicalWriter();
      writer.u32(0);
      writer.u32(0x12345678);
      writer.u32(4294967295);
      const bytes = writer.finish();

      expect(bytes).toEqual(
        new Uint8Array([
          0x00,
          0x00,
          0x00,
          0x00, // 0
          0x78,
          0x56,
          0x34,
          0x12, // 0x12345678 (little-endian)
          0xff,
          0xff,
          0xff,
          0xff, // 4294967295
        ]),
      );

      const reader = new CanonicalReader(bytes);
      expect(reader.u32()).toBe(0);
      expect(reader.u32()).toBe(0x12345678);
      expect(reader.u32()).toBe(4294967295);
      expect(reader.isExhausted()).toBe(true);

      expect(() => new CanonicalWriter().u32(-1)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u32(4294967296)).toThrow(RangeError);
      expect(() => new CanonicalWriter().u32(100.5)).toThrow(RangeError);
    });

    it("encodes and decodes i32 in two's complement little-endian with range checks", () => {
      const writer = new CanonicalWriter();
      writer.i32(0);
      writer.i32(-1);
      writer.i32(2147483647);
      writer.i32(-2147483648);
      writer.i32(-123456);
      const bytes = writer.finish();

      const reader = new CanonicalReader(bytes);
      expect(reader.i32()).toBe(0);
      expect(reader.i32()).toBe(-1);
      expect(reader.i32()).toBe(2147483647);
      expect(reader.i32()).toBe(-2147483648);
      expect(reader.i32()).toBe(-123456);
      expect(reader.isExhausted()).toBe(true);

      expect(() => new CanonicalWriter().i32(-2147483649)).toThrow(RangeError);
      expect(() => new CanonicalWriter().i32(2147483648)).toThrow(RangeError);
      expect(() => new CanonicalWriter().i32(0.5)).toThrow(RangeError);
    });

    it("encodes and decodes arbitrary byte slices", () => {
      const payload = new Uint8Array([0xde, 0xad, 0xbe, 0xef]);
      const writer = new CanonicalWriter();
      writer.u8(payload.length);
      writer.bytes(payload);
      const bytes = writer.finish();

      expect(bytes).toEqual(new Uint8Array([0x04, 0xde, 0xad, 0xbe, 0xef]));

      const reader = new CanonicalReader(bytes);
      const len = reader.u8();
      const readPayload = reader.bytes(len);
      expect(readPayload).toEqual(payload);
      expect(reader.isExhausted()).toBe(true);
    });
  });

  describe("Reader bounds and error handling", () => {
    it("throws RangeError when reading past end of buffer (truncation)", () => {
      const reader = new CanonicalReader(new Uint8Array([0x01, 0x02]));
      expect(reader.u8()).toBe(1);
      expect(reader.u8()).toBe(2);
      expect(() => reader.u8()).toThrow(RangeError);
    });

    it("throws RangeError when multi-byte integer is truncated", () => {
      const reader = new CanonicalReader(new Uint8Array([0x01]));
      expect(() => reader.u16()).toThrow(RangeError);
      expect(() => reader.u32()).toThrow(RangeError);
      expect(() => reader.i32()).toThrow(RangeError);
    });

    it("throws RangeError on oversized bytes read request", () => {
      const reader = new CanonicalReader(new Uint8Array([0x01, 0x02]));
      expect(() => reader.bytes(5)).toThrow(RangeError);
      expect(() => reader.bytes(-1)).toThrow(RangeError);
    });

    it("detects trailing unread bytes correctly", () => {
      const reader = new CanonicalReader(new Uint8Array([0x01, 0x02, 0x03]));
      expect(reader.u8()).toBe(1);
      expect(reader.isExhausted()).toBe(false);
      expect(reader.remaining()).toBe(2);
      expect(() => reader.assertExhausted()).toThrow(Error);
    });
  });

  describe("Golden Vector Check", () => {
    it("matches exact hand-derived binary encoding for a representative sample structure", () => {
      // Structure:
      // magic: u16 = 0x464D ('FM')
      // version: u8 = 1
      // flags: u8 = 0b00000011 (3)
      // sequence: u32 = 42
      // score: i32 = -500
      // hash: bytes[4] = [0xAA, 0xBB, 0xCC, 0xDD]
      const writer = new CanonicalWriter();
      writer.u16(0x464d);
      writer.u8(1);
      writer.u8(3);
      writer.u32(42);
      writer.i32(-500);
      writer.bytes(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));

      const serialized = writer.finish();

      // Hand-derived expected bytes:
      // 0x464D in LE: 0x4D, 0x46
      // 0x01
      // 0x03
      // 42 in u32 LE: 0x2A, 0x00, 0x00, 0x00
      // -500 in i32 two's complement LE:
      //   500 = 0x000001F4
      //   -500 = ~0x000001F4 + 1 = 0xFFFFFE0C
      //   LE bytes: 0x0C, 0xFE, 0xFF, 0xFF
      // bytes: 0xAA, 0xBB, 0xCC, 0xDD
      // Total length: 2 + 1 + 1 + 4 + 4 + 4 = 16 bytes
      const expected = new Uint8Array([
        0x4d, 0x46, 0x01, 0x03, 0x2a, 0x00, 0x00, 0x00, 0x0c, 0xfe, 0xff, 0xff,
        0xaa, 0xbb, 0xcc, 0xdd,
      ]);

      expect(serialized).toEqual(expected);

      // Verify decoding reconstructed exact structure
      const reader = new CanonicalReader(serialized);
      expect(reader.u16()).toBe(0x464d);
      expect(reader.u8()).toBe(1);
      expect(reader.u8()).toBe(3);
      expect(reader.u32()).toBe(42);
      expect(reader.i32()).toBe(-500);
      expect(reader.bytes(4)).toEqual(new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]));
      reader.assertExhausted();
    });
  });
});
