import { describe, it, expect } from "vitest";
import { InputSequencer } from "../src/input/sequencer.js";

describe("Input Sequencer", () => {
  it("should sequence move and shot events correctly within a tick", () => {
    const sequencer = new InputSequencer();
    sequencer.beginTick(1);
    sequencer.pushMove(5, 5); // dx=50000, dy=50000 at x10000 scale
    sequencer.pushButton(true);
    sequencer.pushMove(2, 0);

    const events = sequencer.drain();
    expect(events.length).toBe(3);
    
    expect(events[0]?.kind).toBe("move");
    expect(events[0]?.order).toBe(0);
    
    expect(events[1]?.kind).toBe("shot");
    expect(events[1]?.order).toBe(1);
    
    expect(events[2]?.kind).toBe("move");
    expect(events[2]?.order).toBe(2);
  });

  it("should discard empty moves and duplicate downs", () => {
    const sequencer = new InputSequencer();
    sequencer.beginTick(1);
    sequencer.pushMove(0, 0); // discarded
    sequencer.pushButton(true); // shot
    sequencer.pushButton(true); // held down, discarded

    const events = sequencer.drain();
    expect(events.length).toBe(1);
    expect(events[0]?.kind).toBe("shot");
  });

  it("should trigger overflow on >256 events per tick", () => {
    const sequencer = new InputSequencer();
    sequencer.beginTick(1);
    for (let i = 0; i < 300; i++) {
      sequencer.pushMove(1, 0);
    }

    const events = sequencer.drain();
    // 256 moves + 1 invalidate = 257
    expect(events.length).toBe(257);
    expect(events[256]?.kind).toBe("invalidate");
    if (events[256]?.kind === "invalidate") {
      expect(events[256].reason).toBe("buffer_overflow");
    }
  });

  it("should invalidate on desync", () => {
    const sequencer = new InputSequencer();
    sequencer.beginTick(5);
    sequencer.beginTick(4);

    const events = sequencer.drain();
    expect(events.length).toBe(1);
    expect(events[0]?.kind).toBe("invalidate");
    if (events[0]?.kind === "invalidate") {
      expect(events[0].reason).toBe("client_desync");
    }
  });
});
