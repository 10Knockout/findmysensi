export class CanonicalReader {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;

  constructor(buffer: Uint8Array) {
    this.buffer = buffer;
    this.view = new DataView(
      buffer.buffer,
      buffer.byteOffset,
      buffer.byteLength,
    );
  }

  private ensureAvailable(neededBytes: number): void {
    if (neededBytes < 0) {
      throw new RangeError(
        `Invalid byte count: ${neededBytes}. Must be non-negative.`,
      );
    }
    if (this.offset + neededBytes > this.buffer.byteLength) {
      throw new RangeError(
        `Unexpected end of buffer: requested ${neededBytes} bytes at offset ${this.offset}, but total length is ${this.buffer.byteLength}.`,
      );
    }
  }

  public u8(): number {
    this.ensureAvailable(1);
    const value = this.view.getUint8(this.offset);
    this.offset += 1;
    return value;
  }

  public u16(): number {
    this.ensureAvailable(2);
    const value = this.view.getUint16(this.offset, true); // little-endian
    this.offset += 2;
    return value;
  }

  public u32(): number {
    this.ensureAvailable(4);
    const value = this.view.getUint32(this.offset, true); // little-endian
    this.offset += 4;
    return value;
  }

  public i32(): number {
    this.ensureAvailable(4);
    const value = this.view.getInt32(this.offset, true); // little-endian
    this.offset += 4;
    return value;
  }

  public bytes(length: number): Uint8Array {
    this.ensureAvailable(length);
    const slice = this.buffer.slice(this.offset, this.offset + length);
    this.offset += length;
    return slice;
  }

  public remaining(): number {
    return this.buffer.byteLength - this.offset;
  }

  public isExhausted(): boolean {
    return this.offset === this.buffer.byteLength;
  }

  public assertExhausted(): void {
    if (!this.isExhausted()) {
      throw new Error(
        `Buffer has ${this.remaining()} unread trailing bytes at offset ${this.offset} (total length: ${this.buffer.byteLength}).`,
      );
    }
  }
}
