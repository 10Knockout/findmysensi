import { CanonicalInputEvent, createMoveEvent, createShotEvent, createInvalidateEvent, InvalidationReason } from "./types.js";
import { createShotTracker, ShotStateTracker } from "./shot.js";
import { toFixed } from "../fixed/range.js";

const MAX_EVENTS_PER_TICK = 256; // Protects against >8000 Hz or malicious flooding

export class InputSequencer {
  private currentTick: number = 0;
  private currentOrder: number = 0;
  private shotTracker: ShotStateTracker;
  private buffer: CanonicalInputEvent[] = [];
  private isValid: boolean = true;

  constructor() {
    this.shotTracker = createShotTracker();
  }

  public beginTick(tick: number): void {
    if (tick < this.currentTick) {
      this.pushInvalidate(tick, "client_desync");
    }
    this.currentTick = tick;
    this.currentOrder = 0;
  }

  public pushMove(dxRaw: number, dyRaw: number): void {
    if (!this.isValid) return;
    if (this.currentOrder >= MAX_EVENTS_PER_TICK) {
      this.pushInvalidate(this.currentTick, "buffer_overflow");
      return;
    }
    
    // Discard 0,0 moves
    if (dxRaw === 0 && dyRaw === 0) return;

    this.buffer.push(createMoveEvent(
      this.currentTick,
      this.currentOrder++,
      toFixed(dxRaw),
      toFixed(dyRaw)
    ));
  }

  public pushButton(isDown: boolean): void {
    if (!this.isValid) return;
    if (this.currentOrder >= MAX_EVENTS_PER_TICK) {
      this.pushInvalidate(this.currentTick, "buffer_overflow");
      return;
    }

    const fired = this.shotTracker.processButton(isDown);
    if (fired) {
      this.buffer.push(createShotEvent(this.currentTick, this.currentOrder++));
    }
  }

  public pushInvalidate(tick: number, reason: InvalidationReason): void {
    if (!this.isValid) return; // Already invalid
    this.isValid = false;
    this.buffer.push(createInvalidateEvent(tick, this.currentOrder++, reason));
  }

  public drain(): CanonicalInputEvent[] {
    const events = this.buffer;
    this.buffer = [];
    return events;
  }
}
