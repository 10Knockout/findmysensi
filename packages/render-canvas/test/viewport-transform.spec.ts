import { createAngleUnits, degreesToAngleUnits } from "@findmysensi/aim-core";
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
      createAngleUnits(0),
      createAngleUnits(0),
    );
    expect(displayCenter.x).toBe(960);
    expect(displayCenter.y).toBe(540);

    const simCenter = transform.displayToSim(960, 540);
    expect(simCenter.yaw).toBe(0);
    expect(simCenter.pitch).toBe(0);
  });

  it("letterboxes and pillarboxes non-16:9 aspect ratios (16:10, 4:3, 5:4) to protect authoritative 16:9 geometry", () => {
    // 16:10 (1920 x 1200) -> Letterboxed with black bars top/bottom (1920 x 1080 content centered vertically at y=60)
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
      createAngleUnits(0),
      createAngleUnits(0),
    );
    expect(center1610.x).toBe(960);
    expect(center1610.y).toBe(600); // 60 + 540

    // 4:3 (1024 x 768) -> Pillarboxed with black bars left/right
    // For 1024 width, 16:9 height is 1024 * 9 / 16 = 576, centered vertically at (768 - 576)/2 = 96
    const t43 = createViewportTransform({
      canvasWidth: 1024,
      canvasHeight: 768,
      scaleMode: "fit",
    });
    expect(t43.displayRect.width).toBe(1024);
    expect(t43.displayRect.height).toBe(576);
    expect(t43.displayRect.y).toBe(96);
  });

  it("handles DPR scaling proportionally", () => {
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

    const angle = degreesToAngleUnits(10);
    const p1 = tDpr1.simToDisplay(angle, createAngleUnits(0));
    const p2 = tDpr2.simToDisplay(angle, createAngleUnits(0));

    // In DPR 2, physical pixel coordinate offset from center is exactly 2x
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

    const angleX = degreesToAngleUnits(15);
    const angleY = degreesToAngleUnits(-10);

    const screenPos = tStretch.simToDisplay(angleX, angleY);
    const backToSim = tStretch.displayToSim(screenPos.x, screenPos.y);

    // Invertibility test
    expect(backToSim.yaw).toBe(angleX);
    expect(backToSim.pitch).toBe(angleY);
  });
});
