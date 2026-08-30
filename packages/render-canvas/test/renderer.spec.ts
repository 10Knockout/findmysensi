import { createAngleUnits, createSnapshotBuffer } from "@findmysensi/aim-core";
import { createTick } from "@findmysensi/protocol";
import { describe, expect, it, vi } from "vitest";
import { createAimRenderer } from "../src/renderer.js";
import { createViewportTransform } from "../src/viewport-transform.js";

describe("Canvas2D Potato Aim Renderer", () => {
  it("renders targets and center crosshair via Canvas2D context without mutating state", () => {
    const renderer = createAimRenderer();

    const mockCtx = {
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      stroke: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      fillStyle: "",
      strokeStyle: "",
      lineWidth: 1,
    };

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
    });

    // Create a snapshot with 2 targets
    const buffer = createSnapshotBuffer(16);
    buffer.beginWrite(createTick(1), createAngleUnits(0), createAngleUnits(0));
    buffer.writeTarget(1, 0, 0, 20000); // Center target
    buffer.writeTarget(2, 50000, 30000, 20000); // Offset target
    buffer.endWrite();
    const snapshot = buffer.swap();

    renderer.render(snapshot);

    // Assert Canvas2D drawing calls
    expect(mockCtx.fillRect).toHaveBeenCalled(); // Background clear + viewport fill
    expect(mockCtx.arc).toHaveBeenCalled(); // Target arcs + center crosshair dot
    expect(mockCtx.fill).toHaveBeenCalled();
    expect(mockCtx.stroke).toHaveBeenCalled();

    // Verify snapshot was not mutated
    expect(snapshot.targetCount).toBe(2);
    expect(snapshot.tick).toBe(1);

    // Clean dispose
    renderer.dispose();
  });

  it("handles resize without re-initialization errors", () => {
    const renderer = createAimRenderer();
    const mockCanvas = {
      width: 1280,
      height: 720,
      getContext: vi.fn(() => ({
        fillRect: vi.fn(),
        beginPath: vi.fn(),
        arc: vi.fn(),
        fill: vi.fn(),
        stroke: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
      })),
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
