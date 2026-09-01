import { describe, expect, it, vi } from "vitest";
import { startRunIfPointerLocked } from "./pointer-lock-guard.js";

describe("Gridshot pointer-lock countdown guard", () => {
  it("does not start a run if pointer lock was released during countdown", () => {
    const canvas = {} as HTMLCanvasElement;
    const start = vi.fn();

    const started = startRunIfPointerLocked(canvas, null, start);

    expect(started).toBe(false);
    expect(start).not.toHaveBeenCalled();
  });

  it("starts exactly once when the expected canvas still owns pointer lock", () => {
    const canvas = {} as HTMLCanvasElement;
    const start = vi.fn();

    const started = startRunIfPointerLocked(canvas, canvas, start);

    expect(started).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
