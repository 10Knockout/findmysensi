import { InputRingBuffer } from "./ring-buffer.js";

export type InputSource = "pointerrawupdate" | "pointermove" | "mousemove";

/**
 * Pointer Lock defines unbounded relative motion on MouseEvent `mousemove`.
 * Pointer Events are useful for unlocked UI, but are not the authoritative
 * cross-browser delivery contract for a locked FPS camera.
 */
export const POINTER_LOCK_MOVEMENT_SOURCE = "mousemove" as const;

export interface EventSourceCapability {
  readonly preferredSource: InputSource;
  readonly supportsPointerRawUpdate: boolean;
  readonly supportsCoalescedEvents: boolean;
  readonly supportsUnadjustedMovement: "unknown-until-requested";
}

export interface InputListenerOptions {
  readonly shouldCaptureGameplayInput?: () => boolean;
  /** Called for each DOM movement sample before integer buffering. */
  readonly onMovementObserved?: (sample: {
    readonly dx: number;
    readonly dy: number;
    readonly timeStamp: number;
    readonly source: InputSource;
  }) => void;
  /** Called with the integer movement accepted by the ring buffer. */
  readonly onMovementAccepted?: (sample: {
    readonly dx: number;
    readonly dy: number;
    readonly timeStamp: number;
    readonly source: InputSource;
  }) => void;
}

export function detectInputCapabilities(
  globalObj: Window | unknown = typeof window !== "undefined"
    ? window
    : undefined,
): EventSourceCapability {
  const win = globalObj as
    | {
        onpointerrawupdate?: unknown;
        PointerEvent?: { prototype?: { getCoalescedEvents?: unknown } };
      }
    | undefined;

  const supportsPointerRawUpdate = Boolean(
    win &&
    ("onpointerrawupdate" in win ||
      (win as Record<string, unknown>)["onpointerrawupdate"] !== undefined),
  );

  const supportsCoalescedEvents = Boolean(
    win?.PointerEvent?.prototype &&
    "getCoalescedEvents" in win.PointerEvent.prototype,
  );

  return {
    preferredSource: supportsPointerRawUpdate
      ? "pointerrawupdate"
      : "pointermove",
    supportsPointerRawUpdate,
    supportsCoalescedEvents,
    supportsUnadjustedMovement: "unknown-until-requested",
  };
}

export function attachInputListener(
  target: EventTarget,
  ringBuffer: InputRingBuffer,
  source: InputSource = POINTER_LOCK_MOVEMENT_SOURCE,
  options: InputListenerOptions = {},
): () => void {
  const shouldCaptureGameplayInput =
    options.shouldCaptureGameplayInput ?? (() => true);

  let fractionX = 0;
  let fractionY = 0;

  const pushMovement = (dx: number, dy: number, timeStamp: number) => {
    options.onMovementObserved?.({ dx, dy, timeStamp, source });
    fractionX += dx;
    fractionY += dy;
    const intX = Math.trunc(fractionX);
    const intY = Math.trunc(fractionY);
    fractionX -= intX;
    fractionY -= intY;
    if (intX !== 0 || intY !== 0) {
      ringBuffer.pushMove(intX, intY, timeStamp);
      options.onMovementAccepted?.({
        dx: intX,
        dy: intY,
        timeStamp,
        source,
      });
    }
  };

  const onPointerMove = (ev: Event) => {
    if (!shouldCaptureGameplayInput()) return;
    if (
      typeof (ev as { preventDefault?: () => void }).preventDefault ===
      "function"
    ) {
      ev.preventDefault();
    }

    const pEv = ev as PointerEvent & {
      getCoalescedEvents?: () => PointerEvent[];
    };

    if (typeof pEv.getCoalescedEvents === "function") {
      const coalesced = pEv.getCoalescedEvents();
      if (coalesced && coalesced.length > 0) {
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < coalesced.length; i++) {
          sumX += coalesced[i]?.movementX ?? 0;
          sumY += coalesced[i]?.movementY ?? 0;
        }

        // Only use coalesced events if their sum actually accounts for the parent movement;
        // if they are missing deltas or stuck at 0 (known Chromium bug), use the parent event.
        if (
          Math.abs(sumX - pEv.movementX) <= 1 &&
          Math.abs(sumY - pEv.movementY) <= 1 &&
          (sumX !== 0 ||
            sumY !== 0 ||
            (pEv.movementX === 0 && pEv.movementY === 0))
        ) {
          for (let i = 0; i < coalesced.length; i++) {
            const subEv = coalesced[i]!;
            pushMovement(subEv.movementX, subEv.movementY, subEv.timeStamp);
          }
          return;
        }
      }
    }

    pushMovement(pEv.movementX, pEv.movementY, pEv.timeStamp);
  };

  const onMouseDown = (ev: Event) => {
    if (!shouldCaptureGameplayInput()) return;
    if (
      typeof (ev as { preventDefault?: () => void }).preventDefault ===
      "function"
    ) {
      ev.preventDefault();
    }

    const mEv = ev as MouseEvent;
    if (mEv.button === 0) {
      ringBuffer.pushShot(0, mEv.timeStamp);
    }
  };

  const preventGesture = (ev: Event) => {
    if (
      shouldCaptureGameplayInput() &&
      typeof (ev as { preventDefault?: () => void }).preventDefault ===
        "function"
    ) {
      ev.preventDefault();
    }
  };

  const onBlur = (ev: Event) => {
    const timeStamp = (ev as { timeStamp?: number }).timeStamp ?? 0;
    ringBuffer.pushInvalidate(1 /* focus_lost */, timeStamp);
  };

  const onPointerLockChange = () => {
    if (typeof document !== "undefined" && !document.pointerLockElement) {
      ringBuffer.pushInvalidate(2 /* pointer_lock_lost */, 0);
    }
  };

  target.addEventListener(source, onPointerMove as EventListener);
  // Pointer Lock guarantees compatibility mouse events on the lock target.
  // Use the same Mouse Events contract for shots as for locked movement so a
  // browser that suppresses Pointer Events while locked cannot lose clicks.
  target.addEventListener("mousedown", onMouseDown as EventListener);
  target.addEventListener("mouseup", preventGesture as EventListener);
  target.addEventListener("click", preventGesture as EventListener);
  target.addEventListener("dblclick", preventGesture as EventListener);
  target.addEventListener("contextmenu", preventGesture as EventListener);
  target.addEventListener("selectstart", preventGesture as EventListener);
  target.addEventListener("dragstart", preventGesture as EventListener);
  target.addEventListener("blur", onBlur as EventListener);

  if (typeof document !== "undefined") {
    document.addEventListener("pointerlockchange", onPointerLockChange);
  }

  return () => {
    target.removeEventListener(source, onPointerMove as EventListener);
    target.removeEventListener("mousedown", onMouseDown as EventListener);
    target.removeEventListener("mouseup", preventGesture as EventListener);
    target.removeEventListener("click", preventGesture as EventListener);
    target.removeEventListener("dblclick", preventGesture as EventListener);
    target.removeEventListener("contextmenu", preventGesture as EventListener);
    target.removeEventListener("selectstart", preventGesture as EventListener);
    target.removeEventListener("dragstart", preventGesture as EventListener);
    target.removeEventListener("blur", onBlur as EventListener);
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    }
  };
}
