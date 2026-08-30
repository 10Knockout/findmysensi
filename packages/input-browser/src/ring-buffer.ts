export const EVENT_KIND_MOVE = 1;
export const EVENT_KIND_SHOT = 2;
export const EVENT_KIND_INVALIDATE = 3;

export type EventKindCode =
  | typeof EVENT_KIND_MOVE
  | typeof EVENT_KIND_SHOT
  | typeof EVENT_KIND_INVALIDATE;

export interface PushResult {
  readonly accepted: boolean;
  readonly overflow: boolean;
}

export interface DrainStats {
  readonly drainedCount: number;
  readonly highWaterMark: number;
  readonly overflowCount: number;
  readonly lostTemporalPrecision: boolean;
}

export interface RawInputBatchTarget {
  count: number;
  readonly kinds: Uint8Array;
  readonly dx: Int32Array;
  readonly dy: Int32Array;
  readonly timeIndices: Float64Array;
  readonly buttons: Uint8Array;
}

export function createRawInputBatchTarget(
  capacity: number,
): RawInputBatchTarget {
  const cap = Math.max(2, capacity);
  return {
    count: 0,
    kinds: new Uint8Array(cap),
    dx: new Int32Array(cap),
    dy: new Int32Array(cap),
    timeIndices: new Float64Array(cap),
    buttons: new Uint8Array(cap),
  };
}

export interface InputRingBuffer {
  pushMove(dx: number, dy: number, timeIndex: number): PushResult;
  pushShot(button: number, timeIndex: number): PushResult;
  pushInvalidate(reasonCode: number, timeIndex: number): PushResult;
  drainInto(target: RawInputBatchTarget): DrainStats;
  getHighWaterMark(): number;
  reset(): void;
}

export class PreallocatedInputRingBuffer implements InputRingBuffer {
  private readonly capacity: number;
  private readonly kinds: Uint8Array;
  private readonly dx: Int32Array;
  private readonly dy: Int32Array;
  private readonly timeIndices: Float64Array;
  private readonly buttons: Uint8Array;

  private head: number = 0; // write index
  private tail: number = 0; // read index
  private size: number = 0;
  private highWaterMark: number = 0;
  private overflowCount: number = 0;
  private lostTemporalPrecision: boolean = false;

  constructor(capacity: number = 4096) {
    this.capacity = Math.max(2, capacity);
    this.kinds = new Uint8Array(this.capacity);
    this.dx = new Int32Array(this.capacity);
    this.dy = new Int32Array(this.capacity);
    this.timeIndices = new Float64Array(this.capacity);
    this.buttons = new Uint8Array(this.capacity);
  }

  public pushMove(dx: number, dy: number, timeIndex: number): PushResult {
    // If buffer is full, coalesce with last written move event if possible to preserve total delta
    if (this.size >= this.capacity) {
      this.overflowCount++;
      this.lostTemporalPrecision = true;

      const lastIdx = (this.head - 1 + this.capacity) % this.capacity;
      if (this.kinds[lastIdx] === EVENT_KIND_MOVE) {
        this.dx[lastIdx] = (this.dx[lastIdx] ?? 0) + Math.round(dx);
        this.dy[lastIdx] = (this.dy[lastIdx] ?? 0) + Math.round(dy);
        this.timeIndices[lastIdx] = timeIndex;
        return { accepted: true, overflow: true };
      }
      return { accepted: false, overflow: true };
    }

    const idx = this.head;
    this.kinds[idx] = EVENT_KIND_MOVE;
    this.dx[idx] = Math.round(dx);
    this.dy[idx] = Math.round(dy);
    this.timeIndices[idx] = timeIndex;
    this.buttons[idx] = 0;

    this.head = (this.head + 1) % this.capacity;
    this.size++;
    if (this.size > this.highWaterMark) {
      this.highWaterMark = this.size;
    }

    return { accepted: true, overflow: false };
  }

  public pushShot(button: number, timeIndex: number): PushResult {
    if (this.size >= this.capacity) {
      this.overflowCount++;
      this.lostTemporalPrecision = true;
      return { accepted: false, overflow: true };
    }

    const idx = this.head;
    this.kinds[idx] = EVENT_KIND_SHOT;
    this.dx[idx] = 0;
    this.dy[idx] = 0;
    this.timeIndices[idx] = timeIndex;
    this.buttons[idx] = button;

    this.head = (this.head + 1) % this.capacity;
    this.size++;
    if (this.size > this.highWaterMark) {
      this.highWaterMark = this.size;
    }

    return { accepted: true, overflow: false };
  }

  public pushInvalidate(reasonCode: number, timeIndex: number): PushResult {
    if (this.size >= this.capacity) {
      this.overflowCount++;
      this.lostTemporalPrecision = true;
      return { accepted: false, overflow: true };
    }

    const idx = this.head;
    this.kinds[idx] = EVENT_KIND_INVALIDATE;
    this.dx[idx] = 0;
    this.dy[idx] = 0;
    this.timeIndices[idx] = timeIndex;
    this.buttons[idx] = reasonCode;

    this.head = (this.head + 1) % this.capacity;
    this.size++;
    if (this.size > this.highWaterMark) {
      this.highWaterMark = this.size;
    }

    return { accepted: true, overflow: false };
  }

  public drainInto(target: RawInputBatchTarget): DrainStats {
    const countToDrain = this.size;
    target.count = 0;

    for (let i = 0; i < countToDrain; i++) {
      const srcIdx = this.tail;
      const dstIdx = i;

      target.kinds[dstIdx] = this.kinds[srcIdx] ?? 0;
      target.dx[dstIdx] = this.dx[srcIdx] ?? 0;
      target.dy[dstIdx] = this.dy[srcIdx] ?? 0;
      target.timeIndices[dstIdx] = this.timeIndices[srcIdx] ?? 0;
      target.buttons[dstIdx] = this.buttons[srcIdx] ?? 0;

      this.tail = (this.tail + 1) % this.capacity;
    }

    target.count = countToDrain;
    this.size = 0;

    const stats: DrainStats = {
      drainedCount: countToDrain,
      highWaterMark: this.highWaterMark,
      overflowCount: this.overflowCount,
      lostTemporalPrecision: this.lostTemporalPrecision,
    };

    // Reset transient overflow tracking for next drain cycle
    this.overflowCount = 0;
    this.lostTemporalPrecision = false;

    return stats;
  }

  public getHighWaterMark(): number {
    return this.highWaterMark;
  }

  public reset(): void {
    this.head = 0;
    this.tail = 0;
    this.size = 0;
    this.highWaterMark = 0;
    this.overflowCount = 0;
    this.lostTemporalPrecision = false;
  }
}

export function createInputRingBuffer(
  capacity: number = 4096,
): InputRingBuffer {
  return new PreallocatedInputRingBuffer(capacity);
}
