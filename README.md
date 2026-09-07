# FindMySensi

A fast, deterministic, low-end-friendly browser aim trainer and sensitivity
calibration engine.

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL%202.0-brightgreen.svg)](./LICENSE)

## Features

- **Deterministic simulation** — 24-bit fixed-angle math, seeded PRNG,
  integer tick engine with exact bit-level replay determinism
- **Raw mouse input** — Pointer Lock with `unadjustedMovement`, support
  for polling rates from 125 Hz to 8000 Hz
- **Low-end friendly** — Canvas2D renderer with Potato/Low/Balanced/High
  presets, targeting 60 FPS on Intel i3 7th-gen class hardware
- **Sensitivity tools** — converter, calibration, Battle mode, Mouse Swap
- **Crosshair editor** — presets, share codes, low-contrast warnings
- **Open scoring** — transparent public scoring rules, no hidden modifiers

## Quick Start

```bash
# Prerequisites: Node.js >= 22
npm ci
npm run dev --workspace=apps/web
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
findmysensi/
  apps/
    web/              # Next.js App Router (port 3000)
  packages/
    protocol/         # Branded types, binary codecs, API schemas
    aim-core/         # Deterministic tick engine and simulation
    input-browser/    # Pointer Lock, ring buffer, input processing
    render-canvas/    # Canvas2D renderer and viewport transforms
    performance/      # Presets, frame/input measurement
    scenarios/        # Grid, Pinpoint, Multi, Headline, etc.
    analytics/        # Diagnostic metrics (separate from score)
    scoring/          # Public bounded-integer scoring
  tests/
    architecture/     # Workspace and boundary integrity
    browser/          # Bundle and practice tests
    golden/           # Deterministic replay fixtures
    performance/      # Input harness benchmarks
  tools/
    architecture/     # Boundary check scripts
    benchmark/        # Cadence and runtime benchmarks
    reference/        # Independent reference implementations
```

## Architecture

FindMySensi uses a two-repository architecture:

- **This repository** (public, MPL-2.0): Website, aim engine, input,
  rendering, scenarios, scoring, and sensitivity tools.
- **Private repository**: Authentication, database, ranked verification,
  encryption, risk/anti-cheat, admin, and privacy logic.

The browser calls same-origin `/api/*` URLs. Next.js rewrites those requests to
the private service configured by `API_URL`; local development defaults to the
secure API on port 4000. Production builds fail when that origin is missing.

See [GOVERNANCE.md](./GOVERNANCE.md) for decision-making processes and
[CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## Development

```bash
npm ci                    # Clean install
npm run format:check      # Prettier
npm run lint              # ESLint
npm run typecheck         # TypeScript (all packages)
npm test                  # Vitest (all tests)
npm run build             # Build all workspaces
npm run check:boundaries  # Architecture boundary enforcement
```

## License

[Mozilla Public License 2.0](./LICENSE)
