import { describe, expect, it, vi } from "vitest";
import { localPracticeHistory } from "../../apps/web/src/features/training/local-history.js";
import {
  PracticeRunController,
  PracticeRunState,
} from "../../apps/web/src/features/training/PracticeRunController.js";

describe("Grid Practice Run Flow & Lifecycle", () => {
  it("executes a full practice run, tracks hits/misses, and persists summary to local history", () => {
    localPracticeHistory.clear();

    const stateChanges: PracticeRunState[] = [];
    const scoreUpdates: number[] = [];
    const onComplete = vi.fn();

    const controller = new PracticeRunController(
      {
        onStateChange: (st) => stateChanges.push(st),
        onTickProgress: () => {},
        onScoreUpdate: (score) => scoreUpdates.push(score),
        onComplete,
      },
      undefined,
      10, // Short 10-tick session for unit test
    );

    expect(controller.getState()).toBe("ready");

    // Start run
    controller.start([10, 20, 30, 40]);
    expect(controller.getState()).toBe("playing");

    // Simulate mouse movements and shots
    controller.handlePlayerShot(1);
    controller.handlePlayerShot(2);

    // Step frames to complete 10 ticks
    for (let frame = 1; frame <= 15; frame++) {
      controller.onAnimationFrame(frame * 10);
    }

    expect(controller.getState()).toBe("completed");
    expect(onComplete).toHaveBeenCalled();

    // Verify summary saved in local history
    const history = localPracticeHistory.getAll("grid");
    expect(history.length).toBe(1);
    expect(history[0]?.modeId).toBe("grid");
    expect(history[0]?.shots).toBe(2);
  });

  it("handles pause and resume without state corruption", () => {
    const states: PracticeRunState[] = [];
    const controller = new PracticeRunController({
      onStateChange: (st) => states.push(st),
      onTickProgress: () => {},
      onScoreUpdate: () => {},
      onComplete: () => {},
    });

    controller.start();
    expect(controller.getState()).toBe("playing");

    controller.pause();
    expect(controller.getState()).toBe("paused");

    controller.resume();
    expect(controller.getState()).toBe("playing");

    controller.abort();
    expect(controller.getState()).toBe("aborted");
  });
});
