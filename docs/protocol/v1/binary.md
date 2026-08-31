# Protocol V1: Binary Format

This specifies the binary encoding for simulation ticks and Ranked gameplay.

## Endianness

All multi-byte integers are encoded in Little-Endian format.

## Structures

### Tick Message (Client to Server)

- Size: 12 bytes
- Fields:
  - `tick` (UInt32, 4 bytes): Absolute simulation tick index.
  - `dx` (Int32, 4 bytes): Mouse delta X.
  - `dy` (Int32, 4 bytes): Mouse delta Y.

### State Snapshot (Server to Client)

- Size: Varies
- Fields:
  - `lastProcessedTick` (UInt32, 4 bytes)
  - `targetCount` (UInt8, 1 byte)
  - For each target:
    - `id` (UInt32, 4 bytes)
    - `x` (Float32, 4 bytes)
    - `y` (Float32, 4 bytes)
