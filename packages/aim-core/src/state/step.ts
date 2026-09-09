import { Tick, createTick } from "@findmysensi/protocol";
import { addAngle } from "../fixed/angle.js";
import { clampPitch } from "../fixed/range.js";
import { CanonicalInputEvent } from "../input/types.js";
import { ShotRecord, SimulationState } from "./types.js";

export function stepSimulation(
  initialState: SimulationState,
  events: readonly CanonicalInputEvent[],
  targetTick?: Tick,
): SimulationState {
  let currentTick = initialState.tick;
  let currentYaw = initialState.yaw;
  let currentPitch = initialState.pitch;
  let isValid = initialState.valid;
  let invalidationReason = initialState.invalidationReason;
  const currentShots: ShotRecord[] = [...initialState.shots];

  // Sort events strictly by tick ASC, order ASC to preserve causal sequence
  const sortedEvents = [...events].sort((a, b) => {
    if (a.tick !== b.tick) {
      return a.tick - b.tick;
    }
    return a.order - b.order;
  });

  for (const event of sortedEvents) {
    if (event.tick < currentTick) {
      // Non-causal event arrival violates deterministic monotonicity
      isValid = false;
      invalidationReason = "client_desync";
      continue;
    }

    currentTick = event.tick;

    if (!isValid) {
      // Once invalidated, simulation halts further state mutations
      continue;
    }

    switch (event.kind) {
      case "move":
        currentYaw = addAngle(currentYaw, event.dx);
        currentPitch = clampPitch(currentPitch + event.dy);
        break;

      case "shot":
        currentShots.push({
          tick: event.tick,
          order: event.order,
          yaw: currentYaw,
          pitch: currentPitch,
        });
        break;

      case "fire-state":
        // Fire state is camera-neutral. Mode runtimes consume it when their
        // mechanics require held-button state.
        break;

      case "invalidate":
        isValid = false;
        invalidationReason = event.reason;
        break;
    }
  }

  if (targetTick !== undefined) {
    if (targetTick < currentTick) {
      throw new RangeError(
        `targetTick (${targetTick}) cannot be less than last simulation tick (${currentTick}).`,
      );
    }
    currentTick = createTick(targetTick);
  }

  return {
    tick: currentTick,
    yaw: currentYaw,
    pitch: currentPitch,
    valid: isValid,
    invalidationReason,
    shots: currentShots,
  };
}
