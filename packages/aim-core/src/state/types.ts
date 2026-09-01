import { Tick, createTick } from "@findmysensi/protocol";
import {
  AngleUnits,
  createAngleUnits,
  createPitchUnits,
  PitchUnits,
} from "../fixed/angle.js";
import { InvalidationReason } from "../input/types.js";

export interface ShotRecord {
  readonly tick: Tick;
  readonly order: number;
  readonly yaw: AngleUnits;
  readonly pitch: PitchUnits;
}

export interface SimulationState {
  readonly tick: Tick;
  readonly yaw: AngleUnits;
  readonly pitch: PitchUnits;
  readonly valid: boolean;
  readonly invalidationReason?: InvalidationReason | undefined;
  readonly shots: readonly ShotRecord[];
}

export function createInitialSimulationState(
  initialYaw: number = 0,
  initialPitch: number = 0,
): SimulationState {
  return {
    tick: createTick(0),
    yaw: createAngleUnits(initialYaw),
    pitch: createPitchUnits(initialPitch),
    valid: true,
    shots: [],
  };
}
