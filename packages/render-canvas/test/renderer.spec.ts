import {
  createAngleUnits,
  createPitchUnits,
  createSnapshotBuffer,
  FULL_TURN_UNITS,
} from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it, vi } from "vitest";
import { createAimRenderer } from "../src/renderer.js";
import { createViewportTransform } from "../src/viewport-transform.js";

function createMockContext() {
  return {
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    rect: vi.fn(),
    clip: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    globalAlpha: 1,
  };
}

describe("Canvas2D Potato Aim Renderer", () => {
  it("renders targets and center crosshair via Canvas2D context without mutating state", () => {
    const renderer = createAimRenderer();
    const mockCtx = createMockContext();
    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn(() => mockCtx),
    };

    const viewport = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
    });

    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, viewport, {
      backgroundColor: "#0f1117",
      crosshair: { color: "#00ff88", dot: true },
      target: { bodyColor: "#7CFF6B", opacity: 0.8, borderWidth: 0 },
    });

    const buffer = createSnapshotBuffer(16);
    buffer.beginWrite(createTick(1), createAngleUnits(0), createPitchUnits(0));
    buffer.writeTarget(1, 0, 0, 50_000);
    buffer.writeTarget(2, 50_000, 30_000, 50_000);
    buffer.endWrite();
    const snapshot = buffer.swap();

    renderer.render(snapshot);

    expect(mockCtx.fillRect).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.globalAlpha).toBe(1);
    expect(snapshot.targetCount).toBe(2);
    expect(snapshot.tick).toBe(1);

    renderer.dispose();
  });

  it("projects a target correctly across the yaw wrap seam", () => {
    const renderer = createAimRenderer();
    const mockCtx = createMockContext();
    const mockCanvas = {
      width: 1920,
      height: 1080,
      getContext: vi.fn(() => mockCtx),
    };
    const viewport = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
      horizontalFovDegrees: 103,
    });
    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, viewport);

    const buffer = createSnapshotBuffer(8);
    buffer.beginWrite(
      createTick(1),
      createAngleUnits(FULL_TURN_UNITS - 10_000),
      createPitchUnits(0),
    );
    buffer.writeTarget(1, 5_000, 0, 50_000);
    buffer.endWrite();
    renderer.render(buffer.swap());

    const firstTargetArc = mockCtx.arc.mock.calls[0];
    expect(firstTargetArc).toBeDefined();
    const targetX = firstTargetArc?.[0] as number;
    expect(targetX).toBeGreaterThan(960);
    expect(targetX).toBeLessThan(980);
  });

  it("uses the viewport FOV to derive target pixel radius", () => {
    const renderRadius = (fov: number) => {
      const renderer = createAimRenderer();
      const mockCtx = createMockContext();
      const mockCanvas = {
        width: 1920,
        height: 1080,
        getContext: vi.fn(() => mockCtx),
      };
      renderer.initialize(
        mockCanvas as unknown as HTMLCanvasElement,
        createViewportTransform({
          canvasWidth: 1920,
          canvasHeight: 1080,
          horizontalFovDegrees: fov,
        }),
      );
      const buffer = createSnapshotBuffer(8);
      buffer.beginWrite(
        createTick(1),
        createAngleUnits(0),
        createPitchUnits(0),
      );
      buffer.writeTarget(1, 0, 0, 50_000);
      buffer.endWrite();
      renderer.render(buffer.swap());
      return mockCtx.arc.mock.calls[0]?.[2] as number;
    };

    expect(renderRadius(90)).toBeGreaterThan(renderRadius(103));
  });

  it("handles resize without re-initialization errors", () => {
    const renderer = createAimRenderer();
    const mockCanvas = {
      width: 1280,
      height: 720,
      getContext: vi.fn(() => createMockContext()),
    };

    const v1 = createViewportTransform({
      canvasWidth: 1280,
      canvasHeight: 720,
    });
    const v2 = createViewportTransform({
      canvasWidth: 1920,
      canvasHeight: 1080,
    });

    renderer.initialize(mockCanvas as unknown as HTMLCanvasElement, v1);
    expect(() => renderer.resize(v2)).not.toThrow();

    renderer.dispose();
  });
});
