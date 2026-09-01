import {
  createAngleUnits,
  RenderSnapshotView,
  shortestSignedAngleDelta,
  wrapYaw,
} from "@findmysensi/aim-core";
import { AimRenderer } from "@findmysensi/render-canvas";
import { describe, expect, it, vi } from "vitest";
import { localPracticeHistory } from "../../apps/web/src/features/training/local-history.js";
import {
  PracticeRunController,
  PracticeRunState,
} from "../../apps/web/src/features/training/PracticeRunController.js";

function createCaptureRenderer() {
  let latest: RenderSnapshotView | null = null;
  const renderer: AimRenderer = {
    initialize: () => {},
    render: (snapshot) => {
      latest = snapshot;
    },
    resize: () => {},
    dispose: () => {},
  };
  return {
    renderer,
    latest: () => latest,
  };
}

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
      10,
    );

    expect(controller.getState()).toBe("ready");

    controller.start([10, 20, 30, 40]);
    expect(controller.getState()).toBe("playing");

    controller.handlePlayerShot(1);
    controller.handlePlayerShot(2);

    for (let frame = 1; frame <= 15; frame++) {
      controller.onAnimationFrame(frame * 10);
    }

    expect(controller.getState()).toBe("completed");
    expect(onComplete).toHaveBeenCalled();

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

  it("maps browser movement into fixed angular yaw and inverted pitch", () => {
    const capture = createCaptureRenderer();
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      capture.renderer,
      {
        durationTicks: 100,
        inputGainAngleUnitsPerUnit: 2_500,
        inputBufferCapacity: 2_048,
      },
    );

    controller.start([1, 2, 3, 4]);
    controller.getRingBuffer().pushMove(100, 40, 1);
    controller.onAnimationFrame(0);
    controller.onAnimationFrame(8);

    const snapshot = capture.latest();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.playerYaw).toBe(250_000);
    expect(snapshot?.playerPitch).toBe(-100_000);
  });

  it("preserves movement-before-shot and movement-after-shot causal ordering", () => {
    const capture = createCaptureRenderer();
    const scoreUpdates: Array<{ hits: number; misses: number }> = [];
    const gain = 2_500;
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: (_score, hits, misses) =>
          scoreUpdates.push({ hits, misses }),
        onComplete: () => {},
      },
      capture.renderer,
      {
        durationTicks: 100,
        inputGainAngleUnitsPerUnit: gain,
        inputBufferCapacity: 2_048,
      },
    );

    controller.start([0x12345678, 0x9abcdef0, 0x0fedcba9, 0x87654321]);
    controller.onAnimationFrame(0);

    const initial = capture.latest();
    expect(initial).not.toBeNull();
    const targetYaw = createAngleUnits(initial!.targetX[0]!);
    const targetPitch = initial!.targetY[0]!;
    const yawDelta = shortestSignedAngleDelta(createAngleUnits(0), targetYaw);

    expect(yawDelta % gain).toBe(0);
    expect(targetPitch % gain).toBe(0);

    controller.getRingBuffer().pushMove(yawDelta / gain, -targetPitch / gain, 1);
    controller.getRingBuffer().pushShot(0, 2);
    controller.getRingBuffer().pushMove(-40, 0, 3);
    controller.onAnimationFrame(8);

    expect(scoreUpdates.at(-1)).toEqual({ hits: 1, misses: 0 });
    const after = capture.latest();
    expect(after?.playerYaw).toBe(wrapYaw(targetYaw - 100_000));
  });
});
