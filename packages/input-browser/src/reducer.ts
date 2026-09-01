import {
  CanonicalInputEvent,
  createInvalidateEvent,
  createMoveEvent,
  createShotEvent,
  InvalidationReason,
} from "@findmysensi/aim-core";
import { Tick } from "@findmysensi/protocol";
import {
  EVENT_KIND_INVALIDATE,
  EVENT_KIND_MOVE,
  EVENT_KIND_SHOT,
  RawInputBatchTarget,
} from "./ring-buffer.js";

export interface ReducedSegment {
  readonly tick: Tick;
  readonly events: readonly CanonicalInputEvent[];
}

export interface TickBucketer {
  timeToTick(timeIndex: number): Tick;
}

function mapReasonCode(code: number): InvalidationReason {
  switch (code) {
    case 1:
      return "focus_lost";
    case 2:
      return "pointer_lock_lost";
    case 3:
      return "buffer_overflow";
    case 4:
      return "client_desync";
    case 5:
      return "manual_abort";
    default:
      return "client_desync";
  }
}

export function reduceRawEvents(
  input: RawInputBatchTarget,
  clock: TickBucketer,
): ReducedSegment[] {
  if (input.count === 0) {
    return [];
  }

  const segments: ReducedSegment[] = [];
  let currentSegmentTick: Tick | null = null;
  let currentEvents: CanonicalInputEvent[] = [];
  let currentOrder = 0;

  let accumDx = 0;
  let accumDy = 0;

  const flushMove = (tick: Tick) => {
    if (accumDx !== 0 || accumDy !== 0) {
      currentEvents.push(
        createMoveEvent(tick, currentOrder++, accumDx, accumDy),
      );
      accumDx = 0;
      accumDy = 0;
    }
  };

  const flushSegment = () => {
    if (currentSegmentTick !== null) {
      flushMove(currentSegmentTick);
      if (currentEvents.length > 0) {
        segments.push({
          tick: currentSegmentTick,
          events: currentEvents,
        });
      }
      currentEvents = [];
      currentOrder = 0;
    }
  };

  for (let i = 0; i < input.count; i++) {
    const kind = input.kinds[i] ?? 0;
    const timeIndex = input.timeIndices[i] ?? 0;
    const tick = clock.timeToTick(timeIndex);

    if (currentSegmentTick === null || tick !== currentSegmentTick) {
      flushSegment();
      currentSegmentTick = tick;
    }

    switch (kind) {
      case EVENT_KIND_MOVE: {
        accumDx += input.dx[i] ?? 0;
        accumDy += input.dy[i] ?? 0;
        break;
      }

      case EVENT_KIND_SHOT: {
        flushMove(currentSegmentTick);
        currentEvents.push(createShotEvent(currentSegmentTick, currentOrder++));
        break;
      }

      case EVENT_KIND_INVALIDATE: {
        flushMove(currentSegmentTick);
        const reasonCode = input.buttons[i] ?? 0;
        const reason = mapReasonCode(reasonCode);
        currentEvents.push(
          createInvalidateEvent(currentSegmentTick, currentOrder++, reason),
        );
        break;
      }
    }
  }

  flushSegment();
  return segments;
}
