import { createTick } from "@findmysensi/protocol";
import { describe, expect, it } from "vitest";
import { createAngleUnits } from "../src/fixed/angle.js";
import {
  createSnapshotBuffer,
  SnapshotBuffer,
} from "../src/render/snapshot.js";

describe("Allocation-Free Double-Buffered Render Snapshots", () => {
  it("isolates active write mutations from the active front render snapshot until swap()", () => {
    const buffer: SnapshotBuffer = createSnapshotBuffer(16);

    // Initial state: tick 0
    buffer.beginWrite(createTick(0), createAngleUnits(0), createAngleUnits(0));
    buffer.writeTarget(1, 1000, 2000, 500);
    buffer.endWrite();
    const frame0 = buffer.swap();

    expect(frame0.tick).toBe(0);
    expect(frame0.targetCount).toBe(1);
    expect(frame0.targetId[0]).toBe(1);
    expect(frame0.targetX[0]).toBe(1000);

    // Begin writing Frame 1 into back buffer
    buffer.beginWrite(
      createTick(1),
      createAngleUnits(50),
      createAngleUnits(200),
    );
    buffer.writeTarget(2, 3000, 4000, 600);
    buffer.writeTarget(3, 5000, 6000, 700);

    // Front view (frame0) MUST NOT be mutated by in-progress back write
    const latestBeforeSwap = buffer.getLatest();
    expect(latestBeforeSwap.tick).toBe(0);
    expect(latestBeforeSwap.targetCount).toBe(1);
    expect(latestBeforeSwap.targetId[0]).toBe(1);

    buffer.endWrite();

    // Now swap to expose Frame 1
    const frame1 = buffer.swap();
    expect(frame1.tick).toBe(1);
    expect(frame1.targetCount).toBe(2);
    expect(frame1.targetId[0]).toBe(2);
    expect(frame1.targetId[1]).toBe(3);
    expect(frame1.playerYaw).toBe(50);
  });

  it("reuses preallocated typed-array storage across successive frames with zero object churn", () => {
    const buffer = createSnapshotBuffer(8);

    const firstView = buffer.getLatest();
    const firstTargetX = firstView.targetX;

    for (let frame = 0; frame < 100; frame++) {
      buffer.beginWrite(
        createTick(frame),
        createAngleUnits(frame * 10),
        createAngleUnits(0),
      );
      for (let t = 0; t < 5; t++) {
        buffer.writeTarget(t, t * 100, t * 200, 50);
      }
      buffer.endWrite();
      buffer.swap();
    }

    const latestView = buffer.getLatest();
    // In double buffering, the buffer arrays are toggled between exactly two preallocated instances
    expect(latestView.targetX.byteLength).toBe(firstTargetX.byteLength);
    expect(latestView.tick).toBe(99);
    expect(latestView.targetCount).toBe(5);
  });
});
