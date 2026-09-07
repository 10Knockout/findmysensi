import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_PITCH_UNITS,
  FULL_TURN_UNITS,
} from "@findmysensi/aim-core";
import { DEFAULT_BROWSER_INPUT_GAIN } from "@findmysensi/sensitivity";
import { createGridModeAdapter } from "@findmysensi/trainer-runtime";
import type { AimRenderer } from "@findmysensi/render-canvas";
import { PracticeRunController } from "./PracticeRunController.js";

function toDegrees(units: number): number {
  return (units / FULL_TURN_UNITS) * 360;
}

function makeController(renderer?: AimRenderer) {
  const controller = new PracticeRunController(
    {
      onStateChange: () => {},
      onTickProgress: () => {},
      onScoreUpdate: () => {},
      onComplete: () => {},
    },
    renderer,
    { durationTicks: 128 * 600, inputGain: DEFAULT_BROWSER_INPUT_GAIN },
    createGridModeAdapter(),
  );
  controller.start([1, 2, 3, 4]);
  return controller;
}

describe("display camera (recordDisplayMovement)", () => {
  it("accounts for DOM, buffer, display, and simulation movement independently", () => {
    const controller = makeController();
    const ring = controller.getRingBuffer();

    controller.recordDomMovement(240, -20);
    ring.pushMove(240, -20, 0);
    controller.recordBufferedMovement(240, -20);
    controller.recordDisplayMovement(240, -20);

    let snapshot = controller.getSensitivityInputVerificationSnapshot();
    expect(snapshot.domInputUnitsX).toBe(240);
    expect(snapshot.bufferedInputUnitsX).toBe(240);
    expect(snapshot.displayInputUnitsX).toBe(240);
    expect(snapshot.simulationInputUnitsX).toBe(0);

    controller.onAnimationFrame(16);
    controller.onAnimationFrame(32);
    snapshot = controller.getSensitivityInputVerificationSnapshot();
    expect(snapshot.simulationInputUnitsX).toBe(240);
    expect(snapshot.simulationInputUnitsY).toBe(-20);
    expect(snapshot.actualEngineYawDegrees).toBeCloseTo(
      snapshot.expectedYawDegrees,
      4,
    );
    expect(snapshot.viewYawDegrees).toBeCloseTo(snapshot.expectedYawDegrees, 4);
  });

  it("moves the rendered camera immediately, with no tick boundary to wait for", () => {
    const renderedYaws: number[] = [];
    const controller = makeController({
      initialize: () => {},
      render: (snapshot) => renderedYaws.push(toDegrees(snapshot.playerYaw)),
      resize: () => {},
      dispose: () => {},
    });

    // No ring-buffer push, no onAnimationFrame/tick at all -- a render call
    // right now must still reflect this movement, unlike the tick-quantized
    // playerYaw, which needs a completed simulation tick to change.
    controller.recordDisplayMovement(100, 0);
    controller.onAnimationFrame(0);

    expect(renderedYaws.at(-1)).not.toBe(0);
    const snapshot = controller.getSensitivityInputVerificationSnapshot();
    expect(snapshot.actualEngineYawDegrees).toBe(0);
  });

  it("does not affect hit detection: playerYaw/playerPitch stay tick-quantized", () => {
    const controller = makeController();
    // Fires at native mouse rate, far faster than the 128Hz tick -- this is
    // the whole point, and must never leak into the deterministic path.
    for (let i = 0; i < 50; i++) controller.recordDisplayMovement(37, 11);

    const snapshot = controller.getSensitivityInputVerificationSnapshot();
    expect(snapshot.actualEngineYawDegrees).toBe(0);
    expect(snapshot.actualEnginePitchDegrees).toBe(0);
    expect(snapshot.movementEventCount).toBe(0);
  });

  it("wraps yaw at a full turn instead of growing without bound", () => {
    const countsPerTurn = 360 / DEFAULT_BROWSER_INPUT_GAIN.degreesPerInputUnit;
    const rendered: number[] = [];
    const controller = makeController({
      initialize: () => {},
      render: (s) => rendered.push(toDegrees(s.playerYaw)),
      resize: () => {},
      dispose: () => {},
    });

    controller.recordDisplayMovement(countsPerTurn * 2.5, 0);
    controller.onAnimationFrame(0);

    expect(rendered.at(-1)).toBeCloseTo(180, 1);
  });

  it("clamps pitch at the physical camera pole, same limit as the sim camera", () => {
    const rendered: number[] = [];
    const controller = makeController({
      initialize: () => {},
      render: (s) => rendered.push(toDegrees(s.playerPitch)),
      resize: () => {},
      dispose: () => {},
    });
    const hugeDownwardDrag = 100_000;
    controller.recordDisplayMovement(0, hugeDownwardDrag);
    controller.onAnimationFrame(0);

    expect(rendered.at(-1)).toBeCloseTo(toDegrees(-DEFAULT_MAX_PITCH_UNITS), 3);
  });
});
