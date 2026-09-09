import { createSwitchTrackModeAdapter } from "@findmysensi/trainer-runtime";
import { describe, expect, it, vi } from "vitest";
import { PracticeRunController } from "./PracticeRunController.js";

describe("PracticeRunController fire-state propagation", () => {
  it("holds fire across ticks and forwards a later release", () => {
    const adapter = createSwitchTrackModeAdapter();
    const onSimulationTick = vi.spyOn(adapter, "onSimulationTick");
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      undefined,
      { durationTicks: 128 },
      adapter,
    );

    controller.start([1, 2, 3, 4]);
    controller.getRingBuffer().pushFireState(true, 0);
    controller.onAnimationFrame(0);
    controller.onAnimationFrame(16);

    const heldCalls = onSimulationTick.mock.calls;
    expect(heldCalls.length).toBeGreaterThan(0);
    expect(heldCalls.every((call) => call[3] === true)).toBe(true);

    controller.getRingBuffer().pushFireState(false, 20);
    controller.onAnimationFrame(32);

    expect(onSimulationTick.mock.calls.at(-1)?.[3]).toBe(false);
  });
});
