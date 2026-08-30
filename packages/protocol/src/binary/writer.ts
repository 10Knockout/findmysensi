export interface CanonicalWriterInterface {
  u8(value: number): void;
  u16(value: number): void;
  u32(value: number): void;
  i32(value: number): void;
  bytes(value: Uint8Array): void;
  finish(): Uint8Array;
}

export class CanonicalWriter implements CanonicalWriterInterface {
  private buffer: Uint8Array;
  private view: DataView;
  private offset: number = 0;

  constructor(initialCapacity: number = 256) {
    this.buffer = new Uint8Array(Math.max(16, initialCapacity));
    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength,
    );
  }

  private ensureCapacity(neededBytes: number): void {
    if (this.offset + neededBytes <= this.buffer.byteLength) {
      return;
    }
    let newCapacity = this.buffer.byteLength * 2;
    while (this.offset + neededBytes > newCapacity) {
      newCapacity *= 2;
    }
    const newBuffer = new Uint8Array(newCapacity);
    newBuffer.set(this.buffer);
    this.buffer = newBuffer;
    this.view = new DataView(
      this.buffer.buffer,
      this.buffer.byteOffset,
      this.buffer.byteLength,
    );
  }

  public u8(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      throw new RangeError(
        `Value ${value} is out of bounds for unsigned 8-bit integer [0, 255].`,
      );
    }
    this.ensureCapacity(1);
    this.view.setUint8(this.offset, value);
    this.offset += 1;
  }

  public u16(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 65535) {
      throw new RangeError(
        `Value ${value} is out of bounds for unsigned 16-bit integer [0, 65535].`,
      );
    }
    this.ensureCapacity(2);
    this.view.setUint16(this.offset, value, true); // little-endian
    this.offset += 2;
  }

  public u32(value: number): void {
    if (!Number.isInteger(value) || value < 0 || value > 4294967295) {
      throw new RangeError(
        `Value ${value} is out of bounds for unsigned 32-bit integer [0, 4294967295].`,
      );
    }
    this.ensureCapacity(4);
    this.view.setUint32(this.offset, value, true); // little-endian
    this.offset += 4;
  }

  public i32(value: number): void {
    if (!Number.isInteger(value) || value < -2147483648 || value > 2147483647) {
      throw new RangeError(
        `Value ${value} is out of bounds for signed 32-bit integer [-2147483648, 2147483647].`,
      );
    }
    this.ensureCapacity(4);
    this.view.setInt32(this.offset, value, true); // little-endian
    this.offset += 4;
  }

  public bytes(value: Uint8Array): void {
    this.ensureCapacity(value.byteLength);
    this.buffer.set(value, this.offset);
    this.offset += value.byteLength;
  }

  public finish(): Uint8Array {
    return this.buffer.slice(0, this.offset);
  }
}
