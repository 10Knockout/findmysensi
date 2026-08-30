import { Tick, createTick } from "@findmysensi/protocol";
import { AngleDeltaUnits, createAngleDeltaUnits } from "../fixed/angle.js";

export type InvalidationReason =
  | "focus_lost"
  | "pointer_lock_lost"
  | "buffer_overflow"
  | "client_desync"
  | "manual_abort";

export interface CanonicalMoveEvent {
  readonly kind: "move";
  readonly tick: Tick;
  readonly order: number;
  readonly dx: AngleDeltaUnits;
  readonly dy: AngleDeltaUnits;
}

export interface CanonicalShotEvent {
  readonly kind: "shot";
  readonly tick: Tick;
  readonly order: number;
  readonly button: 0;
}

export interface CanonicalInvalidateEvent {
  readonly kind: "invalidate";
  readonly tick: Tick;
  readonly order: number;
  readonly reason: InvalidationReason;
}

export type CanonicalInputEvent =
  CanonicalMoveEvent | CanonicalShotEvent | CanonicalInvalidateEvent;

export function createMoveEvent(
  tick: number,
  order: number,
  dx: number,
  dy: number,
): CanonicalMoveEvent {
  if (!Number.isSafeInteger(order) || order < 0) {
    throw new RangeError(
      `Invalid order: ${order}. Must be a non-negative integer.`,
    );
  }
  return {
    kind: "move",
    tick: createTick(tick),
    order,
    dx: createAngleDeltaUnits(dx),
    dy: createAngleDeltaUnits(dy),
  };
}

export function createShotEvent(
  tick: number,
  order: number,
): CanonicalShotEvent {
  if (!Number.isSafeInteger(order) || order < 0) {
    throw new RangeError(
      `Invalid order: ${order}. Must be a non-negative integer.`,
    );
  }
  return {
    kind: "shot",
    tick: createTick(tick),
    order,
    button: 0,
  };
}

export function createInvalidateEvent(
  tick: number,
  order: number,
  reason: InvalidationReason,
): CanonicalInvalidateEvent {
  if (!Number.isSafeInteger(order) || order < 0) {
    throw new RangeError(
      `Invalid order: ${order}. Must be a non-negative integer.`,
    );
  }
  return {
    kind: "invalidate",
    tick: createTick(tick),
    order,
    reason,
  };
}
