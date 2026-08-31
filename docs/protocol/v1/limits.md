# Protocol V1: Limits

Hardcoded limits for Protocol V1 bounds to prevent DoS or simulation overflows.

- Max Request Body Size (JSON): 10 KB
- Max WebSocket Message Size (Binary): 1 KB
- Max Ticks Per Second (Cadence): Configured by `docs/decisions/cadence.json` (provisional 128 Hz)
- Max Inputs Per Tick: 10
