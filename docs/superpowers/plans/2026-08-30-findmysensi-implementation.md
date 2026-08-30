# FindMySensi Public Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the MPL-2.0 public website, deterministic aim-training runtime, sensitivity tools, public protocol packages, local mock API, and release evidence without importing or exposing private-service implementation.

**Architecture:** The public repository is an npm-workspace monorepo containing a Next.js App Router application and focused TypeScript packages. Authoritative gameplay is a pure tick-driven fixed-point kernel; browser input and rendering are adapters. Cross-repository behavior travels only through immutable published packages and the same-origin `/api/v1/*` contract.

**Tech Stack:** Node.js 22.x, npm workspaces, TypeScript strict mode, Next.js/React, Zod, Vitest/Fast-check, Playwright, Canvas2D, Web Crypto, GitHub Actions, MPL-2.0.

**Spec:** `docs/superpowers/specs/2026-08-30-findmysensi-design.md`

**Private companion plan:** `findmysensi-secure/docs/superpowers/plans/2026-08-30-findmysensi-secure-implementation.md` in the independent private repository. This is a documentation reference, never a filesystem dependency.

## Global Constraints

- `F:\Dev\findmysensi` remains a non-Git parent; this repository and `findmysensi-secure` remain independent Git repositories.
- Never add a sibling path, `file:`, `link:`, workspace link, Turso client, production migration, Better Auth server code, private heuristic, or production secret here.
- Browser API calls are relative same-origin `/api/v1/*`; local routing targets `:4000`, and the mock API is an explicit development-only target on `:4100` that production builds reject.
- The Protocol V1 Freeze and its human/security approval block Ranked-capable codecs, adapters, and endpoints.
- `aim-core` consumes integer ticks plus explicitly ordered canonical events, never browser timestamps, DOM state, ambient randomness, or renderer state.
- Input aggregation never crosses a shot or semantic boundary. Replay-destroying overflow invalidates/downgrades Ranked and reaches verification metadata.
- Authoritative geometry uses checked integer/fixed-point operations, versioned PRNGs, LUTs, or specified deterministic approximations; no implementation-dependent transcendental `Math.*` calls.
- Render snapshots are logically immutable and backed by preallocated/double-buffered storage.
- Canonical hashes use exact binary order, width, signedness, framing, and endianness; JSON serialization is forbidden.
- Simulation cadence and every ranked numeric maximum remain unbound until approved `OpenDecisionRecord` evidence exists; the current 128 Hz document/code is provisional.
- UI implementation is blocked per approval wave until a human approves responsive hierarchy, interaction states, accessibility, and the 1280×720 composition.
- React hot-path mouse/tick data stays outside React state; use refs or external runtime objects. RSC-to-client props contain only fields actually rendered. Local storage keys are versioned, minimal, validated, and exception-safe.
- Behavioral work follows red-green-refactor. Critical determinism/protocol/security/a11y/720p checks never become green through retries.
- Every development-server start triggers browser rendering, console, control, primary-flow, screenshot, desktop, and mobile-size verification.

## Execution Map and Hard Gates

```text
P0 clean baseline
 -> P1 repository/governance
 -> P1B browser/a11y test foundation
 -> P2 measured OpenDecisionRecords
 -> P3 Protocol V1 Freeze [HUMAN + SECURITY APPROVAL]
 -> P4 protocol implementation + immutable RC handshake
 -> P5-P9 deterministic Practice kernel
 -> P10 UI waves A/B [HUMAN APPROVAL]
 -> P10B approved visual foundation
 -> P11 public API/mock shell
 -> P12 authenticated Grid Practice
 -> P13-P16 sensitivity/calibration/crosshair
 -> P17 remaining scenarios
 -> P18 UI waves C/D [HUMAN APPROVAL]
 -> P18R coordinated public Ranked client [PRIVATE GATES + HUMAN REVIEW]
 -> P18O SEO/privacy/observability
 -> P19 public RC/release hardening
```

Private auth work may begin after P4 publishes an immutable protocol package. Ranked integration requires public P4-P9 plus private database, ProofStore, and verifier gates. No task may claim the existing prototype is complete merely because its current unit tests pass.

## Current Prototype Disposition

| Area                                                        | Required disposition                                                                                                            |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `package-lock.json`                                         | Regenerate and prove `npm ci`; current lock omits three workspaces.                                                             |
| `docs/benchmarks/cadence-selection.md` and 128 Hz constants | Mark provisional; remeasure through P2 before binding an engine version.                                                        |
| `packages/protocol`                                         | Retain only primitives that pass the approved freeze and independent vectors; replace mismatched domain strings/state coverage. |
| `packages/aim-core`                                         | Audit signed coordinate types, checked arithmetic, full state, snapshot immutability, and duplicate paths before reuse.         |
| `packages/input-browser`                                    | Retain typed-array structure only after run-relative ordering and sticky overflow tests pass.                                   |
| `apps/web` Grid code                                        | Treat as disconnected prototype; wire one authoritative controller in P12.                                                      |
| `tests/browser/*`                                           | Rename unit tests and add real Playwright coverage; current files do not launch a browser.                                      |
| Golden JSON                                                 | Make each vector consumed by CI and independently generated; delete no historical vector silently.                              |

## Executable Subplan Set

The master plan is a dependency and release map. Implementation MUST use the smaller executable plans below; each task in those files owns one red/run/implement/pass/commit cycle and may be reviewed independently.

| Subplan                                                                         | Master coverage        | Independent deliverable                                                                                                                       |
| ------------------------------------------------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/superpowers/plans/2026-08-30-findmysensi-public-foundation-protocol.md`   | P0-P4 plus P1B         | Reproducible workspaces, governance, browser test harness, approved numeric records, frozen Protocol V1, immutable protocol RC handoff        |
| `docs/superpowers/plans/2026-08-30-findmysensi-public-runtime-ranked.md`        | P5-P9, P12, P18R       | One deterministic engine/input/render path, Grid Practice, browser/Node differential parity, and coordinated Ranked client                    |
| `docs/superpowers/plans/2026-08-30-findmysensi-public-sensitivity-crosshair.md` | P13-P16                | Exact sensitivity types/converters, both privacy-reviewed environment keys, calibration, Battle, Mouse Swap, research, and crosshair models   |
| `docs/superpowers/plans/2026-08-30-findmysensi-public-scenarios.md`             | P8 and P17             | Grid plus six separately reviewable scenario/scoring/analytics/seed releases and their decision records                                       |
| `docs/superpowers/plans/2026-08-30-findmysensi-public-web-release.md`           | P10-P11, P18, P18O-P19 | Human-approved visual foundation/routes, API/mock shell, SEO, privacy/observability, browser/hardware evidence, and public release provenance |

---

### Task P0: Establish a Reproducible, Audited Baseline

**Files:**

- Create: `docs/evidence/2026-08-30-preimplementation-baseline.md`
- Create: `tests/architecture/workspace-integrity.spec.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `tsconfig.json`
- Create: `tsconfig.verify.json`, `tools/clean.mjs`
- Modify: `apps/web/package.json`, `packages/{analytics,scenarios,scoring}/package.json`
- Modify: package scripts that reference undeclared `rimraf`

**Interfaces:**

- Produces: `WorkspaceInventory { workspaceNames: string[]; forbiddenDependencies: string[]; lockfileComplete: boolean }`
- Consumes: committed workspace manifests only.

- [ ] **Step 1: Add the failing clean-install and boundary test.** Parse every workspace `package.json`; assert each workspace appears in the root lockfile, public manifests contain none of `@libsql/client`, `drizzle-orm`, `better-auth`, or sibling/file/link dependencies, and every workspace has a `typecheck` script or an explicit non-TypeScript exemption. Do not add the non-composite, `noEmit` Next project as a root `tsc -b` reference.

```ts
expect(inventory.lockfileComplete).toBe(true);
expect(inventory.forbiddenDependencies).toEqual([]);
expect(inventory.workspaceNames).toContain("@findmysensi/web");
```

- [ ] **Step 2: Prove the test and clean install fail for the recorded reason.** Run `npm test -- tests/architecture/workspace-integrity.spec.ts` and `npm ci --dry-run`. Expected: missing analytics/scenarios/scoring lock entries and incomplete workspace typecheck coverage.
- [ ] **Step 3: Regenerate only the lockfile, make root `npm run typecheck` invoke every workspace plus `tsconfig.verify.json`, and replace undeclared cleanup commands with `node tools/clean.mjs`.** `tools/clean.mjs` may remove only resolved workspace-local `dist`, `.next`, and `*.tsbuildinfo` paths. Do not alter gameplay behavior.
- [ ] **Step 4: Record every existing source area as `KEEP_AFTER_TEST`, `REVISE`, `REPLACE`, or `DEFER`, including the known prototype defects from the table above.** Run `npm ci`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`; expected: all pass from a clean checkout.
- [ ] **Step 5: Commit.** `git commit -s -m "chore: establish reproducible public baseline"`

### Task P1: Complete Public Governance and Enforce Repository Boundaries

**Files:**

- Create: `README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `GOVERNANCE.md`, `.env.example`, `THIRD_PARTY_NOTICES.md`
- Create: `.github/CODEOWNERS`, `.github/FUNDING.yml`, `.github/ISSUE_TEMPLATE/{bug,feature,performance,input-problem,training-mode}.yml`
- Create: `docs/security/{severity-rubric,risk-exception-schema}.md`, `docs/evidence/repository-protection.json`
- Create: `tools/architecture/{check-boundaries,check-license-headers,check-secrets}.mjs`
- Modify: `.github/workflows/ci.yml`, `.gitignore`, `package.json`
- Test: `tests/architecture/workspace-integrity.spec.ts`

**Interfaces:**

- Produces: `npm run check:boundaries`, `npm run check:licenses`, and `npm run check:secrets`; each exits `0` when clean and nonzero with a stable machine-readable finding code.

- [ ] **Step 1: Extend the failing architecture test.** Fixture-import `../findmysensi-secure`, `file:../x`, a file under `migrations/`, and `mock-api` from a production entry; assert the checker returns the four codes.
- [ ] **Step 2: Run `npm test -- tests/architecture/workspace-integrity.spec.ts`.** Expected: FAIL because the checker and governance files do not exist.
- [ ] **Step 3: Implement the scanners with `node:fs`, `node:path`, and explicit fixture/source allowlists; add MPL-2.0 SPDX/Exhibit-A enforcement, DCO 1.1 instructions, the product-specific severity rubric and bounded exception fields, complete local-run/security reporting documentation, and placeholder-only `.env.example`.** CI jobs are separate least-privilege format, lint, types, unit, build, boundary, secret, dependency, license, and DCO checks with full-SHA action pins.
- [ ] **Step 4: Run all three scanners and the full verification suite.** Record branch/tag protection, stale-review dismissal, CODEOWNERS, required checks, fork-secret isolation, and no-force-push evidence in `repository-protection.json`; `NOT_CONFIGURED` is allowed during local development but blocks `RELEASE-READY`.
- [ ] **Step 5: Commit.** `git commit -s -m "chore: complete public governance and boundary gates"`

### Task P1B: Install the Browser, Accessibility, and Bundle Test Foundation

**Files:**

- Create: `playwright.config.ts`, `tests/e2e/fixtures.ts`, `tests/a11y/smoke.spec.ts`, `tests/bundle/route-boundary.spec.ts`
- Modify: `package.json`, `package-lock.json`, `.github/workflows/ci.yml`

**Interfaces:**

- Produces: `npm run test:e2e`, `npm run test:a11y`, and `npm run test:bundle`; exact browser/channel/version evidence is emitted under `artifacts/browser-evidence/` and is gitignored.

- [ ] **Step 1: Add failing harness self-tests for missing Chromium, missing axe injection, console errors, and trainer-runtime leakage into `/`.**
- [ ] **Step 2: Run `npm run test:e2e -- --list`, `npm run test:a11y -- --list`, and `npm run test:bundle`.** Expected: FAIL because configuration and scripts do not exist.
- [ ] **Step 3: Add pinned Playwright and axe dependencies, web-server configuration, stable screenshot directories, browser-version capture, and bundle-manifest inspection.** Playwright WebKit is labeled WebKit, never Safari.
- [ ] **Step 4: Run `npx playwright install chromium firefox webkit`, then all three scripts.** Expected: PASS with exact installed engine versions recorded.
- [ ] **Step 5: Commit.** `git commit -s -m "test(web): establish browser accessibility and bundle harnesses"`

### Task P2: Create Measurement Tooling and Close Ranked Numeric Decisions

**Files:**

- Create: `tools/decisions/open-decision.schema.json`, `tools/decisions/validate.mjs`
- Create: `docs/open-decisions/{simulation-cadence,simulation-catch-up,input-bounds,parser-bounds,ranked-transport-limits,renderer-budget}.json`
- Create: `tools/benchmark/browser-input.html`, `tools/benchmark/browser-input.ts`, `tools/benchmark/render.ts`
- Modify: `tools/benchmark/cadence.ts`, `docs/benchmarks/cadence-selection.md`, `package.json`
- Test: `tests/decisions/open-decision.spec.ts`, `tests/performance/input-harness.spec.ts`

**Interfaces:**

- Produces: versioned `OpenDecisionRecord` JSON with owner, candidate set, method, environment, predeclared criteria, raw evidence hashes, selection, rejected alternatives, version binding, approvers, and timestamps.
- Produces: `BenchmarkSample { candidate: string; environmentId: string; p50: number; p95: number; p99: number; max: number; allocationBytes: number; failures: number }`.

- [ ] **Step 1: Add failing schema/benchmark tests.** Reject a record without predeclared criteria or raw-evidence hashes; verify input generation covers 125, 500, 1000, 2000, 4000, and 8000 Hz plus burst recovery.
- [ ] **Step 2: Run the focused tests.** Expected: FAIL because records and validator are absent and the old cadence file claims an unapproved selection.
- [ ] **Step 3: Implement deterministic JSON validation and browser/Node benchmark emitters.** Mark the old 128 Hz claim `PROVISIONAL — NOT VERSION-BOUND`; benchmark candidates remain 120, 128, 240, 360, and 500 Hz until evidence and human approval select one.
- [ ] **Step 4: Predeclare criteria; measure cadence, catch-up, buffer/work/parser maxima, chunk cadence, heartbeat jitter/deadline, and renderer budgets on the documented browser/hardware/network matrix; hash raw outputs; and request human approval.** Private-owned transport evidence is consumed only through an immutable reviewed record named in `ranked-transport-limits.json`, never a sibling import. `npm run decisions:check` remains red until every P3 dependency is approved.
- [ ] **Step 5: Commit.** `git commit -s -m "perf: record evidence-backed runtime decisions"`

### Task P3: Author and Approve the Protocol V1 Freeze

**Files:**

- Create: `docs/protocol/v1/{http-contract,binary-contract,ticket-contract,settings-contract,limits,compatibility}.md`
- Create: `docs/protocol/v1/approval.json`
- Create: `tests/golden/protocol-v1/{ticket,settings,state,chunk,malformed}.json`
- Create: `tools/reference/protocol-v1-reference.py`
- Test: `tests/protocol-freeze/protocol-freeze.spec.ts`

**Interfaces:**

- Produces: exact `/api/v1` method/path/caller/auth/CSRF/cache/status/error schemas.
- Produces: exact little- or big-endian field tables for ticket, settings, state, chunk, chain hash, and signatures; the chosen endianness is written once in `binary-contract.md`.
- Produces: signed ticket fields in the exact approved order: `ticketClass`, `runId`, `principalBinding`, `createRequestId`, `modeId`, `boardId`, `protocolVersion`, `engineVersion`, `scenarioVersion`, `scoringVersion`, `verifierVersion`, `seedBankVersion`, seed material, `settingsHash`, `tickDuration`, terminal tick/duration, `issuedAt`, `expiresAt`, `initialNonce`, `releaseId`, `kid`, `signature`.

- [ ] **Step 1: Write a failing freeze validator.** It checks every required route, field, width, domain literal, error, numeric maximum, idempotency rule, `settingsHash` member, malformed vector, and independent-reference provenance.
- [ ] **Step 2: Run `npm test -- tests/protocol-freeze/protocol-freeze.spec.ts`.** Expected: FAIL with `PROTOCOL_FREEZE_INCOMPLETE` and `APPROVAL_MISSING`.
- [ ] **Step 3: Write the exact documents and independently derived Python vectors.** Include create, activate, sync/heartbeat, finish, status, account/session, settings, profile, leaderboard, history, sensitivity, export, deletion, and safe error contracts; private admin/internal routes are explicitly excluded.
- [ ] **Step 4: Stop for competent human protocol/security and private-contract-owner review.** Prove Ed25519 verification on the required pinned browser families or approve an explicit unsupported/fallback policy. After approval, record both repository spec commits, reviewer identities, artifact hashes, and date in `approval.json`; rerun the validator and require PASS. No implementation code may self-approve this gate.
- [ ] **Step 5: Commit.** `git commit -s -m "docs: freeze and approve public protocol v1"`

### Task P4: Implement and Publish `@findmysensi/protocol` V1

**Files:**

- Create: `packages/protocol/src/http/{errors,common,auth,account,ranked,leaderboard,privacy}.ts`
- Create: `packages/protocol/src/ranked/{ticket-v1,settings-v1,chunk-v1,hash-v1,key-set}.ts`
- Modify: `packages/protocol/src/binary/{reader,writer}.ts`, `packages/protocol/src/ranked/{domains,state-encoding}.ts`, `packages/protocol/src/index.ts`, `packages/protocol/package.json`
- Create: `tools/release/protocol-rc.mjs`, `docs/release/protocol-rc-handoff.schema.json`
- Test: `packages/protocol/test/{http-contract,ticket-v1,settings-v1,chunk-v1,malformed,goldens}.spec.ts`

**Interfaces:**

- Produces: Zod schemas plus inferred DTOs; `encodeTicketPayloadV1`, `verifyTicketV1`, `encodeSettingsV1`, `encodeChunkV1`, `hashRankedChunkV1`, and `decodeCanonicalStateV1`.
- `verifyTicketV1(ticket, keySet, nowMs)` accepts only Ed25519 and a trusted `kid`; arbitrary ticket-supplied algorithms/keys fail.

- [ ] **Step 1: Add parameterized tests that load every freeze vector and reject unknown versions, trailing bytes, noncanonical integers, wrong domains, untrusted keys, oversized lengths, and alias fields.**
- [ ] **Step 2: Run `npm test --workspace @findmysensi/protocol`.** Expected: FAIL against current minimal codecs and mismatched chunk domain.
- [ ] **Step 3: Implement bounded Zod edges and explicit `DataView` encoding exactly from the frozen tables.** Hashes cover complete scenario/target/PRNG/input-position/version state. Do not retain a legacy encoding under the V1 name.
- [ ] **Step 4: Build before pack inspection, run package tests and the pinned Python/TypeScript vector comparison, and verify Web Crypto Ed25519 in the configured browser projects.** `npm run build --workspace @findmysensi/protocol` then `npm pack --dry-run --workspace @findmysensi/protocol` must contain only built public artifacts, types, license, and safe docs.
- [ ] **Step 5: Generate and validate the RC handoff template locally without publishing.** It contains package version, expected source commit placeholder, artifact SHA-512 slot, registry URL slot, workflow identity slot, and provenance identity slot; unresolved slots fail publication but not the implementation commit.
- [ ] **Step 6: Commit.** `git commit -s -m "feat(protocol): implement frozen protocol v1"`
- [ ] **Step 7: After merge to a protected public commit, run the reviewed RC workflow to publish immutable `1.0.0-rc.<commit>` artifacts and seal the handoff.** Private CI consumes only that registry artifact; a missing registry/protected workflow blocks the private integration gate.

### Task P5: Ratify Checked Fixed-Point Math and PRNG

**Files:**

- Modify: `packages/aim-core/src/fixed/{angle,range}.ts`, `packages/aim-core/src/prng/xoshiro128ss.ts`
- Create: `packages/aim-core/src/fixed/{checked,geometry,lut}.ts`
- Modify: `docs/adr/0002-fixed-angle-representation.md`
- Test: `packages/aim-core/test/{checked,angle,geometry,prng,dependency-allowlist}.spec.ts`

**Interfaces:**

- Produces: branded `YawUnits`, signed `PitchUnits`, `AngleDeltaUnits`, `NanoDegreesPerBrowserInputUnit`, checked `addI32`, `mulCheckedInt53`, deterministic geometry/LUT operations, and `PrngV1` state serialization. Canonical protocol `u64/i64` fields use `bigint`; hot-loop aim math remains explicitly bounded safe integers.

- [ ] **Step 1: Add failing boundary/property tests for signed negative target offsets, wrap, pitch clamp, integer overflow rejection, PRNG state round-trip, and forbidden authoritative imports/calls.**
- [ ] **Step 2: Run the package tests.** Expected: FAIL because signed coordinates share an unsigned brand and authoritative conversion/overflow rules are incomplete.
- [ ] **Step 3: Implement checked integer/fixed-point primitives and the approved representation.** Presentation-only degree conversion stays outside state transitions; authoritative source fails the dependency scan for DOM, time, random, network, renderer, and disallowed `Math.*` operations.
- [ ] **Step 4: Compare TypeScript PRNG output with the independent Python reference and all consumed golden files across Node and browser integration.** Expected: byte-identical results.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(aim-core): ratify deterministic numeric kernel"`

### Task P6: Build the Single Authoritative Simulation State Machine

**Files:**

- Modify: `packages/aim-core/src/state/{types,step}.ts`, `packages/aim-core/src/input/{types,shot}.ts`, `packages/aim-core/src/collision/target.ts`
- Modify: `packages/aim-core/src/render/snapshot.ts`
- Create: `packages/aim-core/src/state/{create,hash-view,run-health}.ts`
- Test: `packages/aim-core/test/{state-machine,event-order,collision,render-snapshot,run-health}.spec.ts`

**Interfaces:**

- Produces: `stepSimulation(state, orderedEvents, scenarioRules): StepResult`, where `StepResult` contains canonical state, shot outcomes, sticky health, and terminal reason.
- Produces: `SnapshotLease` with read-only accessors and generation checks; no writable typed array escapes.

- [ ] **Step 1: Add failing same-tick tables covering lifecycle, movement, shot, spawn/expiry, hit/miss, invalidation, and terminal ordering; add snapshot mutation/allocation tests.**
- [ ] **Step 2: Run focused tests.** Expected: FAIL because the prototype has two runtime paths, incomplete canonical state, and writable/allocating snapshot views.
- [ ] **Step 3: Implement one scenario-driven state transition path with checked arithmetic and sticky health.** Double buffers are preallocated; readers receive generation-scoped readonly views; renderer data never feeds state.
- [ ] **Step 4: Run unit/property/golden tests with randomized legal chunk partitioning.** The final canonical hash and score components must be invariant across partitions and render configurations.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(aim-core): implement authoritative simulation state"`

### Task P7: Repair Ordered Browser Input and Sticky Overflow Evidence

**Files:**

- Modify: `packages/input-browser/src/{ring-buffer,reducer,event-source,pointer-lock,run-health,processing-policy}.ts`
- Create: `packages/input-browser/src/{run-clock,input-session}.ts`
- Test: `packages/input-browser/test/{run-clock,causal-order,overflow,session,capabilities}.spec.ts`

**Interfaces:**

- Produces: `InputSession.drainUntil(tick, target): ReducedBatchView`, a zero-or-more-segment lease over preallocated event/segment arrays with a monotonic run-wide `Sequence`; no event array or segment object is allocated per drain.
- Produces: `InputHealthEvidence` whose overflow/high-water/source/coalescing/invalidation fields remain sticky until terminal proof capture.

- [ ] **Step 1: Add failing tests for multiple drains in one tick, movement-shot-movement boundaries, duplicate `DOWN`, focus/lock loss, absolute timestamp exclusion, ring overflow, and terminal evidence export.**
- [ ] **Step 2: Run input tests.** Expected: FAIL because order resets per drain and overflow evidence is discarded.
- [ ] **Step 3: Implement a run-relative control-plane clock adapter that emits only tick/order to aim-core, preserve semantic boundaries, and retain sticky health in preallocated storage.** Raw/fallback capability selection is recorded but never treated as identity.
- [ ] **Step 4: Run 125–8000 Hz synthetic properties and a real-browser capture smoke; assert no movement crosses a semantic boundary and no hot-path React update/allocation is introduced.**
- [ ] **Step 5: Commit.** `git commit -s -m "fix(input): preserve causal order and overflow evidence"`

### Task P8: Finish Grid Scenario, Scoring, Analytics, and Seed Validation

**Files:**

- Modify: `packages/scenarios/src/grid/dev-v0.ts`, `packages/scenarios/src/{types,registry}.ts`
- Modify: `packages/scoring/src/grid/dev-v0.ts`, `packages/analytics/src/grid/metrics.ts`
- Create: `packages/scenarios/src/grid/{ranked-v1,seed-validator}.ts`, `packages/scoring/src/grid/ranked-v1.ts`
- Create: `tests/golden/grid-v1/{seeds,replays,scores}.json`
- Create: `docs/open-decisions/{grid-v1-mechanics,grid-v1-score,grid-v1-seed-policy,grid-v1-pilot}.json`
- Test: matching package tests plus `tests/property/grid-v1.spec.ts`

**Interfaces:**

- Produces: immutable `GridScenarioV1`, `validateGridSeedBank`, bounded `computeGridScoreV1`, and versioned `GridMetricsTracker`.

- [ ] **Step 1: Add failing goldens for three nonoverlapping targets, replacement scheduling, overlap/boundary shots, equal opportunity, score extrema, malicious overflow, and metric independence from score.**
- [ ] **Step 2: Run scenario/scoring/analytics tests.** Expected: FAIL because only development behavior exists and no bank validator is present.
- [ ] **Step 3: Implement public mechanics and checked score components.** Production bank contents stay private; this repository owns generator constraints, validator, evidence format, version, and integrity contract.
- [ ] **Step 4: Run independent goldens, seed properties, chunk-partition replay, and historical fixture tests.** Mechanics, dimensions/duration, score coefficients/bounds, seed-bank size/constraints, and pilot/holdout thresholds each require an approved record. Until all four pass, export `GridScenarioCandidateV1` with `rankedEligible=false`; only the approved release exports immutable `GridScenarioV1`.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(grid): add approved deterministic scenario and scoring"`

### Task P9: Complete Canvas2D, Viewport, Presets, and Performance Evidence

**Files:**

- Modify: `packages/render-canvas/src/{renderer,types,viewport-transform}.ts`
- Create: `packages/performance/src/{frame-monitor,preset-policy,bundle-budget}.ts`
- Test: renderer tests, `tests/performance/{frame-budget,allocation}.spec.ts`, real Playwright screenshot tests.

**Interfaces:**

- Produces: `RendererPreset = POTATO | LOW | BALANCED | HIGH`, `PresetSelection = AUTOMATIC | RendererPreset`, `FrameHealth`, `AutomaticPresetController`, and renderer methods `prepare`, `render(snapshot)`, `resize(display)`, `dispose`.

- [ ] **Step 1: Add failing tests for 1280×720 source-of-truth, Fit/Stretch/Bars across required aspect ratios, DPR 1/2, negative relative yaw, context loss, zero post-warmup allocations, and renderer-independent state hashes.**
- [ ] **Step 2: Run renderer/performance tests.** Expected: FAIL on negative coordinates and allocation/context behavior.
- [ ] **Step 3: Implement the canonical viewport transform and preset policy.** Automatic tuning requires sustained-health thresholds, hysteresis/cooldown, downgrade-only behavior during a Ranked run, and no sensitivity/input changes. The renderer is prepared/warmed and fixed before a ticket; catastrophic context loss invalidates Ranked. Canvas2D is mandatory; WebGL2/workers/OffscreenCanvas/SAB stay absent until a separate approved performance record proves benefit.
- [ ] **Step 4: Capture p50/p95/p99 frame/input evidence on representative hardware and freeze public budgets only through an approved decision record.** Run all screenshot and parity tests.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(render): complete canonical Canvas2D runtime"`

### Task P10: Obtain UI Approval Waves A and B

**Files:**

- Create: `docs/design/wave-a/{landing,auth-account,trainer-home,mobile-blocked,potato-setup}.md`
- Create: `docs/design/wave-b/{running-hud,pause-settings,results}.md`
- Create: `docs/design/approvals/{wave-a,wave-b}.json`
- Create: `tools/design/validate-approval.mjs`
- Test: `tests/design/approval-gate.spec.ts`

**Interfaces:**

- Produces: immutable approval records binding design artifact hashes, viewport set, accessibility notes, approver, and timestamp.

- [ ] **Step 1: Add a failing approval-gate test that rejects missing artifacts, missing 1280×720 state, missing keyboard/screen-reader behavior, or an artifact hash mismatch.**
- [ ] **Step 2: Run `npm test -- tests/design/approval-gate.spec.ts`.** Expected: FAIL with `UI_APPROVAL_MISSING`.
- [ ] **Step 3: Prepare responsive state documents/wireframes using the approved graphite/off-white/signal-lime system, all error/loading/empty/focus states, and honest mouse/visual-task accessibility.** No React UI implementation belongs in this task.
- [ ] **Step 4: Stop for human review.** Record approval only after explicit feedback is resolved; rerun the gate and require PASS for waves A/B.
- [ ] **Step 5: Commit.** `git commit -s -m "docs: approve core public ui states"`

### Task P10B: Implement the Approved Visual Foundation

**Files:**

- Create: `apps/web/app/globals.css`, `apps/web/src/ui/{tokens,focus,motion}.css`, `apps/web/src/ui/icons.ts`
- Modify: `apps/web/app/layout.tsx`, `apps/web/package.json`, `package-lock.json`
- Test: `tests/a11y/visual-foundation.spec.ts`, `tests/bundle/icon-imports.spec.ts`

**Interfaces:**

- Produces: approved graphite/off-white/signal-lime tokens, separate semantic/game tokens, Geist/Geist Mono variables, 8 px radius primitives, visible focus, reduced-motion behavior, and direct per-icon Phosphor imports.

- [ ] **Step 1: Add failing browser tests for fonts, semantic/game token separation, 24 px minimum targets or qualifying spacing, visible non-obscured focus, reduced motion, and absence of icon barrel imports.**
- [ ] **Step 2: Run `npm run test:a11y -- tests/a11y/visual-foundation.spec.ts` and `npm test -- tests/bundle/icon-imports.spec.ts`.** Expected: FAIL against inline prototype styles.
- [ ] **Step 3: Install the approved styling dependencies and implement only the approved foundation; do not build unapproved Wave C/D screens.**
- [ ] **Step 4: Run format, lint, types, production build, focused a11y/bundle tests, and 1280x720 screenshots.** Expected: PASS.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(ui): establish approved visual foundation"`

### Task P11: Add Public API Clients, Fail-Closed Mock API, and Route Shell

**Files:**

- Create: `apps/web/src/api/{browser-client,server-client,errors}.ts`
- Create: `apps/mock-api/src/{server,state,handlers}.ts`, `apps/mock-api/package.json`
- Create: `apps/mock-api/tsconfig.json`, `apps/web/app/{login,register,verify,recover}/page.tsx`, `apps/web/app/app/page.tsx`
- Modify: `apps/web/next.config.mjs`, `apps/web/app/layout.tsx`
- Modify: `package.json`, `package-lock.json`, `tsconfig.verify.json`, `apps/web/package.json`
- Create/modify: only Wave A/B-approved landing, auth/account-entry, and trainer-home shells. Profile and leaderboard remain blocked until P18 approval.
- Test: `tests/contracts/mock-conformance.spec.ts`, `tests/e2e/api-routing.spec.ts`, bundle graph test.

**Interfaces:**

- Produces: `BrowserApiClient` using relative URLs/cookies/CSRF context and server-only `ServerApiClient` returning narrow DTOs.
- Produces: mock handlers validated by the same public Zod schemas; `MOCK_API_ORIGIN` is accepted only when `NODE_ENV !== "production"`.

- [ ] **Step 1: Add failing conformance tests for every public route, stable error, no-store default, production mock rejection, and absence of server transport/env values from client bundles.**
- [ ] **Step 2: Run contract/build tests.** Expected: FAIL because clients, proxy, and mock workspace are absent.
- [ ] **Step 3: Implement clients and mock handlers.** `server-client.ts` imports `server-only`. Use Next.js rewrites only for local same-origin `/api/v1/:path*`; production routing remains environment/deployment configuration and never exposes the private origin credential to JavaScript. Add nonce/hash CSP, `frame-ancestors`, `nosniff`, restrictive referrer/permissions headers, and an exact one-hard-reload compatibility recovery guard.
- [ ] **Step 4: Run mock conformance, production build, bundle graph, and browser login/error-state flows.** Verify the mock cannot be selected by URL/query/local storage.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(web): add contract clients and safe mock api"`

### Task P12: Wire the Authenticated Grid Practice Vertical Slice

**Files:**

- Modify: `apps/web/src/trainer/TrainerBootstrap.tsx`, `apps/web/src/trainer/{load-runtime,fixed-tick-runner}.ts`
- Modify: `apps/web/src/features/training/PracticeRunController.ts`
- Create: `apps/web/src/features/training/{PracticeCanvas,PracticeHud}.tsx`, `apps/web/src/features/training/practice-machine.ts`
- Create: `apps/web/app/app/train/[mode]/page.tsx`, `apps/web/app/app/train/[mode]/results/page.tsx`
- Modify: `apps/web/src/features/training/local-history.ts`, `apps/web/src/features/results/PracticeResults.tsx`
- Modify: `apps/web/app/train/[mode]/page.tsx`, `apps/web/app/train/[mode]/results/page.tsx` as explicit redirects or removals covered by route tests
- Test: unit tests and `tests/e2e/grid-practice.spec.ts`

**Interfaces:**

- Produces: one `PracticeRunController` using P6 `stepSimulation`; state union `READY | COUNTDOWN | RUNNING | PAUSED | COMPLETE | INVALIDATED`.
- Produces: versioned minimal `PracticeSummaryRecord`; raw pointer events never enter IndexedDB/localStorage.

- [ ] **Step 1: Add failing controller/browser tests for authentication gating, preflight, Pointer Lock, countdown, tick 0, hit/miss, pause/restart Practice behavior, completion, local summary, focus loss, mobile block, console cleanliness, and 1280×720 layout.**
- [ ] **Step 2: Run unit tests and Playwright Chromium against the conformant mock from P11.** Expected: FAIL because the current page is static and the controller is disconnected.
- [ ] **Step 3: Replace both prototype runtime paths with the single controller and imperative Canvas renderer.** Use refs/external objects for tick/mouse state; React receives low-frequency lifecycle/result updates only. Wrap versioned storage access in validation and `try/catch`.
- [ ] **Step 4: Run unit, build, Playwright desktop/mobile-size, screenshot, console, allocation, and bundle-boundary checks.** Expected: a mock-authenticated interactive Grid Practice completes and saves only a summary. A coordinated integration check against private S4-S6 must pass before calling the slice production-authenticated.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(training): deliver authenticated Grid Practice"`

### Task P13: Implement Sensitivity Types, Converters, and Known-Sensitivity Model

**Files:**

- Create: `packages/sensitivity/package.json`, `packages/sensitivity/tsconfig.json`, `packages/sensitivity/src/index.ts`
- Create: `packages/sensitivity/src/{units,decimal,conversion,environment-keys}.ts`
- Create: `packages/sensitivity/src/games/{types,registry}.ts`, adapter files only after source evidence approval
- Create: `packages/sensitivity/test/{units,conversion,registry,environment-key}.spec.ts`
- Create: `packages/sensitivity/src/known-sensitivity.ts` and its unit tests; React routes/components remain deferred to P18.
- Create: `docs/privacy/{calibration-environment-key-v1,performance-environment-key-v1}.json`
- Modify: `package-lock.json`, `tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`, `apps/web/{package.json,tsconfig.json,next.config.mjs}`

**Interfaces:**

- Produces incompatible `NanoDegreesPerDeviceCount` and `NanoDegreesPerBrowserInputUnit`, exact decimal/rational parsing, versioned `GameSensitivityDefinition`, and provenance-bearing `KnownSensitivityRecord`.

- [ ] **Step 1: Add failing dimension/type tests, decimal edge vectors, linear-yaw formula vectors, unsupported/custom-game behavior, nominal DPI labeling, and tests for both `CalibrationEnvironmentKeyV1` and `PerformanceEnvironmentKeyV1`.** Each key test enumerates the allowlisted coarse field combinations and rejects any encoded-cardinality/entropy ceiling breach.
- [ ] **Step 2: Run sensitivity tests.** Expected: FAIL because the package does not exist.
- [ ] **Step 3: Implement exact rational conversion, both non-identifying comparability keys, and a small registry shell.** Persistence remains disabled until each key's field allowlist, encoded-cardinality ceiling, purpose, reviewer, and privacy approval are recorded. Valorant and CS2 are evidence-gated first candidates; Overwatch 2, Apex, and ADS/scope conversion remain excluded pending current-build validation.
- [ ] **Step 4: Implement and test the headless known-sensitivity state/validation model.** Verify it applies the canonical trainer value without calibration and serializes only the approved narrow DTO; P18 owns its approved React form and browser flow.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(sensitivity): add canonical converters and known flow"`

### Task P14: Implement the Crosshair Contract and Editor Model

**Files:**

- Create: `packages/crosshair/package.json`, `packages/crosshair/tsconfig.json`, `packages/crosshair/src/index.ts`
- Create: `packages/crosshair/src/{schema,presets,share-code,contrast}.ts`
- Create: `packages/crosshair/test/{schema,presets,share-code,malformed}.spec.ts`
- Create: `packages/crosshair/src/editor-model.ts`; React editor route/components remain deferred to P18.
- Modify: renderer crosshair adapter without feeding presentation into simulation.
- Modify: `package-lock.json`, `tsconfig.json`, `tsconfig.base.json`, `vitest.config.ts`, `apps/web/{package.json,tsconfig.json,next.config.mjs}`

**Interfaces:**

- Produces: bounded `CrosshairV1`, six original presets, `encodeCrosshairShareCodeV1`, `decodeCrosshairShareCodeV1`, and contrast warnings.

- [ ] **Step 1: Add failing round-trip/golden/malformed/bounds tests for Classic, Small Cross, Tiny Cross, Dot, Outlined Dot, and Open Cross.**
- [ ] **Step 2: Run crosshair tests.** Expected: FAIL because the package is absent.
- [ ] **Step 3: Implement the compact versioned code and editor model.** Unknown fields/versions reject; Practice allows broad safe customization; Ranked retains task visibility and only warns on low contrast.
- [ ] **Step 4: Run package, editor-model, malformed share-link, and renderer-independence tests.** State hashes must remain identical across crosshairs; P18 owns keyboard, a11y, and browser share-link evidence.
- [ ] **Step 5: Commit.** `git commit -s -m "feat(crosshair): add presets editor and share codes"`

### Task P15: Implement Blind Calibration and Passive Refinement Kernels

**Files:**

- Create: `packages/sensitivity/src/calibration/{types,schedule,utility,confidence,drift,passive}.ts`
- Create: `packages/sensitivity/test/calibration/{schedule,utility,confidence,drift,passive}.spec.ts`
- Create: `docs/open-decisions/{calibration-range,calibration-blocks,calibration-confidence}.json`

**Interfaces:**

- Produces: `CalibrationSession` whose candidate values remain hidden; `CalibrationResult { recommendation; range; confidence: LOW | MODERATE | HIGH; evidenceVersion }`; bounded recency-weighted passive updates.

- [ ] **Step 1: Add failing schedule/property tests for neutral start/middle/end references, acclimation exclusion, approximately 5→3→2 narrowing, counterbalancing, drift downgrade, incomparable environments, old-evidence decay, and no current-sensitivity input.**
- [ ] **Step 2: Run calibration tests.** Expected: FAIL because algorithms and approved numeric records are absent.
- [ ] **Step 3: Run pilot tooling and obtain approval for range, block/acclimation, utility, stopping, and confidence records.** Implement only the approved deterministic/statistical rules; no marketing-only ML or fake probability.
- [ ] **Step 4: Run seeded properties, blinded fixtures, drift/recency tests, and reproducibility checks.** Material changes create a new algorithm version.
- [ ] **Step 5: Commit.** `git commit -m "feat(calibration): implement blind and passive sensitivity logic"`

### Task P16: Implement Sensi Battle, Mouse Swap, and Reveal Research

**Files:**

- Create: `packages/sensitivity/src/battle/{schedule,decision}.ts`, `packages/sensitivity/src/mouse-swap.ts`, `packages/sensitivity/src/research.ts`
- Create matching headless tests; React route/components remain deferred to P18.

**Interfaces:**

- Produces: counterbalanced `BattleRound`, response `A | B | COULD_NOT_TELL`, objective-first winner/neighbor rule, `MouseSwapResult`, and post-freeze optional research record.

- [ ] **Step 1: Add failing tests for A/B position balance, equivalent opportunity, objective-over-subjective weighting, ties/insufficient evidence, neighboring-winner iteration, exact linear-yaw mouse swap, effective-CPI uncertainty, and research consent after recommendation freeze.**
- [ ] **Step 2: Run focused tests.** Expected: FAIL because modules are absent.
- [ ] **Step 3: Implement the versioned rules and narrow DTOs.** Mouse shape/weight/friction may affect performance advice but never mathematical yaw; research participation never affects access/rank/result.
- [ ] **Step 4: Run unit/property and privacy-contract tests.** Verify no pre-freeze current sensitivity reaches blind recommendation logic; P18 owns accessibility and approved browser-flow tests.
- [ ] **Step 5: Commit.** `git commit -m "feat(sensitivity): add battle mouse swap and research flow"`

### Task P17: Add the Remaining Original Scenarios as Separate Reviewable Commits

**Files:**

- Create per mode under `packages/scenarios/src/{pinpoint,multi,headline,strafe,smooth-track,tempo}/`
- Create matching scoring, analytics, seed validators, tests, and `tests/golden/<mode>-v1/`
- Create one pilot/holdout `OpenDecisionRecord` per ranked candidate.

**Interfaces:**

- Pinpoint: six tiny stationary targets and precision/planning metrics.
- Multi: release-fixed large/medium/small opportunity quotas.
- Headline: controlled head-height corridor with nontrivial vertical variation.
- Strafe: balanced lanes, directions, speeds, reversals, stops, and unpredictable order.
- Smooth Track: deterministic continuous path, on-target time plus angular-error score.
- Tempo: versioned BPM schedule with published early/late/miss treatment.

- [ ] **Step 1: For each mode, first commit failing mechanics, seed-fairness, score-boundary, overflow, analytic-definition, replay, and historical golden tests.** No mode reuses Grid expectations implicitly.
- [ ] **Step 2: Run each mode's focused suite and capture the expected missing-definition failures.**
- [ ] **Step 3: Implement one mode at a time using the common scenario interface, then commit it separately with `feat(<mode>): add deterministic practice scenario`.** Keep `rankedEligible=false` until its frozen pilot/holdout record passes.
- [ ] **Step 4: Run all cross-mode properties, performance budgets, renderer independence, and seed-opportunity tests; approve and version each ranked promotion independently.**
- [ ] **Step 5: Commit the registry/presentation integration.** `git commit -m "feat(scenarios): register approved v1 mode set"`

### Task P18: Obtain UI Waves C/D and Complete Public Product Routes

**Files:**

- Create approval artifacts for leaderboard/profile and Sensi Lab/Battle/Mouse Swap/crosshair.
- Create/modify route components listed in spec §3.3 and visual states in §9, including converter, known-sensitivity, crosshair, Sensi Lab, Battle, Mouse Swap, profile, and leaderboard flows.
- Test: route, RSC serialization, a11y, 720p, responsive, screenshot, and keyboard suites.

**Interfaces:**

- Consumes: narrow public DTOs only; no private reason/evidence fields.
- Produces: semantic result charts/tables, neutral ranked statuses, publication controls, and honest unsupported-mobile state.

- [ ] **Step 1: Make approval tests fail, prepare artifacts, and stop for human approval of waves C/D.**
- [ ] **Step 2: Add failing route/browser tests for public profile, one-row-per-user leaderboard presentation, tied ranks, legacy boards, result metrics/history, privacy controls, and all sensitivity tools.**
- [ ] **Step 3: Implement approved Server Component shells plus small client islands.** Fetch independent data in parallel, pass only rendered DTO fields across RSC boundaries, directly import heavy/icons modules, and never put high-frequency gameplay in React.
- [ ] **Step 4: Run exact Chrome/Edge/Firefox/Safari-version evidence, axe/a11y, keyboard, 1280×720 and aspect/viewport screenshots, mobile blocked behavior, bundle budgets, and console checks.**
- [ ] **Step 5: Commit.** `git commit -m "feat(web): complete approved public product routes"`

### Task P19: Harden Public CI, Packaging, RC Promotion, and Release Evidence

**Files:**

- Create: `.github/workflows/{browser-nightly,release-rc,release-stable}.yml`
- Create: `tools/release/{manifest,verify-stable,flake-budget}.mjs`
- Create: `docs/release/{public-manifest-schema,evidence-policy}.md`
- Modify: package publish configs and CI.
- Test: release tooling and synthetic provenance fixtures.

**Interfaces:**

- Produces immutable RC/stable tarballs, hashes, SBOM/provenance, sanitized manifest, and exact `releaseId` evidence input.

- [ ] **Step 1: Add failing tests for mutable tags, RC/stable hash confusion, missing browser versions, unclassified retries, unsafe privileged workflow changes, and private fields in a public manifest.**
- [ ] **Step 2: Run release tests.** Expected: FAIL because publishing/provenance tooling is absent.
- [ ] **Step 3: Implement protected-commit RC packaging and exact-stable revalidation.** A PR changing privileged workflows cannot execute its modified secret-bearing workflow; public forks cannot trigger private CI.
- [ ] **Step 4: Run the full PR/nightly/release matrix, enforce the approved flake budget, inspect tarballs/SBOM/licenses, and hand immutable RC identities to private staging.** Stable publication occurs only after coordinated approval; production consumes exact stable artifacts.
- [ ] **Step 5: Commit.** `git commit -m "ci: add public release and provenance gates"`

## Public Completion Gate

Run from `findmysensi`:

```powershell
npm ci
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run check:boundaries
npm run test:e2e
npm run test:a11y
npm run test:bundle
npm run decisions:check
```

Then inspect `git diff`, compare every task with the approved spec, report exact command/evidence output, and invoke `superpowers:verification-before-completion`. Public completion does not imply Ranked production approval; that requires the private plan, coordinated release gates, privacy/legal/provider gates, and an independent competent human Ranked security review.

## Official Implementation References

- Next.js same-origin proxying: <https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites>
- Next.js CSP guidance: <https://nextjs.org/docs/app/guides/content-security-policy>
- Vercel React performance rules are applied through the repository's React best-practices guidance.
