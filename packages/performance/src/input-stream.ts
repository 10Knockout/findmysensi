export type SyntheticInputEvent =
  | {
      readonly kind: "move";
      readonly dx: number;
      readonly dy: number;
      readonly timeMs: number;
    }
  | { readonly kind: "shot"; readonly button: 0; readonly timeMs: number }
  | {
      readonly kind: "invalidate";
      readonly reasonCode: number;
      readonly timeMs: number;
    };

export interface HighPollStreamOptions {
  pollingRateHz: number;
  durationMs: number;
  shotIntervalMs?: number | undefined;
}

export function generateHighPollStream(
  options: HighPollStreamOptions,
): SyntheticInputEvent[] {
  const { pollingRateHz, durationMs, shotIntervalMs } = options;
  const events: SyntheticInputEvent[] = [];

  const dt = 1000 / pollingRateHz;
  let nextShotTime =
    shotIntervalMs !== undefined && shotIntervalMs > 0 ? shotIntervalMs : -1;

  let time = 0;
  let step = 0;

  while (time <= durationMs) {
    if (nextShotTime > 0 && time >= nextShotTime) {
      events.push({
        kind: "shot",
        button: 0,
        timeMs: time,
      });
      nextShotTime += shotIntervalMs!;
    }

    // Deterministic arithmetic sweep pattern (no Math.sin in core, but pure integer arithmetic pattern)
    const patternPhase = step % 64;
    const dx = patternPhase < 32 ? patternPhase - 16 : 48 - patternPhase;
    const dy = (step % 16) - 8;

    events.push({
      kind: "move",
      dx,
      dy,
      timeMs: time,
    });

    time += dt;
    step++;
  }

  return events;
}

export interface BurstStreamOptions {
  baseRateHz: number;
  burstRateHz: number;
  burstStartMs: number;
  burstDurationMs: number;
  totalDurationMs: number;
}

export function generateBurstRecoveryStream(
  options: BurstStreamOptions,
): SyntheticInputEvent[] {
  const {
    baseRateHz,
    burstRateHz,
    burstStartMs,
    burstDurationMs,
    totalDurationMs,
  } = options;
  const events: SyntheticInputEvent[] = [];

  let time = 0;
  let step = 0;

  while (time <= totalDurationMs) {
    const inBurst =
      time >= burstStartMs && time < burstStartMs + burstDurationMs;
    const currentRate = inBurst ? burstRateHz : baseRateHz;
    const dt = 1000 / currentRate;

    const dx = ((step * 7) % 31) - 15;
    const dy = ((step * 3) % 17) - 8;

    events.push({
      kind: "move",
      dx,
      dy,
      timeMs: time,
    });

    time += dt;
    step++;
  }

  return events;
}
