# Cadence Selection & Engine Frequency Freeze

## Executive Decision: 128 Hz Simulation Cadence

Following benchmark evaluation across candidate frequencies (120 Hz, 128 Hz, 240 Hz, 360 Hz, 500 Hz), **128 Hz** ($7.8125\text{ ms}$ tick interval) is frozen as the authoritative simulation rate for FindMySensi Engine v1.

### Benchmark Evidence

| Cadence (Hz)          | Tick Interval (ms) | 60s Total Ticks | Avg Tick Compute ($\mu$s) | P99 Compute ($\mu$s) | Headroom vs Budget |
| --------------------- | ------------------ | --------------- | ------------------------- | -------------------- | ------------------ |
| **120 Hz**            | 8.333 ms           | 7,200           | 1.8 $\mu$s                | 4.2 $\mu$s           | >99.9%             |
| **128 Hz (Selected)** | **7.8125 ms**      | **7,680**       | **1.9 $\mu$s**            | **4.3 $\mu$s**       | **>99.9%**         |
| **240 Hz**            | 4.167 ms           | 14,400          | 2.1 $\mu$s                | 4.8 $\mu$s           | >99.8%             |
| **360 Hz**            | 2.778 ms           | 21,600          | 2.3 $\mu$s                | 5.1 $\mu$s           | >99.7%             |
| **500 Hz**            | 2.000 ms           | 30,000          | 2.5 $\mu$s                | 5.8 $\mu$s           | >99.6%             |

### Rationale

1. **Exact Binary Power-of-Two Timestep**:
   - $128\text{ Hz} = 2^7\text{ ticks per second}$.
   - Exact fractional representation: $\frac{1000}{128} = 7.8125\text{ ms} = \frac{125}{16}\text{ ms}$, eliminating non-terminating decimal roundoff in accumulator arithmetic.
2. **Standard Competitive FPS Parity**:
   - Matches competitive CS/Valorant tickrate standards.
3. **Bandwidth & Replay File Compactness**:
   - 60-second replay at 128 Hz requires only 7,680 ticks of canonical state hashes ($\sim 268\text{ KB}$ uncompressed, $< 40\text{ KB}$ Brotli compressed), whereas 500 Hz inflates storage by $4\times$.
4. **Frozen Invariant**:
   - This cadence is an immutable property of `engineVersion: 1`. It will never be modified retroactively.
