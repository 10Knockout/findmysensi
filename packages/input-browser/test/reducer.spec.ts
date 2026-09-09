import { createTick, Tick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { reduceRawEvents, TickBucketer } from "../src/reducer.js";
import {
  createRawInputBatchTarget,
  EVENT_KIND_FIRE_STATE,
  EVENT_KIND_INVALIDATE,
  EVENT_KIND_MOVE,
  EVENT_KIND_SHOT,
} from "../src/ring-buffer.js";

class SimpleTickBucketer implements TickBucketer {
  private readonly tickIntervalMs: number;

  constructor(tickRateHz: number = 128) {
    this.tickIntervalMs = 1000 / tickRateRate(tickRateHz);
  }

  public timeToTick(timeMs: number): Tick {
    return createTick(Math.floor(timeMs / this.tickIntervalMs));
  }
}

function tickRateRate(hz: number): number {
  return hz > 0 ? hz : 128;
}

describe("Semantic-Boundary-Preserving Input Reducer", () => {
  const clock = new SimpleTickBucketer(128); // ~7.8125ms per tick

  it("reduces consecutive moves within the same tick while preserving shot boundaries", () => {
    // 5 raw events within tick 0 (0ms - 5ms):
    // Move 1: dx=10, dy=5 at 1ms
    // Move 2: dx=20, dy=15 at 2ms
    // Shot: button=0 at 3ms
    // Move 3: dx=-5, dy=2 at 4ms
    // Move 4: dx=-15, dy=-2 at 5ms
    const batch = createRawInputBatchTarget(16);
    batch.count = 5;

    batch.kinds[0] = EVENT_KIND_MOVE;
    batch.dx[0] = 10;
    batch.dy[0] = 5;
    batch.timeIndices[0] = 1.0;

    batch.kinds[1] = EVENT_KIND_MOVE;
    batch.dx[1] = 20;
    batch.dy[1] = 15;
    batch.timeIndices[1] = 2.0;

    batch.kinds[2] = EVENT_KIND_SHOT;
    batch.timeIndices[2] = 3.0;

    batch.kinds[3] = EVENT_KIND_MOVE;
    batch.dx[3] = -5;
    batch.dy[3] = 2;
    batch.timeIndices[3] = 4.0;

    batch.kinds[4] = EVENT_KIND_MOVE;
    batch.dx[4] = -15;
    batch.dy[4] = -2;
    batch.timeIndices[4] = 5.0;

    const segments = reduceRawEvents(batch, clock);

    expect(segments.length).toBe(1);
    const seg = segments[0]!;
    expect(seg.tick).toBe(0);
    expect(seg.events.length).toBe(4);

    // Event 0: Aggregated pre-shot Move (+30, +20)
    expect(seg.events[0]).toEqual({
      kind: "move",
      tick: 0,
      order: 0,
      dx: 30,
      dy: 20,
    });

    // Event 1: Shot boundary at exact causal instant
    expect(seg.events[1]).toEqual({
      kind: "shot",
      tick: 0,
      order: 1,
      button: 0,
    });

    // Event 2: First post-shot direction segment
    expect(seg.events[2]).toEqual({
      kind: "move",
      tick: 0,
      order: 2,
      dx: -5,
      dy: 2,
    });

    // Event 3: Y-axis reversal remains a separate causal segment
    expect(seg.events[3]).toEqual({
      kind: "move",
      tick: 0,
      order: 3,
      dx: -15,
      dy: -2,
    });
  });

  it("splits events across multiple ticks when time exceeds tick intervals", () => {
    // Tick 0 (0-7.8ms): Move(10, 0) at 2.0ms
    // Tick 1 (7.8-15.6ms): Move(20, 0) at 10.0ms
    // Tick 2 (15.6-23.4ms): Shot at 18.0ms
    const batch = createRawInputBatchTarget(16);
    batch.count = 3;

    batch.kinds[0] = EVENT_KIND_MOVE;
    batch.dx[0] = 10;
    batch.timeIndices[0] = 2.0;

    batch.kinds[1] = EVENT_KIND_MOVE;
    batch.dx[1] = 20;
    batch.timeIndices[1] = 10.0;

    batch.kinds[2] = EVENT_KIND_SHOT;
    batch.timeIndices[2] = 18.0;

    const segments = reduceRawEvents(batch, clock);

    expect(segments.length).toBe(3);
    expect(segments[0]?.tick).toBe(0);
    expect(segments[0]?.events[0]?.kind).toBe("move");
    expect(segments[0]?.events[0]?.order).toBe(0);

    expect(segments[1]?.tick).toBe(1);
    expect(segments[1]?.events[0]?.kind).toBe("move");
    expect(segments[1]?.events[0]?.order).toBe(0);

    expect(segments[2]?.tick).toBe(2);
    expect(segments[2]?.events[0]?.kind).toBe("shot");
    expect(segments[2]?.events[0]?.order).toBe(0);
  });

  it("handles invalidate events as strict hard boundaries", () => {
    const batch = createRawInputBatchTarget(16);
    batch.count = 3;

    batch.kinds[0] = EVENT_KIND_MOVE;
    batch.dx[0] = 50;
    batch.timeIndices[0] = 1.0;

    batch.kinds[1] = EVENT_KIND_INVALIDATE;
    batch.buttons[1] = 1; // focus_lost
    batch.timeIndices[1] = 2.0;

    batch.kinds[2] = EVENT_KIND_MOVE;
    batch.dx[2] = 100;
    batch.timeIndices[2] = 3.0;

    const segments = reduceRawEvents(batch, clock);

    expect(segments.length).toBe(1);
    const events = segments[0]!.events;
    expect(events.length).toBe(3);
    expect(events[0]?.kind).toBe("move");
    expect(events[1]?.kind).toBe("invalidate");
    expect(events[2]?.kind).toBe("move");
  });

  it("preserves a direction reversal inside one tick", () => {
    const batch = createRawInputBatchTarget(16);
    batch.count = 4;

    batch.kinds[0] = EVENT_KIND_MOVE;
    batch.dy[0] = 200;
    batch.timeIndices[0] = 1.0;

    batch.kinds[1] = EVENT_KIND_MOVE;
    batch.dy[1] = 200;
    batch.timeIndices[1] = 2.0;

    batch.kinds[2] = EVENT_KIND_MOVE;
    batch.dy[2] = -20;
    batch.timeIndices[2] = 3.0;

    batch.kinds[3] = EVENT_KIND_MOVE;
    batch.dy[3] = -30;
    batch.timeIndices[3] = 4.0;

    const segments = reduceRawEvents(batch, clock);

    expect(segments).toHaveLength(1);
    expect(segments[0]?.events).toEqual([
      { kind: "move", tick: 0, order: 0, dx: 0, dy: 400 },
      { kind: "move", tick: 0, order: 1, dx: 0, dy: -50 },
    ]);
  });

  it("preserves every fire-state transition with tick and causal order", () => {
    const batch = createRawInputBatchTarget(16);
    batch.count = 3;

    batch.kinds[0] = EVENT_KIND_FIRE_STATE;
    batch.buttons[0] = 1;
    batch.timeIndices[0] = 1;

    batch.kinds[1] = EVENT_KIND_FIRE_STATE;
    batch.buttons[1] = 0;
    batch.timeIndices[1] = 2;

    batch.kinds[2] = EVENT_KIND_FIRE_STATE;
    batch.buttons[2] = 1;
    batch.timeIndices[2] = 10;

    expect(reduceRawEvents(batch, clock)).toEqual([
      {
        tick: 0,
        events: [
          { kind: "fire-state", tick: 0, order: 0, held: true },
          { kind: "fire-state", tick: 0, order: 1, held: false },
        ],
      },
      {
        tick: 1,
        events: [{ kind: "fire-state", tick: 1, order: 0, held: true }],
      },
    ]);
  });

  it("preserves total angular delta across multiple consecutive moves", () => {
    const batch = createRawInputBatchTarget(100);
    batch.count = 50;

    let expectedDx = 0;
    let expectedDy = 0;

    for (let i = 0; i < 50; i++) {
      batch.kinds[i] = EVENT_KIND_MOVE;
      const dx = i * 3 - 20;
      const dy = i * 2 - 15;
      batch.dx[i] = dx;
      batch.dy[i] = dy;
      batch.timeIndices[i] = 1.0 + i * 0.1; // All inside tick 0
      expectedDx += dx;
      expectedDy += dy;
    }

    const segments = reduceRawEvents(batch, clock);
    expect(segments.length).toBe(1);
    const moves = segments[0]?.events ?? [];
    expect(moves.length).toBeGreaterThan(0);
    expect(
      moves.reduce(
        (total, event) => total + (event.kind === "move" ? event.dx : 0),
        0,
      ),
    ).toBe(expectedDx);
    expect(
      moves.reduce(
        (total, event) => total + (event.kind === "move" ? event.dy : 0),
        0,
      ),
    ).toBe(expectedDy);
  });
});
