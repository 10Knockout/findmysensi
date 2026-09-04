import { createPrngV1, FULL_TURN_UNITS } from "@findmysensi/aim-core";
import { describe, expect, it } from "vitest";
import {
  TempoScenarioEngine,
  TICKS_PER_BEAT,
  EARLY_WINDOW,
  LATE_WINDOW,
} from "../src/tempo/dev-v0.js";

describe("Tempo Scenario (dev-v0)", () => {
  const seed: [number, number, number, number] = [0x11, 0x22, 0x33, 0x44];

  it("initializes a full beat schedule", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    const firstTarget = engine.initialize(prng);
    // First beat is at TICKS_PER_BEAT, should return a reference to first upcoming beat
    expect(firstTarget).not.toBeNull();
    expect(firstTarget!.xAngleUnits).toBeGreaterThanOrEqual(0);
    expect(firstTarget!.xAngleUnits).toBeLessThan(FULL_TURN_UNITS);
  });

  it("activates targets within the early window", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Before early window → no active target
    const _tooEarly = engine.tick(0);
    // Might or might not be active depending on first beat timing

    // Advance to just within early window of first beat
    const earlyTick = TICKS_PER_BEAT - EARLY_WINDOW;
    const target = engine.tick(earlyTick);
    expect(target).not.toBeNull();
  });

  it("records miss when late window expires", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Activate the first beat
    engine.tick(TICKS_PER_BEAT - EARLY_WINDOW);

    // Let it expire past late window
    engine.tick(TICKS_PER_BEAT + LATE_WINDOW + 1);

    const metrics = engine.getTempoMetrics();
    expect(metrics.miss).toBe(1);
  });

  it("returns perfect judgement for shot within ±8 ticks of beat", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Activate the first beat
    const activatedTarget = engine.tick(TICKS_PER_BEAT - EARLY_WINDOW);
    expect(activatedTarget).not.toBeNull();

    // Shoot exactly on the beat
    const judgement = engine.processShot(TICKS_PER_BEAT, activatedTarget!.id);
    expect(judgement).toBe("perfect");
  });

  it("returns early judgement for shot before beat", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    const target = engine.tick(TICKS_PER_BEAT - EARLY_WINDOW);
    expect(target).not.toBeNull();

    // Shoot 15 ticks early (outside perfect window of ±8, but within early window)
    const judgement = engine.processShot(TICKS_PER_BEAT - 15, target!.id);
    expect(judgement).toBe("early");
  });

  it("produces tempo metrics", () => {
    const engine = new TempoScenarioEngine();
    const prng = createPrngV1(seed);

    engine.initialize(prng);

    // Perfect hit on first beat
    const t1 = engine.tick(TICKS_PER_BEAT - EARLY_WINDOW);
    engine.processShot(TICKS_PER_BEAT, t1!.id);

    // Let second beat expire as miss
    engine.tick(2 * TICKS_PER_BEAT - EARLY_WINDOW);
    engine.tick(2 * TICKS_PER_BEAT + LATE_WINDOW + 1);

    const metrics = engine.getTempoMetrics();
    expect(metrics.perfect).toBe(1);
    expect(metrics.miss).toBe(1);
    expect(metrics.totalBeats).toBe(2);
    expect(metrics.perfectPercentage).toBe(50);
  });

  it("is deterministic with the same seed", () => {
    const engine1 = new TempoScenarioEngine();
    const prng1 = createPrngV1(seed);
    engine1.initialize(prng1);

    const engine2 = new TempoScenarioEngine();
    const prng2 = createPrngV1(seed);
    engine2.initialize(prng2);

    // Same active targets at the same ticks
    for (let tick = 0; tick < TICKS_PER_BEAT * 5; tick += 10) {
      const t1 = engine1.tick(tick);
      const t2 = engine2.tick(tick);
      if (t1 && t2) {
        expect(t1.xAngleUnits).toBe(t2.xAngleUnits);
        expect(t1.yAngleUnits).toBe(t2.yAngleUnits);
      }
    }
  });
});
