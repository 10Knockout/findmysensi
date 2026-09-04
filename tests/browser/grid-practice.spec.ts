import {
  createAngleUnits,
  FULL_TURN_UNITS,
  RenderSnapshotView,
  shortestSignedAngleDelta,
  wrapYaw,
} from "@findmysensi/aim-core";
import { AimRenderer } from "@findmysensi/render-canvas";
import { createMultiModeAdapter } from "@findmysensi/trainer-runtime";
import {
  BROWSER_GAIN_FIXED_POINT_SCALE,
  resolveBrowserInputGain,
  type BrowserInputGain,
} from "@findmysensi/sensitivity";
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

function exactIntegerGain(angleUnitsPerInputUnit: number): BrowserInputGain {
  return Object.freeze({
    fixedPointAngleUnitsPerInputUnit:
      angleUnitsPerInputUnit * BROWSER_GAIN_FIXED_POINT_SCALE,
    fractionBits: 20,
    fixedPointScale: BROWSER_GAIN_FIXED_POINT_SCALE,
    degreesPerInputUnit: (angleUnitsPerInputUnit / FULL_TURN_UNITS) * 360,
    fmsSensitivity: "test-only",
  });
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

  it("persists the active adapter mode instead of hardcoding grid", () => {
    localPracticeHistory.clear();
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      undefined,
      { durationTicks: 1 },
      createMultiModeAdapter(),
    );

    controller.start([1, 2, 3, 4]);
    controller.onAnimationFrame(0);
    controller.onAnimationFrame(10);
    controller.onAnimationFrame(20);

    expect(localPracticeHistory.getAll("multi")[0]?.modeId).toBe("multi");
    expect(localPracticeHistory.getAll("grid")).toEqual([]);
  });

  it("surfaces real ring-buffer overflow into the saved result summary", () => {
    localPracticeHistory.clear();

    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      undefined,
      { durationTicks: 10, inputBufferCapacity: 2 },
    );

    controller.start([1, 2, 3, 4]);

    // Push more move events than the buffer can hold before any tick
    // drains it, forcing a genuine overflow rather than a simulated one.
    const buffer = controller.getRingBuffer();
    for (let i = 0; i < 5; i++) {
      buffer.pushMove(1, 1, i);
    }

    for (let frame = 1; frame <= 15; frame++) {
      controller.onAnimationFrame(frame * 10);
    }

    expect(controller.getState()).toBe("completed");

    const history = localPracticeHistory.getAll("grid");
    expect(history.length).toBe(1);
    expect(history[0]?.inputOverflowEvents).toBeGreaterThan(0);
    expect(history[0]?.inputHighWaterMark).toBeGreaterThan(0);
    expect(history[0]?.exactReplayPreserved).toBe(false);
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
        inputGain: exactIntegerGain(2_500),
        inputBufferCapacity: 2_048,
      },
    );

    controller.start([1, 2, 3, 4]);
    controller.recordBrowserInputEvent(100, 40);
    controller.getRingBuffer().pushMove(100, 40, 1);
    controller.onAnimationFrame(0);
    controller.onAnimationFrame(8);

    const snapshot = capture.latest();
    expect(snapshot).not.toBeNull();
    expect(snapshot?.playerYaw).toBe(250_000);
    expect(snapshot?.playerPitch).toBe(-100_000);
    const verification = controller.getSensitivityInputVerificationSnapshot();
    expect(verification.movementEventCount).toBe(1);
    expect(verification.actualEngineYawDegrees).toBeCloseTo(
      verification.expectedYawDegrees,
      12,
    );
    expect(verification.actualEnginePitchDegrees).toBeCloseTo(
      verification.expectedPitchDegrees,
      12,
    );
  });

  it("executes FMS 0.175 on the Aimlabs Default angular scale and resets residuals", () => {
    const controller = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      undefined,
      {
        durationTicks: 100,
        inputGain: resolveBrowserInputGain("0.175"),
      },
    );

    controller.start([1, 2, 3, 4]);
    controller.recordBrowserInputEvent(1_000, -500);
    controller.getRingBuffer().pushMove(1_000, -500, 1);
    controller.onAnimationFrame(0);
    controller.onAnimationFrame(8);

    const verification = controller.getSensitivityInputVerificationSnapshot();
    expect(verification.expectedYawDegrees).toBe(8.75);
    expect(verification.expectedPitchDegrees).toBe(4.375);
    expect(
      Math.abs(
        verification.actualEngineYawDegrees - verification.expectedYawDegrees,
      ),
    ).toBeLessThan(360 / FULL_TURN_UNITS);
    expect(
      Math.abs(
        verification.actualEnginePitchDegrees -
          verification.expectedPitchDegrees,
      ),
    ).toBeLessThan(360 / FULL_TURN_UNITS);

    controller.abort();
    controller.start([5, 6, 7, 8]);
    expect(controller.getSensitivityInputVerificationSnapshot()).toEqual({
      totalInputUnitsX: 0,
      totalInputUnitsY: 0,
      movementEventCount: 0,
      expectedYawDegrees: 0,
      expectedPitchDegrees: 0,
      actualEngineYawDegrees: 0,
      actualEnginePitchDegrees: 0,
      yawResidualFixedPointUnits: 0,
      pitchResidualFixedPointUnits: 0,
    });
    controller.abort();
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
        inputGain: exactIntegerGain(gain),
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

    expect(Math.abs(yawDelta % gain)).toBe(0);
    expect(Math.abs(targetPitch % gain)).toBe(0);

    controller
      .getRingBuffer()
      .pushMove(yawDelta / gain, -targetPitch / gain, 1);
    controller.getRingBuffer().pushShot(0, 2);
    controller.getRingBuffer().pushMove(-40, 0, 3);
    controller.onAnimationFrame(8);

    expect(scoreUpdates.at(-1)).toEqual({ hits: 1, misses: 0 });
    const after = capture.latest();
    expect(after?.playerYaw).toBe(wrapYaw(targetYaw - 100_000));
  });

  it("generates fresh valid cryptographic seeds when start() is called without arguments", () => {
    const controllerA = new PracticeRunController({
      onStateChange: () => {},
      onTickProgress: () => {},
      onScoreUpdate: () => {},
      onComplete: () => {},
    });
    const controllerB = new PracticeRunController({
      onStateChange: () => {},
      onTickProgress: () => {},
      onScoreUpdate: () => {},
      onComplete: () => {},
    });

    controllerA.start();
    controllerB.start();

    const seedA = controllerA.getActiveSeed();
    const seedB = controllerB.getActiveSeed();

    expect(seedA).not.toBeNull();
    expect(seedB).not.toBeNull();
    expect(seedA!.length).toBe(4);
    expect(seedB!.length).toBe(4);

    for (let i = 0; i < 4; i++) {
      expect(Number.isInteger(seedA![i])).toBe(true);
      expect(seedA![i]).toBeGreaterThanOrEqual(0);
      expect(seedA![i]).toBeLessThanOrEqual(0xffffffff);
    }

    // Successive fresh runs should receive different seeds
    expect(seedA).not.toEqual(seedB);

    controllerA.abort();
    controllerB.abort();
  });

  it("strictly preserves identical deterministic target sequences when explicit seeds are provided", () => {
    const captureA = createCaptureRenderer();
    const captureB = createCaptureRenderer();

    const controllerA = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      captureA.renderer,
    );
    const controllerB = new PracticeRunController(
      {
        onStateChange: () => {},
        onTickProgress: () => {},
        onScoreUpdate: () => {},
        onComplete: () => {},
      },
      captureB.renderer,
    );

    const explicitSeed: [number, number, number, number] = [
      0x11112222, 0x33334444, 0x55556666, 0x77778888,
    ];

    controllerA.start(explicitSeed);
    controllerB.start(explicitSeed);

    controllerA.onAnimationFrame(0);
    controllerB.onAnimationFrame(0);

    expect(controllerA.getActiveSeed()).toEqual(explicitSeed);
    expect(controllerB.getActiveSeed()).toEqual(explicitSeed);

    const snapA = captureA.latest()!;
    const snapB = captureB.latest()!;

    expect(snapA.targetCount).toBe(snapB.targetCount);
    for (let i = 0; i < snapA.targetCount; i++) {
      expect(snapA.targetX[i]).toBe(snapB.targetX[i]);
      expect(snapA.targetY[i]).toBe(snapB.targetY[i]);
      expect(snapA.targetRadius[i]).toBe(snapB.targetRadius[i]);
    }

    controllerA.abort();
    controllerB.abort();
  });
});
