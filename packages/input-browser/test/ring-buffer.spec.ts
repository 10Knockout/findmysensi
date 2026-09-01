import { describe, expect, it } from "vitest";
import {
  createInputRingBuffer,
  createRawInputBatchTarget,
  EVENT_KIND_INVALIDATE,
  EVENT_KIND_MOVE,
  EVENT_KIND_SHOT,
} from "../src/ring-buffer.js";

describe("Preallocated Typed-Array Input Ring Buffer", () => {
  it("pushes and drains move and shot events into preallocated target batch", () => {
    const ring = createInputRingBuffer(32);
    const target = createRawInputBatchTarget(32);

    expect(ring.pushMove(100, -50, 10.5)).toEqual({
      accepted: true,
      overflow: false,
    });
    expect(ring.pushMove(20, 15, 10.8)).toEqual({
      accepted: true,
      overflow: false,
    });
    expect(ring.pushShot(0, 11.0)).toEqual({ accepted: true, overflow: false });

    expect(ring.getHighWaterMark()).toBe(3);

    const stats = ring.drainInto(target);

    expect(stats.drainedCount).toBe(3);
    expect(stats.overflowCount).toBe(0);
    expect(stats.lostTemporalPrecision).toBe(false);
    expect(stats.highWaterMark).toBe(3);

    expect(target.count).toBe(3);
    expect(target.kinds[0]).toBe(EVENT_KIND_MOVE);
    expect(target.dx[0]).toBe(100);
    expect(target.dy[0]).toBe(-50);
    expect(target.timeIndices[0]).toBe(10.5);
    expect(target.kinds[1]).toBe(EVENT_KIND_MOVE);
    expect(target.dx[1]).toBe(20);
    expect(target.dy[1]).toBe(15);
    expect(target.timeIndices[1]).toBe(10.8);
    expect(target.kinds[2]).toBe(EVENT_KIND_SHOT);
    expect(target.buttons[2]).toBe(0);
    expect(target.timeIndices[2]).toBe(11.0);

    const secondStats = ring.drainInto(target);
    expect(secondStats.drainedCount).toBe(0);
  });

  it("handles circular wraparound across multiple push/drain cycles", () => {
    const capacity = 8;
    const ring = createInputRingBuffer(capacity);
    const target = createRawInputBatchTarget(capacity);

    for (let cycle = 0; cycle < 10; cycle++) {
      for (let i = 0; i < 5; i++) {
        ring.pushMove(i * 10, i * 5, cycle * 100 + i);
      }
      const stats = ring.drainInto(target);
      expect(stats.drainedCount).toBe(5);
      expect(target.dx[0]).toBe(0);
      expect(target.dx[4]).toBe(40);
    }
  });

  it("preserves total movement delta when buffer reaches capacity", () => {
    const capacity = 4;
    const ring = createInputRingBuffer(capacity);
    const target = createRawInputBatchTarget(16);

    expect(ring.pushMove(10, 0, 1.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 2.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 3.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 4.0).accepted).toBe(true);

    const res5 = ring.pushMove(50, 0, 5.0);
    expect(res5.accepted).toBe(true);
    expect(res5.overflow).toBe(true);

    const res6 = ring.pushMove(25, 0, 6.0);
    expect(res6.accepted).toBe(true);
    expect(res6.overflow).toBe(true);

    const stats = ring.drainInto(target);
    expect(stats.drainedCount).toBe(4);
    expect(stats.overflowCount).toBe(2);
    expect(stats.lostTemporalPrecision).toBe(true);

    let totalDx = 0;
    for (let i = 0; i < target.count; i++) totalDx += target.dx[i] ?? 0;
    expect(totalDx).toBe(115);
  });

  it("shows saturation at 1000-mode capacity but preserves the same burst at 8000-mode capacity", () => {
    const low = createInputRingBuffer(2_048);
    const lowTarget = createRawInputBatchTarget(2_048);
    const high = createInputRingBuffer(16_384);
    const highTarget = createRawInputBatchTarget(16_384);

    for (let index = 0; index < 3_000; index++) {
      low.pushMove(1, -1, index / 8);
      high.pushMove(1, -1, index / 8);
    }

    const lowStats = low.drainInto(lowTarget);
    const highStats = high.drainInto(highTarget);

    expect(lowStats.overflowCount).toBeGreaterThan(0);
    expect(lowStats.lostTemporalPrecision).toBe(true);
    expect(highStats.overflowCount).toBe(0);
    expect(highStats.lostTemporalPrecision).toBe(false);
    expect(highStats.drainedCount).toBe(3_000);
  });

  it("rejects non-finite and out-of-Int32 movement instead of silently wrapping", () => {
    const ring = createInputRingBuffer(16);

    expect(() => ring.pushMove(Number.POSITIVE_INFINITY, 0, 1)).toThrow(
      RangeError,
    );
    expect(() => ring.pushMove(2_147_483_648, 0, 1)).toThrow(RangeError);
    expect(() => ring.pushMove(0, -2_147_483_649, 1)).toThrow(RangeError);
    expect(() => ring.pushMove(1, 1, -1)).toThrow(RangeError);
  });

  it("handles pushInvalidate correctly", () => {
    const ring = createInputRingBuffer(16);
    const target = createRawInputBatchTarget(16);

    ring.pushMove(5, 5, 1.0);
    ring.pushInvalidate(1, 2.0);

    const stats = ring.drainInto(target);
    expect(stats.drainedCount).toBe(2);
    expect(target.kinds[1]).toBe(EVENT_KIND_INVALIDATE);
    expect(target.buttons[1]).toBe(1);
  });

  it("resets high-water mark and buffer state cleanly", () => {
    const ring = createInputRingBuffer(16);
    ring.pushMove(10, 10, 1.0);
    ring.pushMove(10, 10, 2.0);
    expect(ring.getHighWaterMark()).toBe(2);

    ring.reset();
    expect(ring.getHighWaterMark()).toBe(0);

    const target = createRawInputBatchTarget(16);
    const stats = ring.drainInto(target);
    expect(stats.drainedCount).toBe(0);
  });
});
