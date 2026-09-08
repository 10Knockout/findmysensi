import { createTick, Tick } from "@findmysensi/protocol";

export type RunStopReason =
  "completed" | "manual_abort" | "fatal_desync" | "unrecoverable_lag";

export interface FixedTickRunnerOptions {
  readonly tickRateHz?: number | undefined; // default 128
  readonly maxCatchUpTicksPerFrame?: number | undefined; // default 8
  readonly onTick: (tick: Tick) => void;
  readonly onRender: (alpha: number) => void;
  readonly onLagViolation?: ((backlogTicks: number) => void) | undefined;
}

export interface FixedTickRunner {
  start(): void;
  resume(): void;
  stop(reason: RunStopReason): void;
  onAnimationFrame(nowMs: number): void;
  isRunning(): boolean;
  getTickCount(): number;
}

export class BoundedFixedTickRunner implements FixedTickRunner {
  private readonly tickIntervalMs: number;
  private readonly maxCatchUpTicks: number;
  private readonly onTick: (tick: Tick) => void;
  private readonly onRender: (alpha: number) => void;
  private readonly onLagViolation?:
    ((backlogTicks: number) => void) | undefined;

  private running: boolean = false;
  private currentTick: number = 0;
  private lastFrameTimeMs: number = -1;
  private accumulatorMs: number = 0;

  constructor(options: FixedTickRunnerOptions) {
    const rate =
      options.tickRateHz !== undefined && options.tickRateHz > 0
        ? options.tickRateHz
        : 128;
    this.tickIntervalMs = 1000 / rate;
    this.maxCatchUpTicks = options.maxCatchUpTicksPerFrame ?? 8;
    this.onTick = options.onTick;
    this.onRender = options.onRender;
    this.onLagViolation = options.onLagViolation;
  }

  public start(): void {
    this.running = true;
    this.currentTick = 0;
    this.lastFrameTimeMs = -1;
    this.accumulatorMs = 0;
  }

  public resume(): void {
    if (this.running) return;
    this.running = true;
    // Drop wall-clock time spent paused without resetting deterministic state.
    this.lastFrameTimeMs = -1;
  }

  public stop(_reason: RunStopReason): void {
    this.running = false;
  }

  public isRunning(): boolean {
    return this.running;
  }

  public getTickCount(): number {
    return this.currentTick;
  }

  public onAnimationFrame(nowMs: number): void {
    if (!this.running) {
      return;
    }

    if (this.lastFrameTimeMs < 0) {
      this.lastFrameTimeMs = nowMs;
      this.onRender(0);
      return;
    }

    const elapsedMs = Math.max(0, nowMs - this.lastFrameTimeMs);
    this.lastFrameTimeMs = nowMs;
    this.accumulatorMs += elapsedMs;

    let ticksSimulated = 0;

    // `this.running` is re-checked every iteration because onTick is what ends
    // a run: the callback that crosses the duration boundary calls stop(), and
    // without this guard the remaining ticks this frame owed would still be
    // simulated -- replaying the end of the run once per owed tick.
    while (this.running && this.accumulatorMs >= this.tickIntervalMs) {
      if (ticksSimulated >= this.maxCatchUpTicks) {
        // Severe lag backlog violation
        const backlogTicks = Math.floor(
          this.accumulatorMs / this.tickIntervalMs,
        );
        if (this.onLagViolation) {
          this.onLagViolation(backlogTicks);
        }
        // Drain backlog to avoid spiral-of-death while signaling lag violation
        this.accumulatorMs = this.accumulatorMs % this.tickIntervalMs;
        break;
      }

      this.onTick(createTick(this.currentTick++));
      this.accumulatorMs -= this.tickIntervalMs;
      ticksSimulated++;
    }

    const alpha = this.accumulatorMs / this.tickIntervalMs;
    this.onRender(Math.min(1.0, Math.max(0.0, alpha)));
  }
}

export function createFixedTickRunner(
  options: FixedTickRunnerOptions,
): FixedTickRunner {
  return new BoundedFixedTickRunner(options);
}
