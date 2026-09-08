import { createGridModeAdapter } from "@findmysensi/trainer-runtime";
import { describe, expect, it, vi } from "vitest";
import { localPracticeHistory } from "../features/training/local-history.js";
import {
  PracticeRunController,
  type PracticeRunState,
} from "../features/training/PracticeRunController.js";
import { createFixedTickRunner } from "./fixed-tick-runner.js";

describe("run completion", () => {
  it("stops the catch-up loop when onTick stops the runner", () => {
    const ticks: number[] = [];
    const runner = createFixedTickRunner({
      tickRateHz: 128,
      maxCatchUpTicksPerFrame: 8,
      onTick: (tick) => {
        ticks.push(tick);
        if (tick >= 2) runner.stop("completed");
      },
      onRender: () => {},
    });

    runner.start();
    runner.onAnimationFrame(0);
    // A frame long enough to owe five ticks. The run ends on the third, so the
    // two behind it must never be simulated.
    runner.onAnimationFrame(40);

    expect(ticks).toEqual([0, 1, 2]);
  });

  it("reports completion exactly once when a frame owes several ticks", () => {
    const states: PracticeRunState[] = [];
    let completions = 0;

    const controller = new PracticeRunController(
      {
        onStateChange: (state) => states.push(state),
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {
          completions += 1;
        },
      },
      undefined,
      { durationTicks: 4 },
      createGridModeAdapter(),
    );

    controller.start();
    controller.onAnimationFrame(0);
    // 60Hz frames against a 128Hz tick owe ~2.1 ticks each, so the duration
    // boundary is crossed mid-catch-up on ordinary hardware.
    for (let frame = 1; frame <= 6; frame++) {
      controller.onAnimationFrame(frame * 16.7);
    }

    expect(states.filter((state) => state === "completed")).toHaveLength(1);
    expect(completions).toBe(1);
  });

  it("still reports completion when writing local history fails", () => {
    // Persisting a run must never be able to strand the player on a live
    // canvas with no way forward: this throw stands in for a full quota.
    const save = vi
      .spyOn(localPracticeHistory, "save")
      .mockImplementation(() => {
        throw new Error("storage unavailable");
      });
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let completions = 0;
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {
          completions += 1;
        },
      },
      undefined,
      { durationTicks: 4 },
      createGridModeAdapter(),
    );

    controller.start();
    controller.onAnimationFrame(0);
    for (let frame = 1; frame <= 6; frame++) {
      controller.onAnimationFrame(frame * 16.7);
    }

    expect(completions).toBe(1);
    expect(controller.getState()).toBe("completed");
    expect(save).toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();

    save.mockRestore();
    consoleError.mockRestore();
  });
});
