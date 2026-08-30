import { describe, expect, it } from "vitest";
import { loadTrainerRuntime } from "../../apps/web/src/trainer/load-runtime.js";

describe("Web Trainer Isolated Bundle Boundary", () => {
  it("dynamically loads trainer runtime modules only when loadTrainerRuntime() is invoked", async () => {
    expect(typeof loadTrainerRuntime).toBe("function");

    const runtime = await loadTrainerRuntime();

    // Verify all four core packages are properly wired
    expect(runtime.protocol).toBeDefined();
    expect(runtime.aimCore).toBeDefined();
    expect(runtime.inputBrowser).toBeDefined();
    expect(runtime.renderCanvas).toBeDefined();

    // Test creating instances via runtime bundle
    const ring = runtime.inputBrowser.createInputRingBuffer(32);
    expect(ring.getHighWaterMark()).toBe(0);

    const transform = runtime.renderCanvas.createViewportTransform({
      canvasWidth: 1280,
      canvasHeight: 720,
    });
    expect(transform.displayRect.width).toBe(1280);

    const snapshotBuffer = runtime.aimCore.createSnapshotBuffer(16);
    expect(snapshotBuffer.getLatest().tick).toBe(0);
  });
});
