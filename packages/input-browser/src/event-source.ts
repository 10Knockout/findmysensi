import { InputRingBuffer } from "./ring-buffer.js";

export type InputSource = "pointerrawupdate" | "pointermove";

export interface EventSourceCapability {
  readonly preferredSource: InputSource;
  readonly supportsPointerRawUpdate: boolean;
  readonly supportsCoalescedEvents: boolean;
  readonly supportsUnadjustedMovement: boolean;
}

export interface InputListenerOptions {
  readonly shouldCaptureGameplayInput?: () => boolean;
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
    supportsUnadjustedMovement: true,
  };
}

export function attachInputListener(
  target: EventTarget,
  ringBuffer: InputRingBuffer,
  source: InputSource = "pointermove",
  options: InputListenerOptions = {},
): () => void {
  const shouldCaptureGameplayInput =
    options.shouldCaptureGameplayInput ?? (() => true);

  const onPointerMove = (ev: Event) => {
    if (!shouldCaptureGameplayInput()) return;

    const pEv = ev as PointerEvent & {
      getCoalescedEvents?: () => PointerEvent[];
    };

    if (typeof pEv.getCoalescedEvents === "function") {
      const coalesced = pEv.getCoalescedEvents();
      if (coalesced && coalesced.length > 0) {
        for (const subEv of coalesced) {
          ringBuffer.pushMove(
            subEv.movementX,
            subEv.movementY,
            subEv.timeStamp,
          );
        }
        return;
      }
    }

    ringBuffer.pushMove(pEv.movementX, pEv.movementY, pEv.timeStamp);
  };

  const onPointerDown = (ev: Event) => {
    if (!shouldCaptureGameplayInput()) return;

    const mEv = ev as MouseEvent;
    if (mEv.button === 0) {
      ringBuffer.pushShot(0, mEv.timeStamp);
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
  target.addEventListener("pointerdown", onPointerDown as EventListener);
  target.addEventListener("blur", onBlur as EventListener);

  if (typeof document !== "undefined") {
    document.addEventListener("pointerlockchange", onPointerLockChange);
  }

  return () => {
    target.removeEventListener(source, onPointerMove as EventListener);
    target.removeEventListener("pointerdown", onPointerDown as EventListener);
    target.removeEventListener("blur", onBlur as EventListener);
    if (typeof document !== "undefined") {
      document.removeEventListener("pointerlockchange", onPointerLockChange);
    }
  };
}
