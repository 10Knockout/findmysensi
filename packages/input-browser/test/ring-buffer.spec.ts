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

    // Event 0 (Move)
    expect(target.kinds[0]).toBe(EVENT_KIND_MOVE);
    expect(target.dx[0]).toBe(100);
    expect(target.dy[0]).toBe(-50);
    expect(target.timeIndices[0]).toBe(10.5);

    // Event 1 (Move)
    expect(target.kinds[1]).toBe(EVENT_KIND_MOVE);
    expect(target.dx[1]).toBe(20);
    expect(target.dy[1]).toBe(15);
    expect(target.timeIndices[1]).toBe(10.8);

    // Event 2 (Shot)
    expect(target.kinds[2]).toBe(EVENT_KIND_SHOT);
    expect(target.buttons[2]).toBe(0);
    expect(target.timeIndices[2]).toBe(11.0);

    // Subsequent drain is empty
    const secondStats = ring.drainInto(target);
    expect(secondStats.drainedCount).toBe(0);
  });

  it("handles circular wraparound across multiple push/drain cycles", () => {
    const capacity = 8;
    const ring = createInputRingBuffer(capacity);
    const target = createRawInputBatchTarget(capacity);

    // Fill partially and drain
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

  it("preserves total movement delta when buffer reaches capacity (recoverable overflow)", () => {
    const capacity = 4;
    const ring = createInputRingBuffer(capacity);
    const target = createRawInputBatchTarget(16);

    // Push 4 moves (fill buffer to capacity)
    expect(ring.pushMove(10, 0, 1.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 2.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 3.0).accepted).toBe(true);
    expect(ring.pushMove(10, 0, 4.0).accepted).toBe(true);

    // 5th and 6th moves arrive before drain (buffer overflow)
    // Must coalesce delta into the last move slot so total displacement (10+10+10+10+50+25 = 115) is preserved
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

    // Total displacement must equal exactly 115
    let totalDx = 0;
    for (let i = 0; i < target.count; i++) {
      totalDx += target.dx[i] ?? 0;
    }
    expect(totalDx).toBe(115);
  });

  it("handles pushInvalidate correctly", () => {
    const ring = createInputRingBuffer(16);
    const target = createRawInputBatchTarget(16);

    ring.pushMove(5, 5, 1.0);
    ring.pushInvalidate(1 /* focus_lost */, 2.0);

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
