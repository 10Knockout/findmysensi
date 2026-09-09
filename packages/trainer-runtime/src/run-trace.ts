/**
 * In-memory, per-run shot trace for post-run movement analysis.
 *
 * A `RunTrace` lives only in React state for the run that just finished and is
 * discarded on navigation, restart, or reload. Nothing here touches
 * `localStorage`, the run record, or the network -- it is a pure value type
 * plus a tiny recorder. Only click-discrete modes produce one.
 */

export interface RunTraceShot {
  /** Simulation tick the shot was taken on. */
  readonly tick: number;
  /** Aim direction at the shot tick, in angle units. */
  readonly aimYaw: number;
  readonly aimPitch: number;
  /** Nearest target centre at the shot tick, in angle units. */
  readonly targetYaw: number;
  readonly targetPitch: number;
  /** Target radius, in angle units. */
  readonly targetRadius: number;
  readonly hit: boolean;
}

export interface RunTrace {
  readonly shots: readonly RunTraceShot[];
}

export interface RunTraceRecorder {
  record(shot: RunTraceShot): void;
  /** Return a frozen snapshot; further `record` calls do not affect it. */
  finish(): RunTrace;
}

export function createRunTraceRecorder(): RunTraceRecorder {
  const shots: RunTraceShot[] = [];
  return {
    record(shot) {
      shots.push(shot);
    },
    finish() {
      return { shots: Object.freeze([...shots]) };
    },
  };
}

export interface ShotOffset {
  /** Horizontal miss distance in target radii: `(aimYaw - targetYaw) / r`. */
  readonly dx: number;
  /** Vertical miss distance in target radii: `(aimPitch - targetPitch) / r`. */
  readonly dy: number;
  readonly hit: boolean;
}

/**
 * Target-normalized offset per shot: `1.0` == one radius off centre. A hit that
 * landed dead centre is `{ dx: 0, dy: 0 }`.
 */
export function toShotOffsets(trace: RunTrace): readonly ShotOffset[] {
  return trace.shots.map((shot) => ({
    dx: (shot.aimYaw - shot.targetYaw) / shot.targetRadius,
    dy: (shot.aimPitch - shot.targetPitch) / shot.targetRadius,
    hit: shot.hit,
  }));
}
