import { describe, expect, it } from "vitest";
import { FULL_TURN_UNITS, resolveCameraBounds } from "@findmysensi/aim-core";
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

describe("camera stays inside the play area", () => {
  const bounds = resolveCameraBounds(1_200_000, 720_000);
  const maxPitch = toDegrees(bounds.maxPitchUnits);
  const maxYaw = toDegrees(bounds.maxYawUnits);

  it("stops a long downward drag at the play-area floor, not at 89.9 degrees", () => {
    const controller = makeController();
    drive(controller, 0, 8, 400);

    expect(pitchDeg(controller)).toBeCloseTo(-maxPitch, 3);
    expect(Math.abs(pitchDeg(controller))).toBeLessThan(89);
  });

  it("stops a long upward drag at the play-area ceiling", () => {
    const controller = makeController();
    drive(controller, 0, -8, 400);

    expect(pitchDeg(controller)).toBeCloseTo(maxPitch, 3);
  });

  it("bounds yaw in both directions instead of wrapping a full turn", () => {
    const right = makeController();
    drive(right, 8, 0, 800);
    expect(yawDeg(right)).toBeCloseTo(maxYaw, 3);

    const left = makeController();
    drive(left, -8, 0, 800);
    expect(yawDeg(left)).toBeCloseTo(-maxYaw, 3);
  });

  it("keeps the play area reachable: the grid corner stays inside the bound", () => {
    // Gridshot's furthest slot sits at +/-(spawn area / 2).
    expect(maxPitch).toBeGreaterThan(toDegrees(720_000 / 2));
    expect(maxYaw).toBeGreaterThan(toDegrees(1_200_000 / 2));
  });

  it("recovers immediately when the player moves back off the floor", () => {
    const controller = makeController();
    const t = drive(controller, 0, 8, 400);
    expect(pitchDeg(controller)).toBeCloseTo(-maxPitch, 3);

    drive(controller, 0, -8, 40, t);
    expect(pitchDeg(controller)).toBeGreaterThan(-maxPitch + 10);
  });

  it("does not clamp normal in-area aiming", () => {
    const controller = makeController();
    drive(controller, 4, 4, 20); // 80 counts = 4 degrees each axis

    expect(yawDeg(controller)).toBeCloseTo(4, 2);
    expect(pitchDeg(controller)).toBeCloseTo(-4, 2);
  });
});
