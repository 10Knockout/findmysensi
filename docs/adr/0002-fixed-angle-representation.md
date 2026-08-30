# ADR 0002: Deterministic Fixed-Angle Representation

## Status

Approved

## Context

Standard floating-point angles (such as radians or degrees in `float64` / `number`) introduce platform-dependent precision discrepancies across different JS engines (V8, JavaScriptCore, SpiderMonkey), instruction sets (x86 vs ARM NEON), and compiler optimization flags. Even a 1-bit ulp divergence in trigonometric operations or cumulative angular accumulation can cause target hit calculations to diverge during server-side deterministic replay.

## Decision

1. **Discrete Angular Domain**:
   - A full circle (360 degrees) is divided into exactly $2^{24} = 16,777,216$ discrete `AngleUnits`.
   - Resolution: $\frac{360^\circ}{16,777,216} \approx 0.000021457^\circ$ (~0.0772 arcseconds), well exceeding human mouse sensor resolution at all supported DPIs.
   - Half turn (180 degrees) is $8,388,608$ `AngleUnits`.
   - Quarter turn (90 degrees) is $4,194,304$ `AngleUnits`.

2. **Integer Wrapping & Arithmetic**:
   - Yaw wraps seamlessly in $[0, 2^{24} - 1]$ via bitwise mask `value & (FULL_TURN_UNITS - 1)`.
   - Pitch is strictly clamped to valid vertical bounds (default $[-QUARTER_TURN_UNITS + \epsilon, QUARTER_TURN_UNITS - \epsilon]$) to prevent gimbal flips.
   - All arithmetic uses integer operations. Float inputs or non-integers are rejected with `RangeError`.

3. **Authoritative Engine Boundary**:
   - The authoritative simulation in `@findmysensi/aim-core` operates exclusively in `AngleUnits` and fixed coordinates.
   - Floating-point conversions occur only at presentation boundaries (renderers) and never feed back into simulation state.

## Consequences

- **Positive**: Exact bit-level deterministic simulation and replay across every browser and server runtime; fast integer arithmetic with bitwise wrapping.
- **Negative**: Renderers and sensitivity calculators must perform explicit conversions at the presentation boundary.
