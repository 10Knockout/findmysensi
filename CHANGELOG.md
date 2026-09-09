# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-09-10

First public release. Everything below is live on `main` and deployed.

### Added

- **12 trainer modes** on one deterministic Canvas2D runtime: Grid Rush, Multi
  Burst, Precision Six, Anchor Flick, Microshot, Motion Flick, Reflex Rush,
  Headshot Lane, 180 Flick, Strafe Track, Smooth Track, Switch Track — each
  with its own scenario engine, scoring formula, and metrics family.
- **Find My Sensi** — blinded, counterbalanced, confidence-scored sensitivity
  calibration across a five-block live flow; one canonical FindMySensi scale.
- **Workouts** — fixed 4-workout catalog; deterministic recommended-next-drill.
- **Monthly per-mode leaderboards** — every practice run lands on a public
  board (`modeId:scenario-<sv>:scoring-<scv>:season-<YYYY-MM>`), UTC seasons,
  pagination, per-row accuracy, `/leaderboards` hub, homepage carousel.
- **Profile** — 12 avatar presets, rank-derived frames + titles, 25
  deterministic achievements; `/app/profile`.
- **Ephemeral post-run movement heatmap** for click-discrete modes — Canvas2D
  scatter of shot placement, miss tally, over/under-flick; React-only, never
  stored, gone on reload.
- **Switch Track hold-to-fire** — damage accrues only while the primary button
  is held (`scoringVersion` 1); a new `fire-state` canonical input event
  through the ring buffer, reducer, adapter, and run controller.

### Security

- Per-mode **impossible-value anti-cheat gate** on `POST /api/v2/runs` — 422 on
  physically impossible score / KPS / accuracy / hit-count / duration, before
  storage.
- **Rate limiting** on `/api/v2/*` — 30/min run submits, 120/min leaderboard
  reads, per client IP.
- **Content-Security-Policy** on the public app — per-request nonce +
  `'strict-dynamic'` (`apps/web/proxy.ts`), no `'unsafe-inline'` on scripts.
- **HSTS** on the web app and the API (`max-age=63072000; includeSubDomains`).
- Branded 404 / error boundaries with no framework detail; error-surface audit
  test guaranteeing routes never echo a caught exception's message or stack.
- `npm audit --omit=dev` release cadence documented in `SECURITY.md`.

### Foundation

- Reproducible npm workspace, architecture boundary tests, 24-bit fixed-angle
  deterministic math with xoshiro128\*\* PRNG, binary protocol reader/writer,
  Pointer Lock capture with a coalescing ring buffer, Canvas2D renderer.

### Deferred past 1.0

- Server-verified competition pipeline (M15) — the leaderboard is
  trust-the-client with the impossible-value gate; bounded input-proof
  verification is the scoped successor and needs the deterministic sim
  packages published first.
