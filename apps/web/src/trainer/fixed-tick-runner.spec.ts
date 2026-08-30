import { Tick } from "@findmysensi/protocol";
import { describe, expect, it, vi } from "vitest";
import { createFixedTickRunner } from "./fixed-tick-runner.js";

describe("Bounded Fixed-Tick Simulation Runner", () => {
  it("advances simulation by discrete fixed ticks independently of frame rate", () => {
    const executedTicks: Tick[] = [];
    const renderAlphas: number[] = [];

    const runner = createFixedTickRunner({
      tickRateHz: 100, // 10ms per tick
      maxCatchUpTicksPerFrame: 8,
      onTick: (tick) => executedTicks.push(tick),
      onRender: (alpha) => renderAlphas.push(alpha),
    });

    runner.start();

    // Frame 0: now = 0ms (init)
    runner.onAnimationFrame(0);
    expect(executedTicks.length).toBe(0);
    expect(renderAlphas.length).toBe(1);

    // Frame 1: now = 25ms -> should execute 2 ticks (10ms, 20ms) with 5ms remainder (alpha = 0.5)
    runner.onAnimationFrame(25);
    expect(executedTicks).toEqual([0, 1]);
    expect(renderAlphas[1]).toBeCloseTo(0.5, 3);

    // Frame 2: now = 32ms (+7ms -> total remainder 12ms -> should execute 1 tick at 30ms, remainder 2ms, alpha = 0.2)
    runner.onAnimationFrame(32);
    expect(executedTicks).toEqual([0, 1, 2]);
    expect(renderAlphas[2]).toBeCloseTo(0.2, 3);
  });

  it("limits catch-up steps and triggers onLagViolation when backlog exceeds maxCatchUpTicks", () => {
    let tickCount = 0;
    const onLagViolation = vi.fn();

    const runner = createFixedTickRunner({
      tickRateHz: 100, // 10ms per tick
      maxCatchUpTicksPerFrame: 4, // Max 4 ticks (40ms) catch up per frame
      onTick: () => tickCount++,
      onRender: () => {},
      onLagViolation,
    });

    runner.start();
    runner.onAnimationFrame(0);

    // Massive 200ms frame lag spike (20 ticks behind)
    runner.onAnimationFrame(200);

    // Should execute bounded max 4 ticks to prevent main thread lockup
    expect(tickCount).toBe(4);
    expect(onLagViolation).toHaveBeenCalled();
  });
});
