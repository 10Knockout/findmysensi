export type Tick = number & { readonly __brand: "Tick" };
export type Sequence = number & { readonly __brand: "Sequence" };

export function createTick(value: number): Tick {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid Tick: ${value}. Must be a non-negative safe integer.`,
    );
  }
  return value as Tick;
}

export function createSequence(value: number): Sequence {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(
      `Invalid Sequence: ${value}. Must be a non-negative safe integer.`,
    );
  }
  return value as Sequence;
}
