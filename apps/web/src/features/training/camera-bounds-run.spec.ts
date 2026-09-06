import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_PITCH_UNITS,
  FULL_TURN_UNITS,
} from "@findmysensi/aim-core";
import { DEFAULT_BROWSER_INPUT_GAIN } from "@findmysensi/sensitivity";
import { createGridModeAdapter } from "@findmysensi/trainer-runtime";
import { PracticeRunController } from "./PracticeRunController.js";

function toDegrees(units: number): number {
  return (units / FULL_TURN_UNITS) * 360;
}

function makeController() {
  const controller = new PracticeRunController(
    {
      onStateChange: () => {},
      onTickProgress: () => {},
      onScoreUpdate: () => {},
      onComplete: () => {},
    },
    undefined,
    { durationTicks: 128 * 600, inputGain: DEFAULT_BROWSER_INPUT_GAIN },
    createGridModeAdapter(),
  );
  controller.start([1, 2, 3, 4]);
  return controller;
}

function drive(
  controller: PracticeRunController,
  dx: number,
  dy: number,
  frames: number,
  startMs = 0,
): number {
  const ring = controller.getRingBuffer();
  let now = startMs;
  for (let i = 0; i < frames; i++) {
    ring.pushMove(dx, dy, now);
    now += 16;
    controller.onAnimationFrame(now);
  }
  return now;
}

function pitchDeg(controller: PracticeRunController): number {
  return toDegrees(
    (controller as unknown as { playerPitch: number }).playerPitch,
  );
}

function yawDeg(controller: PracticeRunController): number {
  const raw = (controller as unknown as { playerYaw: number }).playerYaw;
  const signed = raw >= FULL_TURN_UNITS / 2 ? raw - FULL_TURN_UNITS : raw;
  return toDegrees(signed);
}

describe("free-look camera", () => {
  const maxPitch = toDegrees(DEFAULT_MAX_PITCH_UNITS);

  it("looks down to the physical camera pole instead of an early play-area wall", () => {
    const controller = makeController();
    drive(controller, 0, 8, 400);

    expect(pitchDeg(controller)).toBeCloseTo(-maxPitch, 3);
    expect(Math.abs(pitchDeg(controller))).toBeGreaterThan(89);
  });

  it("looks up to the physical camera pole", () => {
    const controller = makeController();
    drive(controller, 0, -8, 400);

    expect(pitchDeg(controller)).toBeCloseTo(maxPitch, 3);
  });

  it("allows full 360-degree yaw in both directions", () => {
    const controller = makeController();
    drive(controller, 180, 0, 400);

    // 72,000 counts at 0.05 degrees/count is ten complete turns.
    expect(yawDeg(controller)).toBeCloseTo(0, 3);
  });

  it("recovers on the first reverse movement at the floor", () => {
    const controller = makeController();
    const t = drive(controller, 0, 8, 400);
    expect(pitchDeg(controller)).toBeCloseTo(-maxPitch, 3);

    drive(controller, 0, -8, 1, t);
    expect(pitchDeg(controller)).toBeGreaterThan(-maxPitch);
  });

  it("recovers from the floor when a fast reversal lands in one simulation tick", () => {
    const controller = makeController();
    const t = drive(controller, 0, 8, 400);
    expect(pitchDeg(controller)).toBeCloseTo(-maxPitch, 3);

    const ring = controller.getRingBuffer();
    ring.pushMove(0, 400, t);
    ring.pushMove(0, -8, t + 0.1);
    controller.onAnimationFrame(t + 16);

    expect(pitchDeg(controller)).toBeGreaterThan(-maxPitch);
  });

  it("does not clamp normal in-area aiming", () => {
    const controller = makeController();
    drive(controller, 4, 4, 20); // 80 counts = 4 degrees each axis

    expect(yawDeg(controller)).toBeCloseTo(4, 2);
    expect(pitchDeg(controller)).toBeCloseTo(-4, 2);
  });
});
