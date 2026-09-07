import { describe, expect, it, vi } from "vitest";
import {
  attachInputListener,
  detectInputCapabilities,
  POINTER_LOCK_MOVEMENT_SOURCE,
} from "../src/event-source.js";
import {
  createPointerLockController,
  PointerLockController,
} from "../src/pointer-lock.js";
import {
  createInputRingBuffer,
  createRawInputBatchTarget,
  EVENT_KIND_INVALIDATE,
  EVENT_KIND_MOVE,
  EVENT_KIND_SHOT,
} from "../src/ring-buffer.js";

describe("Event-Source Capability Detection and Adapter Selection", () => {
  it("detects high-poll Chromium capabilities (pointerrawupdate, coalesced, unadjusted)", () => {
    const mockWindow = {
      onpointerrawupdate: null,
      PointerEvent: function () {},
    };
    mockWindow.PointerEvent.prototype = {
      getCoalescedEvents: () => [],
    };

    const caps = detectInputCapabilities(mockWindow as unknown as Window);
    expect(caps.supportsPointerRawUpdate).toBe(true);
    expect(caps.supportsCoalescedEvents).toBe(true);
    expect(caps.preferredSource).toBe("pointerrawupdate");
    expect(caps.supportsUnadjustedMovement).toBe("unknown-until-requested");
  });

  it("detects standard browser capabilities (fallback to pointermove without coalesced)", () => {
    const mockWindow = {
      PointerEvent: function () {},
    };

    const caps = detectInputCapabilities(mockWindow as unknown as Window);
    expect(caps.supportsPointerRawUpdate).toBe(false);
    expect(caps.supportsCoalescedEvents).toBe(false);
    expect(caps.preferredSource).toBe("pointermove");
  });

  it("consumes coalesced events when available during input event processing", () => {
    const ring = createInputRingBuffer(32);
    const targetBatch = createRawInputBatchTarget(32);

    const listeners: Record<string, (ev: unknown) => void> = {};
    const observed: Array<{ dx: number; dy: number; source: string }> = [];
    const accepted: Array<{ dx: number; dy: number; source: string }> = [];
    const mockTarget = {
      addEventListener: (type: string, listener: (ev: unknown) => void) => {
        listeners[type] = listener;
      },
      removeEventListener: (type: string) => {
        delete listeners[type];
      },
    };

    const cleanup = attachInputListener(
      mockTarget as unknown as EventTarget,
      ring,
      "pointermove",
      {
        onMovementObserved: ({ dx, dy, source }) => {
          observed.push({ dx, dy, source });
        },
        onMovementAccepted: ({ dx, dy, source }) => {
          accepted.push({ dx, dy, source });
        },
      },
    );

    const moveListener = listeners["pointermove"];
    expect(moveListener).toBeDefined();

    const mockEvent = {
      movementX: 30,
      movementY: 15,
      timeStamp: 10.0,
      getCoalescedEvents: () => [
        { movementX: 10, movementY: 5, timeStamp: 8.0 },
        { movementX: 12, movementY: 6, timeStamp: 9.0 },
        { movementX: 8, movementY: 4, timeStamp: 10.0 },
      ],
    };

    moveListener!(mockEvent);

    const stats = ring.drainInto(targetBatch);
    expect(stats.drainedCount).toBe(3);
    expect(targetBatch.dx[0]).toBe(10);
    expect(targetBatch.dx[1]).toBe(12);
    expect(targetBatch.dx[2]).toBe(8);
    expect(accepted).toEqual([
      { dx: 10, dy: 5, source: "pointermove" },
      { dx: 12, dy: 6, source: "pointermove" },
      { dx: 8, dy: 4, source: "pointermove" },
    ]);
    expect(observed).toEqual(accepted);

    cleanup();
    expect(Object.keys(listeners).length).toBe(0);
  });

  it("captures pointer-locked shots through the guaranteed mousedown event", () => {
    const ring = createInputRingBuffer(32);
    const targetBatch = createRawInputBatchTarget(32);

    const listeners: Record<string, (ev: unknown) => void> = {};
    const mockTarget = {
      addEventListener: (type: string, listener: (ev: unknown) => void) => {
        listeners[type] = listener;
      },
      removeEventListener: (type: string) => {
        delete listeners[type];
      },
    };

    const cleanup = attachInputListener(
      mockTarget as unknown as EventTarget,
      ring,
      "pointermove",
    );

    listeners["mousedown"]!({ button: 0, timeStamp: 5.0 });

    const stats = ring.drainInto(targetBatch);
    expect(stats.drainedCount).toBe(1);
    expect(targetBatch.kinds[0]).toBe(EVENT_KIND_SHOT);
    expect(targetBatch.buttons[0]).toBe(0);

    cleanup();
  });

  it("uses the Pointer Lock mousemove contract without clipping at viewport edges", () => {
    const ring = createInputRingBuffer(32);
    const targetBatch = createRawInputBatchTarget(32);
    const listeners: Record<string, (ev: unknown) => void> = {};
    const mockTarget = {
      addEventListener: (type: string, listener: (ev: unknown) => void) => {
        listeners[type] = listener;
      },
      removeEventListener: (type: string) => {
        delete listeners[type];
      },
    };

    const cleanup = attachInputListener(
      mockTarget as unknown as EventTarget,
      ring,
      POINTER_LOCK_MOVEMENT_SOURCE,
    );

    expect(listeners.mousemove).toBeDefined();
    listeners.mousemove!({
      movementX: -2_400,
      movementY: 1_600,
      timeStamp: 7,
    });

    const stats = ring.drainInto(targetBatch);
    expect(stats.drainedCount).toBe(1);
    expect(targetBatch.dx[0]).toBe(-2_400);
    expect(targetBatch.dy[0]).toBe(1_600);

    cleanup();
  });

  it("drops gameplay movement and shots while capture is gated off but preserves invalidations", () => {
    const ring = createInputRingBuffer(32);
    const targetBatch = createRawInputBatchTarget(32);
    const listeners: Record<string, (ev: unknown) => void> = {};
    let gameplayCaptureActive = false;

    const mockTarget = {
      addEventListener: (type: string, listener: (ev: unknown) => void) => {
        listeners[type] = listener;
      },
      removeEventListener: (type: string) => {
        delete listeners[type];
      },
    };

    const cleanup = attachInputListener(
      mockTarget as unknown as EventTarget,
      ring,
      "pointermove",
      { shouldCaptureGameplayInput: () => gameplayCaptureActive },
    );

    listeners["pointermove"]!({
      movementX: 40,
      movementY: -20,
      timeStamp: 1,
    });
    listeners["mousedown"]!({ button: 0, timeStamp: 2 });
    listeners["blur"]!({ timeStamp: 3 });

    let stats = ring.drainInto(targetBatch);
    expect(stats.drainedCount).toBe(1);
    expect(targetBatch.kinds[0]).toBe(EVENT_KIND_INVALIDATE);

    gameplayCaptureActive = true;
    listeners["pointermove"]!({ movementX: 12, movementY: 6, timeStamp: 4 });
    listeners["mousedown"]!({ button: 0, timeStamp: 5 });

    stats = ring.drainInto(targetBatch);
    expect(stats.drainedCount).toBe(2);
    expect(targetBatch.kinds[0]).toBe(EVENT_KIND_MOVE);
    expect(targetBatch.kinds[1]).toBe(EVENT_KIND_SHOT);

    cleanup();
  });
});

describe("Pointer Lock Controller & Raw Input Fallbacks", () => {
  it("requests unadjustedMovement pointer lock with graceful fallback", async () => {
    const controller: PointerLockController = createPointerLockController();

    let requestedOptions: unknown = null;
    const mockElement = {
      requestPointerLock: vi.fn(async (opts?: unknown) => {
        requestedOptions = opts;
      }),
    };

    const res = await controller.requestLock(
      mockElement as unknown as HTMLElement,
      {
        unadjustedMovement: true,
      },
    );

    expect(mockElement.requestPointerLock).toHaveBeenCalled();
    expect(requestedOptions).toEqual({ unadjustedMovement: true });
    expect(res.rawRequested).toBe(true);
    expect(res.rawGranted).toBe(true);
    expect(controller.hasUnadjustedSupport()).toBe(true);
  });

  it("does not claim raw input for legacy void-returning pointer lock", async () => {
    const controller = createPointerLockController();
    const mockElement = {
      requestPointerLock: vi.fn(() => undefined),
    };

    const result = await controller.requestLock(
      mockElement as unknown as HTMLElement,
      { unadjustedMovement: true },
    );

    expect(result).toEqual({ rawRequested: true, rawGranted: false });
    expect(controller.hasUnadjustedSupport()).toBe(false);
  });

  it("falls back to standard pointer lock if unadjustedMovement rejects with error", async () => {
    const controller = createPointerLockController();

    let callCount = 0;
    const mockElement = {
      requestPointerLock: vi.fn(async (opts?: unknown) => {
        callCount++;
        if (callCount === 1 && opts !== undefined) {
          throw new Error("unadjustedMovement not supported");
        }
      }),
    };

    const res = await controller.requestLock(
      mockElement as unknown as HTMLElement,
      {
        unadjustedMovement: true,
      },
    );

    expect(callCount).toBe(2);
    expect(res.rawRequested).toBe(true);
    expect(res.rawGranted).toBe(false);
  });

  it("does not fall back to sensitivity-changing adjusted movement when disabled", async () => {
    const controller = createPointerLockController();
    const requestPointerLock = vi.fn(async () => {
      throw new Error("unadjustedMovement not supported");
    });

    const result = await controller.requestLock(
      { requestPointerLock } as unknown as HTMLElement,
      {
        unadjustedMovement: true,
        fallbackToAdjustedMovement: false,
      },
    );

    expect(requestPointerLock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ rawRequested: true, rawGranted: false });
  });
});
