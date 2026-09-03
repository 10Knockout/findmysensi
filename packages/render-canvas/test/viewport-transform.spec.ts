import {
  createAngleDeltaUnits,
  createPitchUnits,
  degreesToAngleDeltaUnits,
} from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  createViewportTransform,
  ViewportTransform,
} from "../src/viewport-transform.js";

describe("Canonical Ranked Angular Viewport Transform", () => {
  it("maps centered (0,0) simulation angles to exact center of 16:9 viewport", () => {
    const transform: ViewportTransform = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      scaleMode: "fit",
    });

    expect(transform.displayRect).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1080,
    });

    const displayCenter = transform.simToDisplay(
      createAngleDeltaUnits(0),
      createPitchUnits(0),
    );
    expect(displayCenter.x).toBe(960);
    expect(displayCenter.y).toBe(540);

    const simCenter = transform.displayToSim(960, 540);
    expect(simCenter.yaw).toBe(0);
    expect(simCenter.pitch).toBe(0);
  });

  it("letterboxes and pillarboxes non-16:9 aspect ratios to protect authoritative geometry", () => {
    const t1610 = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1200,
      scaleMode: "fit",
    });
    expect(t1610.displayRect.width).toBe(1920);
    expect(t1610.displayRect.height).toBe(1080);
    expect(t1610.displayRect.x).toBe(0);
    expect(t1610.displayRect.y).toBe(60);

    const center1610 = t1610.simToDisplay(
      createAngleDeltaUnits(0),
      createPitchUnits(0),
    );
    expect(center1610.x).toBe(960);
    expect(center1610.y).toBe(600);

    const t43 = createViewportTransform({
      canvasWidth: 1024,
      canvasHeight: 768,
      scaleMode: "fit",
    });
    expect(t43.displayRect.width).toBe(1024);
    expect(t43.displayRect.height).toBe(576);
    expect(t43.displayRect.y).toBe(96);
  });

  it("handles DPR scaling proportionally without changing simulation angles", () => {
    const tDpr1 = createViewportTransform({
      canvasWidth: 1280,
      canvasHeight: 720,
      dpr: 1,
    });
    const tDpr2 = createViewportTransform({
      canvasWidth: 2560,
      canvasHeight: 1440,
      dpr: 2,
    });

    const angle = degreesToAngleDeltaUnits(10);
    const p1 = tDpr1.simToDisplay(angle, createPitchUnits(0));
    const p2 = tDpr2.simToDisplay(angle, createPitchUnits(0));

    const offset1 = p1.x - tDpr1.displayRect.x - tDpr1.displayRect.width / 2;
    const offset2 = p2.x - tDpr2.displayRect.x - tDpr2.displayRect.width / 2;
    expect(Math.round(offset2 / offset1)).toBe(2);
  });

  it("supports stretch scale mode while preserving simulation invertibility", () => {
    const tStretch = createViewportTransform({
      canvasWidth: 1024,
      canvasHeight: 768,
      scaleMode: "stretch",
    });

    expect(tStretch.displayRect).toEqual({
      x: 0,
      y: 0,
      width: 1024,
      height: 768,
    });

    const angleX = degreesToAngleDeltaUnits(15);
    const angleY = createPitchUnits(degreesToAngleDeltaUnits(-10));

    const screenPos = tStretch.simToDisplay(angleX, angleY);
    const backToSim = tStretch.displayToSim(screenPos.x, screenPos.y);

    expect(backToSim.yaw).toBe(angleX);
    expect(backToSim.pitch).toBe(angleY);
  });

  it("derives target pixel radius from the active FOV", () => {
    const fov103 = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      horizontalFovDegrees: 103,
    });
    const fov90 = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      horizontalFovDegrees: 90,
    });

    expect(fov90.angleRadiusToPixels(50_000)).toBeGreaterThan(
      fov103.angleRadiusToPixels(50_000),
    );
  });

  it("fills the entire canvas without letterboxing in fill mode", () => {
    const tFill = createViewportTransform({
      canvasWidth: 2560,
      canvasHeight: 1440,
      scaleMode: "fill",
    });

    expect(tFill.displayRect).toEqual({
      x: 0,
      y: 0,
      width: 2560,
      height: 1440,
    });
  });
});
