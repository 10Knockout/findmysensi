import { createTick, Tick } from "@findmysensi/protocol";
import {
  AngleUnits,
  createAngleUnits,
  createPitchUnits,
  PitchUnits,
} from "../fixed/angle.js";

export interface RenderSnapshotView {
  readonly tick: Tick;
  readonly targetCount: number;
  readonly targetId: Int32Array;
  readonly targetX: Int32Array;
  readonly targetY: Int32Array;
  readonly targetRadius: Int32Array;
  readonly playerYaw: AngleUnits;
  readonly playerPitch: PitchUnits;
}

class InternalSnapshotSlot {
  public tick: Tick = createTick(0);
  public playerYaw: AngleUnits = createAngleUnits(0);
  public playerPitch: PitchUnits = createPitchUnits(0);
  public targetCount: number = 0;
  public readonly targetId: Int32Array;
  public readonly targetX: Int32Array;
  public readonly targetY: Int32Array;
  public readonly targetRadius: Int32Array;
  public readonly preallocatedView: {
    tick: Tick;
    playerYaw: AngleUnits;
    playerPitch: PitchUnits;
    targetCount: number;
    readonly targetId: Int32Array;
    readonly targetX: Int32Array;
    readonly targetY: Int32Array;
    readonly targetRadius: Int32Array;
  };

  constructor(capacity: number) {
    this.targetId = new Int32Array(capacity);
    this.targetX = new Int32Array(capacity);
    this.targetY = new Int32Array(capacity);
    this.targetRadius = new Int32Array(capacity);

    this.preallocatedView = {
      tick: this.tick,
      playerYaw: this.playerYaw,
      playerPitch: this.playerPitch,
      targetCount: this.targetCount,
      targetId: this.targetId,
      targetX: this.targetX,
      targetY: this.targetY,
      targetRadius: this.targetRadius,
    };
  }

  public toView(): RenderSnapshotView {
    this.preallocatedView.tick = this.tick;
    this.preallocatedView.playerYaw = this.playerYaw;
    this.preallocatedView.playerPitch = this.playerPitch;
    this.preallocatedView.targetCount = this.targetCount;
    return this.preallocatedView;
  }
}

export interface SnapshotBuffer {
  beginWrite(tick: Tick, playerYaw: AngleUnits, playerPitch: PitchUnits): void;
  writeTarget(id: number, x: number, y: number, radius: number): void;
  endWrite(): void;
  swap(): RenderSnapshotView;
  getLatest(): RenderSnapshotView;
}

export class DoubleBufferedSnapshotManager implements SnapshotBuffer {
  private readonly bufferA: InternalSnapshotSlot;
  private readonly bufferB: InternalSnapshotSlot;
  private writeBuffer: InternalSnapshotSlot;
  private readBuffer: InternalSnapshotSlot;
  private isWriting: boolean = false;
  private readonly maxCapacity: number;

  constructor(maxTargets: number = 64) {
    this.maxCapacity = Math.max(8, maxTargets);
    this.bufferA = new InternalSnapshotSlot(this.maxCapacity);
    this.bufferB = new InternalSnapshotSlot(this.maxCapacity);
    this.writeBuffer = this.bufferA;
    this.readBuffer = this.bufferB;
  }

  public beginWrite(
    tick: Tick,
    playerYaw: AngleUnits,
    playerPitch: PitchUnits,
  ): void {
    this.isWriting = true;
    this.writeBuffer.tick = tick;
    this.writeBuffer.playerYaw = playerYaw;
    this.writeBuffer.playerPitch = playerPitch;
    this.writeBuffer.targetCount = 0;
  }

  public writeTarget(id: number, x: number, y: number, radius: number): void {
    if (!this.isWriting) {
      throw new Error(
        "Cannot writeTarget outside of an active beginWrite/endWrite block.",
      );
    }
    const idx = this.writeBuffer.targetCount;
    if (idx >= this.maxCapacity) {
      return;
    }
    this.writeBuffer.targetId[idx] = id;
    this.writeBuffer.targetX[idx] = x;
    this.writeBuffer.targetY[idx] = y;
    this.writeBuffer.targetRadius[idx] = radius;
    this.writeBuffer.targetCount++;
  }

  public endWrite(): void {
    this.isWriting = false;
  }

  public swap(): RenderSnapshotView {
    if (this.isWriting) {
      throw new Error(
        "Cannot swap snapshot buffer while a write is actively in progress.",
      );
    }
    const temp = this.readBuffer;
    this.readBuffer = this.writeBuffer;
    this.writeBuffer = temp;
    return this.readBuffer.toView();
  }

  public getLatest(): RenderSnapshotView {
    return this.readBuffer.toView();
  }
}

export function createSnapshotBuffer(maxTargets: number = 64): SnapshotBuffer {
  return new DoubleBufferedSnapshotManager(maxTargets);
}
