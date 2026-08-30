# FindMySensi Public Architecture and Product Design Specification

## Document control

| Field             | Value                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| Status            | Approved normative specification                                                                                      |
| Date              | 2026-08-30                                                                                                            |
| Product           | FindMySensi                                                                                                           |
| Repository        | `findmysensi` (public, MPL-2.0)                                                                                       |
| Companion service | `findmysensi-secure` (private; independently built and deployed)                                                      |
| Scope             | Public product, deterministic trainer, public contracts, public-facing privacy behavior, and cross-service invariants |
| Authority         | Master Project Build Brief plus approved Design Sections 1–11 and all approval amendments                             |
| Approval          | Human owner approval recorded in the project thread after review of Sections 1–11 and this normative specification    |
| Approval date     | 2026-08-30                                                                                                            |
| Next gate         | Implementation-plan approval and execution-approach selection                                                         |

This document is the normative public design for FindMySensi. It records the architecture already approved through the sectioned design process. It does not authorize product implementation, select unprofiled numeric thresholds, or disclose private security logic.

The words **MUST**, **MUST NOT**, **SHOULD**, **SHOULD NOT**, and **MAY** are normative. A deliberate exception requires an Architecture Decision Record (ADR), evidence, and approval appropriate to its risk.

## 1. Product intent and decision priorities

FindMySensi is a lightweight browser FPS aim trainer and sensitivity toolkit for desktop/laptop users with a mouse. Its core promise is:

> No download. No heavy launcher. No gaming PC required.

The implementation priority is permanently ordered as follows:

1. Input correctness.
2. Deterministic gameplay.
3. Low-end performance.
4. Ranked security.
5. Sensitivity accuracy.
6. UI polish.

A visually richer option MUST NOT compromise an earlier priority.

### 1.1 Goals

- Run responsive aim training in a supported desktop browser, including on an Intel 7th-generation Core i3-class CPU, integrated graphics, 8 GB RAM, and a 1280×720 viewport where the browser/hardware permits.
- Keep gameplay independent of React rendering and free of per-event/per-frame garbage in normal operation.
- Provide deterministic, versioned scenarios and reproducible ranked results.
- Provide honest sensitivity conversion, blind calibration, A/B comparison, Mouse Swap, and useful aim analytics.
- Support mice from ordinary polling rates through 8000 Hz using measured, bounded processing behavior without claiming to change hardware polling.
- Preserve permanent, versioned competitive records without silently mixing incompatible rules.
- Publish the trainer engine, scenarios, scoring specification, converters, protocol schemas, tools, tests, and contribution process under MPL-2.0.
- Keep credentials, production persistence, authoritative writes, private verification policy, and abuse defenses behind a clean private service boundary.

### 1.2 V1 non-goals

V1 MUST NOT include:

- Mobile touch or BGMI training.
- A native desktop client.
- Gun/glove skin systems, a cosmetic store, or a crosshair marketplace.
- Advertising, paid subscriptions, or intrusive donation prompts.
- Daily/weekly leaderboards, daily challenges, streak pressure, clans, chat, social feeds, or cash tournaments.
- Hundreds of scenarios or an exact clone of any other aim trainer.
- ADS/scope conversion.
- A machine-learning sensitivity model.
- A claim that browser code, obfuscation, WebAssembly, or hash chaining makes a hostile client trustworthy.
- A claim of universal legal compliance or guaranteed hardware performance without applicable review and measured evidence.

Future cosmetics MAY influence data extensibility, but they MUST NOT cause speculative v1 implementation.

## 2. Workspace and repository boundary

The filesystem topology is fixed:

```text
F:\Dev\findmysensi\                         parent workspace; never a Git repository
├── FINDMYSENSI — MASTER PROJECT BUILD BRIEF.md
├── findmysensi\                            public independent Git repository
└── findmysensi-secure\                     private independent Git repository
```

The two child repositories MUST build, test, version, and deploy independently. Neither repository may import source through a sibling filesystem path. Shared behavior crosses the boundary only through immutable published packages and explicit versioned network contracts.

### 2.1 Public ownership

The public repository owns:

- The Next.js website and application UI.
- Trainer UI and lifecycle orchestration.
- The deterministic aim engine and browser input adapter.
- Canvas2D and optional WebGL2 renderers.
- Scenario definitions, deterministic behavior, public scoring specifications, and local provisional scoring.
- Sensitivity canonical types, game adapters, converter tools, calibration logic, Sensi Battle, and Mouse Swap.
- Crosshair definitions, editor, presets, and share-code format.
- Device capability checks, benchmark harnesses, graphics presets, Potato Mode, and performance diagnostics.
- Public profiles/leaderboard/results UI and narrow public data-transfer types.
- Public user/browser API Zod/TypeScript schemas, canonical ranked-proof encodings, safe public error codes, and golden vectors. Private admin, moderation, job, migration, audit, and control-plane contracts remain private.
- A local mock API that is impossible to select in production.
- Documentation, tests, CI, licensing, contribution, governance, funding, and security-reporting files.

### 2.2 Private ownership

The private repository is the sole owner of:

- Better Auth integration, passwords, credentials, sessions, OTP/email workflows, Turnstile validation, and abuse rate controls.
- Turso access, Drizzle schema, and **all production database migrations**.
- Ranked ticket issuance, server signing keys, heartbeats, chunk acceptance, replay verification, and authoritative scoring.
- PB, leaderboard, progression, and moderation writes.
- Proof storage, encryption keys, retention workers, exports, deletion orchestration, and private audit storage.
- Risk scoring, anti-cheat signals/heuristics/thresholds, fraud models, bans, case management, admin grants, and privileged tooling.
- Production secrets, internal operational configuration, incident details, and the complete coordinated release manifest.

The public repository MUST NOT connect directly to Turso, contain a production database token, run a production migration, store a signing/encryption/email secret, or expose private reason codes. A schema in the public protocol package is an API contract, not a production database schema.

### 2.3 Cross-boundary invariants

- Browser traffic uses one same-origin `/api/v1/*` surface in local, preview, staging, and production environments.
- Local defaults are public app `:3000`, private API `:4000`, and optional mock API `:4100`.
- The development/prod router selects the backend; browser input, query strings, or local storage MUST NOT select mock mode.
- Production routing sends `/*` to the public deployment and `/api/*` to the private deployment while preserving the same browser-facing origin.
- The private origin receives defense-in-depth edge-to-origin authentication. That credential is never available to browser JavaScript and is not a substitute for session authentication, authorization, CSRF checks, or ranked-ticket validation.
- `/api/*` is `no-store` by default. Only an explicit allowlist of anonymous public GET read models may opt into a short TTL. Auth, account, ranked, `/me`, and any response setting a cookie MUST never use shared caching.
- Public code may describe deterministic rules and cryptographic formats. Security through obscurity is not the boundary; secret thresholds, fraud models, ban logic, privileged data, and keys are.

## 3. System context and public application architecture

```text
                         Browser
                            │
                  same-origin HTTPS surface
                            │
              ┌─────────────┴─────────────┐
              │                           │
              ▼                           ▼
       Public Next.js app          /api/v1/* router
       Server Components                   │
       client islands                      ▼
       trainer runtime              Private service
              │                    (independent build)
              │                           │
              └──── public protocol ──────┘
                                          │
                              private persistence/providers
```

The public app uses the Next.js App Router, React, TypeScript, Tailwind CSS, and accessible headless primitives. Server Components are the default for marketing, documentation, public profile shells, leaderboards, and non-interactive application structure. Client Components are narrow islands.

The trainer route contains a small client bootstrap boundary that dynamically imports the non-React engine, browser input adapter, scenario, and chosen renderer. Gameplay MUST NOT be driven by React state or React render cadence. React may receive results after a run and low-frequency HUD summaries where measurement proves that safe.

### 3.1 API transports

One public protocol defines request/response DTOs, but browser and server transports are separate:

```text
BrowserApiClient
  → relative /api/v1/*
  → browser cookie context
  → required CSRF/request-context header

ServerApiClient
  → server-only module
  → approved private origin
  → forwards only narrowly approved request context
  → returns minimal DTOs
```

The `ServerApiClient` and all secret-capable data-access modules MUST import `server-only`. They MUST NOT be reachable from a Client Component. A Server Component session check is only a navigation/UX guard; every private API operation independently authenticates and authorizes the request.

The private service contract promises a bounded request pipeline: request ID and size/content checks; Fetch Metadata/Origin; coarse anonymous/IP control; authentication; CSRF; fine user/account abuse control; bounded decoding; authorization; computation outside a short transaction; audit; response. Durable correctness assumes conservative serialized Turso writes, uniqueness/conditional operations, and retries—not preview concurrent-write behavior. PB/leaderboard changes are atomic conditional writes, never read/compare/write in application memory.

Ranked finish moves the run to `FINISHING` and creates recoverable verification work atomically, then attempts a bounded inline replay. A durable at-least-once queue with idempotent leases is introduced only if profiling demonstrates the need. Privileged events are append-only and tamper-evident, not described as magically immutable. Private migrations are generated, reviewed artifacts using expand/migrate/contract, backups, rollback-compatible applications, and forward corrective migrations; production request/startup code never runs migrations.

### 3.2 Target logical package boundaries

The implementation plan may refine physical paths, but it MUST preserve these logical boundaries:

| Logical package/surface      | Responsibility                                                                 | Forbidden dependencies                            |
| ---------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------- |
| `apps/web`                   | Routes, Server Components, client islands, metadata, UI composition            | Turso client, private auth/risk code              |
| `@findmysensi/aim-core`      | Pure deterministic simulation, geometry, collisions, authoritative local state | DOM, React, network, storage, browser clocks      |
| `@findmysensi/input-browser` | Pointer Lock, raw/fallback event capture, ordered bounded buffering            | React hot-path state, scenario scoring            |
| `@findmysensi/render-canvas` | Ultra-light Canvas2D presentation                                              | Authoritative mechanics or input math             |
| `@findmysensi/render-webgl`  | Optional warmed WebGL2 presentation                                            | Authoritative mechanics or input math             |
| `@findmysensi/scenarios`     | Versioned authoritative scenario releases plus separate presentation metadata  | Private risk policy, renderer-dependent mechanics |
| `@findmysensi/scoring`       | Public integer scoring specifications and provisional scoring                  | Leaderboard/PB writes, private acceptance policy  |
| `@findmysensi/sensitivity`   | Canonical sensitivity types, evidence registry, calibration and converters     | Claims unsupported by adapter/input provenance    |
| `@findmysensi/crosshair`     | Presets, validation, rendering description, share-code codec                   | Marketplace/ranking behavior                      |
| `@findmysensi/protocol`      | Zod/TypeScript DTOs, binary codecs, errors, version compatibility, goldens     | Database schema, private reason codes             |
| `@findmysensi/mock-api`      | Local synthetic API behavior                                                   | Production dependency graph or real secrets/data  |
| performance/test tooling     | Polling simulation, deterministic fixtures, bundle and browser evidence        | Production user data                              |

Broad cross-domain barrel exports SHOULD be avoided. Native `import()` loads non-React runtime modules; `next/dynamic` is reserved primarily for React surfaces.

### 3.3 Route map

The public product includes:

- `/` — lightweight, crawlable landing page.
- Auth routes — registration, verification, login, password recovery, and email-change UI.
- `/app` — trainer home and mode selection.
- `/app/train/*` — Practice and Ranked trainer experiences.
- `/app/sensi-lab` — blind calibration.
- `/app/sensi-battle` — counterbalanced A/B comparison.
- `/app/mouse-swap` — nominal and performance-adjusted device migration.
- `/app/crosshair` — presets/editor/share-code flow.
- Public leaderboard and archived-board routes.
- Public profile routes and private account/settings/history surfaces.
- Sensitivity converter, cm/360, eDPI, and related useful tools.
- Documentation and open-source/community pages.

SEO/GEO pages MUST provide genuine interactive or explanatory value, correct metadata, canonical URLs, structured content, sitemap/robots support, and Open Graph data. Keyword stuffing and doorway pages are prohibited.

### 3.4 Account and device-facing behavior

An account is required for actual training in v1. Registration collects username, email, and password—never a phone number. Normal login does not require OTP. Verification, password recovery, email change, and security-sensitive account events use purpose-bound OTP flows owned by the private service.

Public UI MUST use non-enumerating, stable messages and MUST NOT expose whether an email/account exists through its copy. Usernames are ASCII-safe in v1, with a display value and a normalized uniqueness key.

The private auth contract uses Better Auth for email/password and sessions rather than a parallel credential system. OTPs are six digits, purpose-bound, approximately five minutes, limited to three atomic attempts, rotated atomically on resend, and stored only as a keyed HMAC with a versioned server-only pepper. Email normalization does not apply provider-specific dot/plus folding. Transient DNS/MX failures fail softly; a definite invalid domain or maintained disposable-domain match is handled by private abuse policy. Turnstile tokens are server-validated, single-use, and never treated as rate limiting. Password reset revokes prior sessions. Email change requires recent reauthentication and, where possible, confirmation of both current and new addresses. Ordinary users do not require 2FA; privileged administrators require server-side grants and TOTP step-up.

Training support is determined by capabilities, not a raw user-agent denylist. Required signals include a fine pointer, Pointer Lock, a supported rendering path, suitable viewport, and other mode-specific input capabilities. macOS with an external mouse is supported when capabilities pass.

Mobile/tablet users may use landing, auth, profile, statistics, leaderboards, converter, Mouse Swap, crosshair, and docs. Unsupported training shows an honest message and a copy-link/QR route to desktop:

> Training requires a desktop/laptop and mouse.

Public profiles may show username, legitimate-participation level, per-mode PB/rank, earned achievements/title, the latest 6–8 sessions, and sensitivity/mouse data only when separately published. Complete history and permanent PB are distinct. MVP rewards are account level, mode rank, achievements, titles, and lightweight shareable PB cards—not purchasable cosmetics or streak pressure. The footer may contain a subtle support link; v1 has no ads.

## 4. Authoritative gameplay runtime

The canonical runtime is:

```text
browser pointer/button events
        ↓
preallocated bounded ordered input buffer
        ↓
causality-preserving aggregation
        ↓
fixed authoritative simulation ticks
        ↓
collision + public scoring/metrics
        ↓
canonical proof/checkpoint data
        ↓
double-buffered logical render snapshot
        ↓
warmed Canvas2D or WebGL2 renderer
```

### 4.1 Deterministic core contract

`aim-core` is pure TypeScript and MUST:

- Receive integer ticks and explicit event sequence/order only—never browser wall-clock timestamps.
- Use seeded, versioned deterministic PRNGs; `Math.random()` is forbidden.
- Use integer/fixed-point geometry and explicitly documented rounding.
- Avoid implementation-dependent transcendental `Math.*` operations in authoritative paths. Required curves/angles use integer geometry, LUTs, or versioned deterministic approximations with golden vectors.
- Have no React, DOM, browser API, network, persistent-storage, ambient clock, locale, or environment-dependent dependency.
- Fail explicitly on invalid ranges or overflow; silent wrapping, saturation, precision loss, and accidental floating-point coercion are forbidden.
- Produce identical canonical states, metrics, score components, and hashes for identical version tuple, seed, configuration, and ordered inputs.

Simulation cadence remains deliberately undecided until profiling. Once selected for a ranked `engineVersion`, its tick duration and catch-up policy are permanently version-bound. A release cannot silently alter cadence.

### 4.2 Ordered input and aggregation

The browser adapter MAY observe browser timestamps for local diagnostics and tick assignment, but the values crossing into `aim-core` are canonical integer tick/sequence data.

Movement aggregation MUST preserve causal order. Consecutive movement samples may be accumulated only while no semantic boundary intervenes. It is forbidden to aggregate movement across:

- A shot press.
- A button release needed for shot-state validity.
- A focus/visibility/Pointer Lock transition.
- A run-state or scenario semantic event.
- A chunk/checkpoint boundary when aggregation would alter canonical proof order.

One shot is a discrete mouse-button `UP → DOWN` transition. Repeated `DOWN` events while held do not autofire in v1 scenarios. Every authoritative shot either hits according to the frozen collision rule or counts as a miss.

The raw buffer, drain count, work per drain, total proof bytes, event count, and supported processing resolution all have hard versioned maxima. `Maximum` means the highest supported detail subject to those limits, never unbounded work.

Any overflow is recorded in run-health/proof metadata. If overflow destroys exact causal replay, Ranked MUST invalidate or downgrade the run; it can never remain fully verified. Practice may continue with a clear health warning.

### 4.3 Canonical binary representation and hashing

Authoritative hashes MUST never serialize JSON. Each protocol version publishes an exact binary field table containing field order, fixed width, signedness, valid range, framing, and endianness.

The canonical primitive rules are:

- Fixed-width integers only in authoritative records; no IEEE floating point.
- Explicit `u8/u16/u32/u64` and `i32/i64` encodings with protocol-declared endianness.
- Booleans encoded only as `u8` `0` or `1`.
- Enums encoded only as their declared integer discriminants.
- Variable byte sequences and arrays use a declared fixed-width length/count prefix and are rejected before allocation when out of bounds.
- Non-canonical encodings, unknown versions/discriminants, trailing bytes, truncated fields, and out-of-range values are rejected.

Public codecs MUST use `DataView` or equivalent explicit endian operations, never host-native typed-array byte order. The concrete v1 field tables and selected endianness are frozen with the protocol package and independent golden byte vectors before implementation may be called Ranked-ready.

Hash purposes use separate exact ASCII domains:

```text
FMS:RANKED-CHUNK:V1
FMS:STATE-HASH:V1
FMS:SETTINGS-HASH:V1
FMS:TICKET:V1
```

The ranked chunk chain is conceptually:

```text
SHA-256(
  domain
  || canonical run ID
  || canonical sequence
  || previous chunk hash
  || server nonce
  || canonical chunk bytes
)
```

This provides chronology and tamper evidence. It is not proof that a human created the input.

### 4.4 Render snapshots

Render state is logically immutable to consumers but backed by preallocated A/B storage:

1. Simulation writes only to the inactive snapshot.
2. A complete snapshot is published atomically at a tick boundary.
3. Renderer reads only the published snapshot and cannot mutate it.
4. Buffers are reused only after ownership switches.

No per-frame object graph is required. Tests MUST prove the renderer cannot observe a partially written state and that renderer reads cannot influence authoritative simulation.

### 4.5 Fixed event semantics

Each scenario release freezes same-tick ordering. The default v1 semantic model is:

1. Targets scheduled for the tick become active at tick start.
2. Targets are eligible on the half-open interval `[spawnTick, expiresTick)`; expiration occurs before inputs on `expiresTick`.
3. Ordered input events are applied by sequence. A shot tests geometry at its exact position in that sequence.
4. A boundary is a hit when the canonical squared distance is less than or equal to the squared radius.
5. Official seed validation prevents overlap. If an invalid overlap reaches runtime, the smallest canonical target ID wins deterministically and run health records the scenario defect.
6. A hit removes its target immediately. A replacement activates only at the release-defined spawn phase and cannot be hit by the same shot.
7. Metrics, score components, terminal checks, and the state hash are finalized in their published order.

Any scenario that needs different semantics requires a new version with an explicit order and golden boundary vectors.

### 4.6 Simulation stalls and recovery

Catch-up work is bounded; an unconstrained `while (behind) step()` loop is forbidden. A release defines the recoverable scheduler-stall envelope. A stall that destroys input/simulation integrity is a Ranked health violation and may invalidate the run. A rendered-frame drop alone does not invalidate Ranked when input, ticks, event order, and proof remain exact.

Practice may recover more permissively and can pause/rebuild after Pointer Lock or renderer loss. Ranked never resumes after meaningful focus/visibility loss, unexpected Pointer Lock loss, hard heartbeat expiry, replay-destroying overflow, renderer/context loss, or unrecoverable simulation backlog.

Practice and Ranked expose different mutation contracts. Practice may pause, restart, change sensitivity, change permitted target presentation, and alter explicitly practice-only training parameters. Ranked cannot pause. Its canonical sensitivity, input-calibration identity, scenario/difficulty, authoritative settings, engine/scenario/scoring versions, renderer choice, viewport policy, and any other field covered by `settingsHash` are frozen before activation. A Ranked mutation attempt is rejected and, when it could make exact replay ambiguous, invalidates the run. The Protocol V1 Freeze enumerates every hashed field and its canonical encoding; no Ranked implementation may add an unbound authoritative setting.

## 5. Public API and ranked protocol

The public protocol package is the only compile-time contract shared with the private service. It contains public DTOs, Zod validation, binary codecs, compatibility metadata, public errors, fixtures, and golden vectors. It contains no persistence model or private decision policy.

### 5.1 Versioning and transport

- The stable HTTP namespace is `/api/v1`.
- Control-plane requests/responses use bounded JSON validated at both ends.
- Ranked proof data uses a compact, canonical, bounded binary encoding.
- Every run records client build, protocol, engine, scenario, scoring, PRNG, seed-bank, and verifier identities as applicable.
- Compatible control-plane versions may overlap during deployment. Ranked engine/scenario/scoring behavior is exact; compatibility MUST NOT mutate frozen rules.
- A protocol mismatch triggers at most one hard reload and compatibility retry. If still unsupported, the UI shows a stable recovery screen. A ranked ticket is never requested before compatibility is established.

Before production route handlers, canonical codecs, ticket verification, or private endpoint adapters are implemented, the public repository MUST approve and publish a **Protocol V1 Freeze** artifact. Exploratory benchmark prototypes may precede this gate, but are non-release tooling and cannot become a production contract implicitly. The freeze contains:

- exact HTTP methods and paths;
- caller class, authentication, authorization, CSRF, Origin/Fetch-Metadata, and cache policy;
- request/response schemas, status codes, stable public errors, size limits, and idempotency behavior;
- exact ticket fields and canonical signature bytes;
- exact binary magic, field order, widths, signedness, endianness, framing, discriminants, domains, and rejection rules;
- named resource maxima and their approved numeric values for the owning release;
- supported-version and compatibility rules;
- independently derived golden bytes, hashes, signatures, malformed vectors, and expected outcomes.

No Ranked-capable implementation may substitute illustrative fields, conceptual paths, or locally selected limits for this artifact.

The public endpoint families include account/session DTOs, settings, profiles, leaderboards, history, sensitivity data, ranked creation/sync/finish/status, exports, and deletion requests. Exact paths and all request/response schemas are frozen in the versioned protocol package before implementation. Ranked lifecycle paths are conceptually:

```text
POST /api/v1/ranked/runs
POST /api/v1/ranked/runs/{runId}/activate
POST /api/v1/ranked/runs/{runId}/sync
POST /api/v1/ranked/runs/{runId}/finish
GET  /api/v1/ranked/runs/{runId}
```

State-changing browser requests MUST carry validated same-origin request context using SameSite cookies plus `Sec-Fetch-Site`, `Origin`, and an appropriate CSRF/custom header/token. A sibling subdomain is not automatically granted ranked authority. The private service decides enforcement; the public client consistently supplies the required contract.

Production uses HTTPS/TLS everywhere, HSTS after domain/subdomain rollout review, a strict nonce/hash-based Content Security Policy without `unsafe-eval`, `frame-ancestors` protection, `X-Content-Type-Options: nosniff`, a restrictive `Referrer-Policy`, a least-privilege `Permissions-Policy`, and Secure/HttpOnly/appropriate SameSite cookies. Header behavior is integration-tested at the same-origin edge and direct private origin. `includeSubDomains` or HSTS preload is enabled only after every affected hostname is verified. Custom "encrypted API payload" schemes are prohibited without a reviewed threat model; TLS, canonical signatures, and private at-rest/proof encryption serve distinct purposes.

### 5.2 Ranked ticket

The canonical Ed25519-signed ticket payload contains exactly these field identities, with widths and encodings frozen by the protocol version:

```text
ticketClass
runId
principalBinding
createRequestId
modeId
boardId
protocolVersion
engineVersion
scenarioVersion
scoringVersion
verifierVersion
seedBankVersion
seed or releasedSegmentSeed
settingsHash
tickDuration
durationTicks / maximumTerminalTick
issuedAt
expiresAt
initialNonce
releaseId
kid
signature
```

Aliases are forbidden in canonical encoding. The Ranked creation request MUST NOT accept `ticketClass`, smoke status, eligibility, PB/leaderboard permissions, or competitive-write flags from the client. The private service assigns those properties, and the client treats them as signed read-only output. Wall-clock fields belong to protocol validation, not aim-core. `ticketClass=PRODUCTION_SMOKE` is reserved for trusted release verification and can never update PBs, leaderboards, achievements, or competitive progression.

Ed25519 is the only accepted ticket-signature algorithm for Protocol V1. A ticket `kid` selects only a key from a trusted, versioned `RankedVerificationKeySet`; a ticket cannot supply or select an arbitrary algorithm or public key. The live client key set retains a retired public key until no ticket signed by it can still be active. Independently, the private historical verifier registry retains that public key for as long as any retained replayable proof requires it. Key retirement MUST NOT make a retained official record unreplayable.

The key set is pinned to an approved public release or obtained through a versioned same-origin contract anchored by that release. The private signing key never reaches this repository or a browser. Browser-shipped HMAC secrets are prohibited.

### 5.3 Ranked state machine

The externally observable lifecycle is fixed:

```text
CREATED → ACTIVE → FINISHING → VERIFIED
                            ├→ PROVISIONAL
                            ├→ REVIEW
                            └→ REJECTED

CREATED → EXPIRED
CREATED → INVALIDATED
ACTIVE  → INVALIDATED
ACTIVE  → EXPIRED
```

`CREATED → ACTIVE` occurs only through the explicit activation operation after ticket validation and the standardized ready/countdown. Activation is idempotent by run, `activationRequestId`, and canonical request hash. An identical retry returns the same activation acknowledgement; a conflicting retry is rejected. The server atomically binds the accepted activation/deadline state before the client starts authoritative tick 0. If activation is not acknowledged, gameplay does not start; an unactivated ticket eventually expires. Account/security revocation may atomically move either `CREATED` or `ACTIVE` to `INVALIDATED`.

Terminal states never transition back. `INVALIDATED` cannot resume. The private store enforces transitions, expected sequence, and state version atomically.

Public result DTOs expose separate safe fields:

```text
runState: CREATED | ACTIVE | FINISHING | VERIFIED | PROVISIONAL | REVIEW | REJECTED | EXPIRED | INVALIDATED
verificationDisposition: VERIFIED | PROVISIONAL | REVIEW | REJECTED | null
competitiveEligibility: ELIGIBLE | WITHHELD | INELIGIBLE | REMOVED
```

`FINISHING` is the only verification-processing state. Before a verification disposition, `verificationDisposition` is `null`; after terminal verification it equals the immutable original `runState` disposition. `competitiveEligibility` is the current public projection after later policy/moderation adjudication and may change without rewriting the proof, replay, component metrics, score, or original disposition. Public responses expose no adjudication reason, risk value, threshold, evidence field, or private case identifier.

The public mapping is exact: `CREATED`/`ACTIVE` show no result; `FINISHING` shows processing; `VERIFIED + ELIGIBLE` shows verified and publishable; any disposition plus `WITHHELD` shows a neutral not-currently-published state; `INELIGIBLE` shows a completed noncompetitive result where disclosure is safe; `REMOVED` shows no longer published; `REVIEW` shows additional verification required; `REJECTED`, `EXPIRED`, and `INVALIDATED` use their stable neutral terminal copy. Contract tests enumerate every permitted combination and reject impossible combinations.

Public UI language is neutral:

- `FINISHING` — Submission accepted; verification is processing.
- `VERIFIED` — Score verified.
- `PROVISIONAL` — Verification completed, but this submission is not currently eligible for authoritative competitive publication. It does not later become `VERIFIED`.
- `REVIEW` — Additional verification required.
- `REJECTED` — This ranked submission was not accepted.
- `WITHHELD` / `REMOVED` — The result is not currently published.

`REVIEW` is not a public accusation. Private reason codes and risk details never appear in protocol schemas, UI, public logs, or this repository.

### 5.4 Idempotency, chunks, and deadlines

Before creation, the browser generates a random non-secret `createRequestId`. Repeating creation for the same authenticated user and ID returns the same run. Sync is idempotent by run/sequence/canonical request hash. Finish retries with the same canonical terminal payload return the same result; a different payload for the same finished run is a protocol violation.

Each accepted proof chunk binds:

- Domain literal.
- Run ID.
- Monotonic sequence.
- Previous accepted hash.
- Fresh server nonce.
- Canonical bounded chunk bytes.

The server acknowledges accepted chunks and supplies the next nonce. The parser rejects unknown versions, incorrect magic, excessive lengths/counts, invalid ticks, gaps, duplicate events, impossible repeated semantic records, non-canonical integers, impossible event order, data after the terminal tick, and total-limit violations before expensive replay. A transport retry for an already accepted sequence is permitted only when its canonical request/chunk hash is identical; it returns the exact stored acknowledgement and next nonce. The same sequence with different canonical bytes or hash is a protocol violation.

Heartbeat/sync timing includes empirically selected normal jitter tolerance followed by a hard deadline. There is no resumable Ranked freeze. Crossing the deadline stops simulation and permanently invalidates that attempt, even if connectivity returns shortly afterward. `navigator.onLine` is only a hint; actual server communication is authority.

### 5.5 Ranked client start sequence

The order is normative:

```text
UX session check
  → capability detection
  → exact-version resolution
  → load all required engine/scenario/protocol code
  → select and initialize renderer
  → warm engine and renderer
  → input-path test
  → private API/network preflight
  → user chooses Ranked
  → acquire Pointer Lock
  → request idempotent ticket
  → validate ticket
  → standardized ready/countdown
  → idempotently activate run and receive acknowledgement
  → start authoritative tick 0
```

No large code, renderer, scenario, shader, or asset load is allowed after ticket issuance. Only bounded heartbeat/sync/finish traffic follows.

Practice can continue locally through a network interruption, but the result remains visibly `PRACTICE / Not synced`. It can later upload a personal practice summary if allowed; it can never be retroactively promoted to Ranked, an official PB, global rank, competitive achievement, or score-based competitive XP.

### 5.6 Seeds and historical reproducibility

The browser necessarily knows current target state. V1 may give it the full deterministic seed, which also permits future-spawn precomputation by a modified client. This is an acknowledged browser limitation, not a security claim. Segmented just-ahead seed release is reserved as future hardening only if evidence justifies its complexity.

Every official ranked generation preserves reproducibility material:

```text
protocol package version and tarball hash
engine package version and tarball hash
scenario/scoring/PRNG/seed-bank identities
source commit and build metadata
canonical verifier release identity
independently derived golden vectors
historical replay regression fixtures
```

Old verifier releases need not be loaded in every live function, but a published official record remains replayable only while its exact compact proof and verifier artifacts are retained under the published retention policy.

### 5.7 Stable public errors

Public responses use boring, actionable, versioned codes such as:

```text
AUTH_REQUIRED
RATE_LIMITED
RANKED_RUN_EXPIRED
RANKED_RUN_INVALIDATED
RANKED_SEQUENCE_MISMATCH
RANKED_CONNECTION_LOST
RANKED_INPUT_OVERFLOW
RANKED_VERSION_UNSUPPORTED
RANKED_VERIFICATION_PENDING
RANKED_SUBMISSION_REJECTED
```

They MAY include a request ID. They MUST NOT include detection names, thresholds, risk scores, internal rule IDs, stack traces, SQL, provider secrets, or evidence that helps tune an evasion.

## 6. Scenarios, score, analytics, and leaderboards

Official scenario behavior is original, generic aim-training design. FindMySensi MUST NOT copy proprietary names, assets, map art, sounds, UI, scoring, or branding. Reference research may identify the general skill being trained; all released mechanics, visual identity, dimensions, seed policy, and scores are independently specified.

### 6.1 Scenario release unit

An official ranked release is an immutable bundle:

```text
identity
  modeId, engineVersion, scenarioVersion, scoringVersion, prngVersion
simulation
  duration, angular geometry, spawns, movement, collision, input rules
score
  primary components, integer formula, bounds
analytics
  metricVersion, mathematical definitions, interpretation rules
seedPolicy
  generator version, constraints, validation tooling/evidence format,
  seed-bank version and integrity hash
evidence
  pilot/holdout protocol, reliability, exploit and hardware results
artifacts
  source commit, package hashes, golden replay inputs and outputs
```

Authoritative scenario data—duration ticks, angular target dimensions, spawn/movement/collision rules, score parameters, permitted Ranked settings, and PRNG behavior—is separate from presentation metadata such as title, copy, thumbnail, background, appearance, instructions, and sound. Copy/localization changes MUST NOT create mechanical version drift.

Community scenarios MAY be declarative where generic properties suffice, but official Ranked promotion requires provenance review, strict bounds, determinism, goldens, a scoring specification, seed validation, pilot/holdout evidence, performance evidence, and a new immutable release.

### 6.2 V1 modes

V1 begins with fewer than ten tasks:

| Mode         | Authoritative skill/mechanics                                                                                         | Primary score inputs                                                            | Diagnostic examples                                       |
| ------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | --------------------------------------------------------- |
| Grid         | Three non-overlapping medium stationary targets; hit removes one and schedules a balanced replacement                 | Successful clears/hits and misses                                               | Acquisition time, corrections, path efficiency, direction |
| Pinpoint     | Six very small stationary targets; replacement on hit; precision and planning                                         | Precision clears/hits and misses                                                | Endpoint error, correction cost, route behavior           |
| Multi        | Stationary large/medium/small targets with equal release-defined opportunity quotas                                   | Hits/clears by published primary weights and misses                             | Size adaptation and target selection                      |
| Headline     | Targets in a controlled head-height corridor with deliberate vertical variation                                       | Hits/clears and misses                                                          | Horizontal maintenance and vertical correction            |
| Strafe       | Horizontal lanes with balanced left/right, speed, reversal, and stop opportunities in constrained unpredictable order | Hits/clears and misses                                                          | Intercept/reacquisition behavior                          |
| Smooth Track | Continuously moving target path with balanced motion opportunities                                                    | Simple integer formula using time on target and release-defined error component | Mean/p95 angular error, reversals, tracking loss          |
| Tempo        | Balanced targets synchronized to a versioned BPM/timing schedule                                                      | Successful hits plus published early/late and miss treatment                    | Timing bias and consistency                               |
| Sensi Lab    | Blind calibration tasks                                                                                               | Not ranked                                                                      | Candidate utility and confidence evidence                 |

Headline seed tests MUST reject trivial single-line memorization. Strafe seed tests MUST reject predictable reversal rhythms. Smooth Track evaluates both on-target time and angular error so target radius alone cannot dominate interpretation.

### 6.3 Ranked seed fairness

Ranked initially uses a prevalidated/constrained seed bank per scenario release. The public repository owns the deterministic seed generator, opportunity constraints, validator, evidence format, and public seed-bank version/integrity contract. The private repository owns the approved production bank contents, approval record, and server-side selection. Offline generation evaluates a large candidate pool and removes spatial, timing, motion, and opportunity outliers before approval.

Production bank contents are private operational data, not a cryptographic secret or a substitute for deterministic verification. A signed ticket reveals the selected seed material required for that run. The repositories exchange only released packages/contracts and integrity identifiers, never sibling filesystem data.

Every seed has equalized opportunity structure. Where relevant, release-fixed quotas cover target sizes, directions, speed bands, reversals, pauses, motion phases, and timing windows. A seed changes arrangement, not the quantity of skill opportunity.

### 6.4 Score versus diagnostics

Competitive score and diagnostic analytics are separate versioned concepts.

- The leaderboard formula uses a small, transparent set of primary outcomes that is hard to game.
- Rich metrics such as path efficiency, first-flick error, over/underflick, correction count, routing, jerk, and directional consistency do not affect v1 leaderboard order unless a future ranked version explicitly validates that choice.
- System-health values such as frame time, buffer occupancy, coalescing, and overflow never count as player skill.
- The public client may show a provisional score, but only the private deterministic replay computes an authoritative eligible result.

Each analytic metric has a mathematical definition and a `metricVersion`. `TargetAcquisitionTime` is used unless a task has a genuinely unpredictable stimulus/response that supports the narrower term `ReactionTime`. First-flick onset, correction boundaries, over/underflick axes, path-efficiency endpoints, tracking error, velocity, acceleration, and jerk are all specified and golden-tested.

Velocity/acceleration/jerk are derived from fixed simulation samples or another frozen normalized resampling pipeline—never raw polling-rate-dependent browser events.

Advice requires enough observations, a meaningful effect, valid run health, and an adequate metric reliability rule. A single run uses language such as “This run suggests…”. Stronger longitudinal advice uses only comparable sessions and still avoids false certainty.

### 6.5 Score arithmetic and validation

Every score version declares maximum duration, target/event counts, per-event contribution, cumulative bound, integer representation, and overflow behavior. Minimum, maximum legitimate, boundary, and malicious overflow inputs have golden vectors. Official scoring never silently wraps, clamps, saturates, or loses integer precision.

Scoring and scenario parameters MAY be tuned on an explicitly designated development/pilot cohort. A candidate is then frozen before holdout validation and before production leaderboard data is used for optimization. After public launch, any material change creates a new scenario/scoring version and board; the previous formula never changes in place.

Before holdout data is observed, the validation protocol declares sample-size and skill-distribution targets, session/retest design, primary reliability statistic and confidence interval, floor/ceiling limits, seed-variance tolerance, and hardware-equivalence tolerance. If hardware creates a material competitive advantage, the system fixes or gates the mechanic/path; v1 never multiplies scores by a hardware-normalization factor.

### 6.6 Leaderboards and records

- Every mode/version has its own permanent global board; no daily/weekly/monthly board in v1.
- One user has at most one active row: their best currently eligible authoritative score for that board under the immutable verification disposition plus current append-only adjudication projection.
- Equal scores receive equal competitive rank. `achievedAt` may order display but does not break the tie.
- Standard competition ranking follows, e.g. `#12, #12, #14`.
- Percentile uses unique verified players, not runs, and remains hidden below a sufficient predeclared population.
- PBs are separate from recent runs and are never replaced by lower scores.
- Archived modes retain PBs, history, leaderboard archives, version identity, and profile records.
- A moderation invalidation preserves an internal auditable decision while public UI uses stable neutral language.
- Canonical raw component metrics are preserved independently from the immutable composite score, subject to privacy/retention policy.

Normal UI may display “Grid” without engineering version noise. When incompatible boards exist, it exposes Current and clearly labeled Legacy boards. Records and evidence always retain the complete version tuple internally.

### 6.7 Results contract

Every completed run shows the run class/status, score, PB comparison, and—when population/eligibility permits—global rank and percentile. It also shows applicable primary outcomes such as hits, misses, accuracy, acquisition time, first-flick error, corrections, over/underflick, path efficiency, consistency, tracking error, directional strengths/weaknesses, and run-health/performance context such as average FPS and frame stability. A metric appears only when its versioned mathematical definition applies to that scenario and enough valid evidence exists.

The results view includes a short cautious interpretation and lightweight history where data exists: recent score, sensitivity-recommendation history, directional weakness, accuracy, and aim-category summaries. HTML/CSS/SVG and semantic table/text equivalents are preferred; a charting dependency requires bundle evidence. Advice never overstates a single run or presents system-health measures as player skill.

## 7. Sensitivity, conversion, calibration, and crosshair

### 7.1 Canonical unit domains

FindMySensi MUST make hardware/game counts and browser movement units incompatible at the type level:

```text
NanoDegreesPerDeviceCount
NanoDegreesPerBrowserInputUnit
```

There is no implicit cast or shared alias. A browser `movementX` unit is never assumed to equal a physical sensor/device count. Translation requires an explicit, versioned `InputUnitCalibration` with provenance and categorical confidence.

The game/physical formula for a validated linear-yaw adapter is:

```text
degreesPerDeviceCount = gameSensitivity × gameYaw
cmPer360 = 914.4 / (DPI × degreesPerDeviceCount)
```

User-reported DPI is stored conceptually as `nominalDpi` with source `USER_ENTERED`, `DEVICE_SOFTWARE`, or `MEASURED`. The resulting value is nominal cm/360 unless effective CPI was measured. UI may show a concise value with an explanation such as “Calculated from your reported 800 DPI.”

For compatible linear-yaw games on the same DPI, cross-game conversion does not require DPI:

```text
targetSensitivity = sourceSensitivity × sourceYaw / targetYaw
```

DPI is required for cm/360 and old-DPI-to-new-DPI conversion. Exact decimal parsing and rational/`BigInt` math MAY be used off the hot path. The engine receives a precomputed fixed integer gain.

### 7.2 Evidence-backed game registry

Each game adapter is versioned and declares:

```text
game/build identity
model and exact parameters
hipfire policy
input assumptions
source/evidence metadata
measurement methodology
checked date
categorical confidence
known limitations
```

V1 publishes only adapters supported by in-house measurement and review. Valorant and CS2 are first candidates; Overwatch 2 and Apex remain later candidates pending current-build validation. ADS/scope conversion is excluded. Community constants alone are not labeled official or exact.

Game-derived cm/360 from a validated adapter plus nominal DPI may be shown directly as nominal. Browser-derived physical/game values are gated by `InputUnitCalibration` confidence. Where the browser-to-device mapping is uncertain, FindMySensi returns a valid internal trainer sensitivity and labels game/cm output `Low` or `Moderate` confidence instead of implying physical certainty.

### 7.3 Known-sensitivity flow

An experienced user may enter a game, game sensitivity, and nominal mouse DPI. With an approved versioned adapter, the client validates the game-specific range/step and hipfire/ADS policy, converts to the canonical sensitivity domain, reports the adapter/provenance version and nominal confidence, and offers to save the game configuration plus canonical trainer setting. No calibration is required.

Saving is explicit and idempotent. The persisted DTO contains the source game/adapter version, entered sensitivity, `nominalDpi` plus source, derived canonical value, confidence/provenance, and user-selected primary-game status. It never persists a browser raw-input stream. The trainer consumes the saved canonical value through the typed setting boundary; it does not repeatedly reverse-convert from display strings. Unsupported or stale adapters produce an honest unsupported/reverify state rather than a guessed conversion.

### 7.4 Blind calibration

Blind calibration does not request or display the user's current game sensitivity before freezing its recommendation. A product-defined neutral reference—not the current sensitivity—anchors a bounded logarithmic search.

The intended flow is:

```text
environment/input preflight
  → neutral reference block
  → coarse candidates (approximately five)
  → narrower candidates (approximately three)
  → finalists (approximately two)
  → counterbalanced confirmation
  → frozen balanced result/range
```

Every candidate begins with a short unscored acclimation segment. Immediate switch carryover is discarded. Each candidate then receives comparable precision, acquisition, and tracking blocks. Exact durations and counts are pilot-selected and version-bound.

Repeated neutral reference blocks at the start, middle, and end measure learning, fatigue, and environment drift. They do not reveal or reuse the user's current sensitivity. Material drift lowers confidence or requests a confirmation session.

Heterogeneous metrics are combined only through predefined, tested, versioned task-utility functions. Within-user paired differences, robust ranks, and robust aggregation are preferred over arbitrary mixing of raw percentages, milliseconds, and angular error.

Confidence is only `LOW`, `MODERATE`, or `HIGH` in v1. High confidence requires sufficient valid blocks, repeated separation from the runner-up, agreement across task families, confirming finalists, stable environment, and no material learning/fatigue signal. FindMySensi MUST NOT display an uncalibrated probability such as “93.7% confidence.”

Disagreement is useful. The result may report a balanced range and explain a tracking/precision tradeoff rather than forcing a mythical perfect point.

### 7.5 Reveal My Real Sens research benchmark

After the recommendation is irreversibly frozen, an experienced user MAY opt into “Reveal My Real Sens.” The prior sensitivity is never available to the recommendation algorithm. With separate research consent, the product records the frozen recommendation, algorithm version, post-result revealed value, and comparison error for aggregate validation.

Research participation is optional and never affects access, rank, calibration result, or account status.

### 7.6 Sensi Battle and Mouse Swap

Sensi Battle presents equivalent deterministic blocks for neutral A/B candidates using a predetermined counterbalancing schedule. Candidate identity order and left/right position are both counterbalanced; values, accent color, labels, and visual emphasis cannot favor one choice before reveal. It compares the applicable versioned objective measures—accuracy, first-flick error, corrections, tracking, acquisition time, consistency, and over/underflick—then asks `A`, `B`, or `COULD_NOT_TELL`.

The versioned decision rule gives objective performance more weight than subjective preference, declares tie/insufficient-evidence behavior, and records both without pretending they are the same signal. A winner may face a bounded neighboring candidate; each round preserves equivalent opportunity and acclimation. The final output updates the recommendation/range only after the frozen stopping rule is met and reports categorical confidence and evidence provenance.

Mouse Swap separates:

- **Nominal mathematical match** from reported DPI values.
- **Measured physical match** only when effective CPI is measured.
- **Performance-adjusted recommendation** learned through counterbalanced practice.
- A suggested range when evidence does not justify one point.

Passive histories are partitioned by a low-entropy `CalibrationEnvironmentKey` and meaningful mouse/DPI/input-profile changes. The key exists only to decide whether sessions are comparable. It cannot identify a person, become a risk identity, or be repurposed for advertising/analytics.

### 7.7 Crosshair system

V1 includes approximately six original presets: Classic, Small Cross, Tiny Cross, Dot, Outlined Dot, and Open Cross. The editor supports color/opacity, center-dot controls, outline controls, and inner/outer line enablement, length, thickness, gap, opacity, and outline.

Crosshairs serialize to a compact, validated, versioned FindMySensi share code. There is no marketplace or ranking. Practice may allow broad customization. Ranked allows safe player-owned crosshair shape/color/thickness while standardizing task visibility; low crosshair contrast produces a warning rather than silently changing an expert user's choice.

### 7.8 Passive recommendation refinement

After an initial calibration, comparable normal Practice sessions may refine the recommendation using a documented, deterministic/statistical algorithm. Inputs are limited to valid versioned summary metrics, run-health eligibility, canonical sensitivity, and a matching `CalibrationEnvironmentKey`; Ranked proof streams and private anti-cheat features are not repurposed for this model.

The algorithm uses an explicit recency-weight function or bounded rolling window so old evidence cannot dominate indefinitely. Its version fixes eligibility, weighting, minimum evidence, outlier handling, recommendation/range update rule, confidence rule, and reset behavior. It preserves the initial result and each subsequent recommendation as provenance-bearing history rather than rewriting history. Material environment changes partition the series and lower confidence until enough new comparable data exists.

`CalibrationEnvironmentKey` and `PerformanceEnvironmentKey` each require a versioned field allowlist, coarse bucketing, predeclared encoded-cardinality/entropy ceiling, enumerated-combination test, and privacy approval before persistence. Raw hardware identifiers, exact high-entropy timing signatures, full user agent, IP address, fonts/plugins, canvas/audio output, or an unbounded field cannot enter either key. Any allowlist or ceiling change requires a privacy review and new key version.

## 8. Rendering, performance, and device behavior

### 8.1 Renderer and viewport invariants

Canvas2D is the mandatory ultra-light path; WebGL2 is optional and adopted only with measured benefit. Three.js, workers, `OffscreenCanvas`, and `SharedArrayBuffer` are profiling-triggered decisions, not milestones. A prototype must preserve identical canonical outputs and materially improve the target hardware before adoption.

Ranked uses one canonical angular viewport. Native, 2560×1440, 1920×1080, 1600×900, 1280×960, 1280×720, and custom render sizes; 16:9, 16:10, 4:3, 5:4, and custom aspects; and Fit, Stretch, and Black Bars are presentation transforms over the same authoritative field. A wider display cannot reveal more spawn space, and a narrow/stretched presentation cannot crop authoritative targets.

CSS pixels, device pixels, internal render pixels, and simulation angular units are separate. DPR and render scale never enter input/sensitivity math. Golden transforms prove identical canonical state across resolution, aspect, DPR, scaling, and renderer.

The renderer is selected, initialized, and warmed before a Ranked ticket and remains fixed for that run. Prevalidated mid-run presentation downgrades may reduce render scale, particles, weapon/background detail, or effects. They cannot swap Canvas/WebGL, change visibility rules, mechanics, target geometry, sensitivity, or input. Ranked does not auto-upgrade again until the next run. Catastrophic renderer/context loss invalidates Ranked; Practice may pause, reconstruct, and resume after a successful health check.

Ranked target/background luminance, contrast, opacity, outline, trails, spawn visibility, and obscuring hit effects are standardized or limited to benchmarked-equivalent presets. Weapon visibility/handedness and safe crosshair settings are player-owned. Any weapon is an original decorative silhouette and never affects collision.

### 8.2 Presets and automatic tuning

Graphics presets are Potato, Low, Balanced, and High, with Automatic as the initial recommendation. Potato uses the least expensive correct path: simple shapes, flat background, no expensive effects, reduced internal resolution, and minimal hit feedback. Higher presets MAY add modest, measured presentation only.

Automatic tuning uses capability hints plus a short benchmark and observed frame health. It downgrades only after sustained poor health, uses hysteresis/cooldown, and never silently changes input processing or sensitivity. Missing optional performance APIs report `measurement unavailable`, not `unsupported`.

Input Processing presets are Automatic, 1000, 2000, 4000, 8000 Hz detail targets, and Maximum. They describe internal processing, not hardware polling controls. Each is bounded by maximum buffer capacity, events per drain, proof events, and work budget. A manually selected unstable mode fails Ranked preflight with a recommendation.

Ranked run health records coarse, non-ranking evidence including input-path version/source, processing preset, observed event-rate band, coalescing/raw availability, overflow, simulation backlog, and renderer family. A competitive advantage caused by a path is fixed or capability-gated, never score-normalized.

Browser measurements are named `InputProcessingDelay` and simulation-to-render delay. FindMySensi MUST NOT call them true mouse-to-photon latency without external instrumentation.

### 8.3 Performance targets and bundle boundaries

The intent is stable 60 FPS at 1280×720 Potato/Low on representative minimum hardware where browser/hardware permits. Exact p95/p99 release thresholds are frozen only after profiling. Ranked validity depends on input/simulation integrity, not perfect visual FPS.

Performance tests simulate 125/500/1000/2000/4000/8000 Hz streams and measure simulation misses, buffer high-water mark, drops/coalescing/overflow, frame-time p50/p95/p99, internal delays, allocations, heap growth, long tasks where available, and context failure.

Bundle CI MUST prove that landing, login, profile, and leaderboard routes contain zero trainer-runtime packages. Mock code is absent from the production graph. Runtime packages load only in trainer/calibration flows. Budgets start from measured baselines and become non-regression gates.

Representative release hardware includes the minimum i3-class integrated-graphics machine, mainstream Windows with a 1000 Hz mouse, controlled 4000/8000 Hz input, current macOS with a mouse, Windows multi-monitor, and concurrent GPU-load/long-session trials where practical. Automation is never claimed as proof of physical raw-mouse correctness.

## 9. Visual UX and accessibility

The visual system is dark, precise, premium, performance-first, and restrained: graphite surfaces, off-white text, one signal-lime product accent, separate semantic status colors, Geist via `next/font`, Geist Mono for numeric/technical data, restrained 8 px radii, and individually imported Phosphor icons. Motion is subtle and respects reduced motion outside essential training behavior. Charts use lightweight HTML/CSS/SVG.

Foundation tokens cover color, spacing, radius, type, borders, shadow, focus, motion, z-index, and control sizes. Application semantic tokens (`status.error`, etc.) are separate from game tokens (`game.target`, etc.). Normal controls target 32–40 CSS px or more; all satisfy WCAG 2.2 AA target-size requirements (at least 24×24 or qualifying spacing). Focus is visible, high-contrast, consistent, and not obscured; enhanced focus appearance is a voluntary quality target.

1280×720 is the source-of-truth application viewport. Application navigation targets 56–64 px and has an 80 px hard ceiling. Every core view keeps the primary action and score/PB/rank priority visible, avoids required horizontal scrolling, and keeps dialogs/settings usable. Full-height trainer/app layouts use modern viewport units deliberately; long marketing/docs pages use stable document flow rather than universal `100dvh` sections.

Before UI implementation for any state begins, its responsive design, hierarchy, interaction states, accessibility behavior, and 1280×720 composition require explicit human approval. The approved design may be refined through a new review, but implementation cannot silently replace it. The required pre-implementation design set is:

1. Landing page.
2. Registration.
3. Trainer/home.
4. Running HUD.
5. Pause/settings.
6. Results analytics.
7. Leaderboard.
8. Public profile.
9. Find My Sensi calibration.
10. Sensi Battle.
11. Mouse Swap.
12. Crosshair editor.
13. Unsupported mobile training.
14. Potato Mode/performance setup.

The landing hero uses an optimized truthful capture from the real trainer once available and still ships zero trainer runtime.

Application chrome, auth, profiles, results, leaderboards, settings, and tools target WCAG 2.2 AA and keyboard/screen-reader usability. The visual fine-mouse aim task is honestly documented as requiring visual targeting and a mouse; it is not falsely represented as keyboard- or screen-reader-equivalent. The canvas has restrained labeling/instructions and does not receive `role="application"` without demonstrated need.

Live regions announce meaningful lifecycle/errors—Pointer Lock failure, connection loss, invalidation, completion, form errors, PB—not each target, hit, score, timer, or stat update. Every chart has a title/description, visible values, and semantic text/table equivalent rather than relying on SVG paths.

## 10. Public-facing privacy and data lifecycle

The governing rule is:

> Collect only what accounts, calibration, and verifiable competition require; keep sensitive gameplay evidence private, purpose-bound, access-controlled, and automatically expiring.

Account-required training remains a v1 requirement. Launch accounts are 18+ globally until counsel approves a lower-age design. The service stores only minimum-age-policy attestation/version/time, not full date of birth.

V1 has no ads, marketing trackers, data sale/sharing, covert fingerprinting, probabilistic cross-session identity, or persistent hardware-derived device ID. `PerformanceEnvironmentKey` and `CalibrationEnvironmentKey` are low-entropy comparability keys and never identity. A random first-party `AbuseInstallationId` is reserved, disabled in v1, and may be enabled only after documented abuse evidence, privacy review, disclosure, reset/rotation, purpose/retention limits, and a prohibition on advertising/analytics use.

Entering Ranked explicitly permits publication of username, verified score, rank, and board/mode. Public profile, sensitivity, mouse setup, and calibration history are separate opt-ins. Optional research has granular, revocable consent and is never required for access or competition.

Leaderboard publication is a distinct explicit setting and MUST be enabled before the private service may issue a `COMPETITIVE` ticket. Disabling it is an idempotent unpublish request that immediately blocks new Competitive tickets, removes the active public username/profile/leaderboard projection, and invalidates its public-cache entries or allows only the documented short TTL to expire. Eligible verified runs and PB data remain private only for their applicable retention period. Re-enabling publication does not silently republish an earlier result; a new explicit publication action is required. A separately governed official-record exception may retain only a lawful minimal pseudonymous entry such as `Deleted competitor`; no hidden reidentification mapping is permitted.

Raw practice pointer events remain in memory and are not persisted by default. Summarized practice history may remain in user-controlled local storage; only an explicitly saved summary is uploaded. Ranked submits a bounded proof to the private service. Public retention commitments are:

| Data                                              | Default                                                                                       |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Raw practice stream                               | Never uploaded by the v1 product; only an explicitly saved summary may cross the API boundary |
| Local practice history                            | Until the user clears it                                                                      |
| Saved summaries/settings                          | Until user/account deletion                                                                   |
| Ordinary verified proof                           | 30 days after terminal verification                                                           |
| Active PB/top-board proof                         | While competitively active, then 90 days                                                      |
| Published official-record proof                   | While the record is officially replayable                                                     |
| Suspicious/appealed proof                         | Case closure, at most 180 days absent lawful hold                                             |
| Consented debug trace                             | 14 days                                                                                       |
| Research sample                                   | Study-specific disclosed duration                                                             |
| Raw IP in restricted app-controlled abuse storage | Maximum seven days                                                                            |
| Rotating keyed abuse bucket                       | 30 days                                                                                       |
| Email delivery metadata                           | 30 days                                                                                       |
| Narrow security-state events                      | 90 days                                                                                       |
| Admin/moderation audit                            | 365 days, then documented review                                                              |
| Provider runtime logs                             | Provider-plan retention; never durable evidence authority                                     |

This table is the complete v1 category-level retention contract, subject only to disclosed lawful holds and counsel-approved exceptions. Restricted raw-IP storage is separate from ordinary application logging; full IP addresses remain forbidden in ordinary logs. A user-controlled local export may write raw Practice data to the user's own device but does not upload it. Any future raw-input research collection requires a separately approved protocol version, granular opt-in consent, stated purpose, explicit retention and withdrawal behavior, and privacy/security review; it cannot be introduced through an ordinary Practice-summary endpoint.

An official record without retained exact replay proof cannot continue to be described as historically replayable. Account deletion immediately revokes sessions/tickets and runs an idempotent private deletion workflow. Public identity/mappings are removed; any lawful minimal historical entry uses a non-reversible “Deleted competitor” identity, not a secret reidentification map. User-visible account deletion reports completion only after every eligible private proof/export/debug/research object deletion is reconciled or a disclosed lawful hold/exemption applies.

Recent password/security reauthentication is required for deletion, full export, and email change. Exports are bounded, asynchronous if needed, expire automatically, and use a short-lived authenticated download. User controls cover access, correction, export, leaderboard visibility, research consent, and deletion status.

The private service stores proof objects under reviewed authenticated encryption with versioned keys, authenticated metadata, idempotent cross-store deletion/reconciliation, and legal-hold controls. The public repository defines only safe contracts and privacy behavior; storage provider credentials, object identifiers, schema, and key material remain private.

Because persistence and object storage cannot share one transaction, proof deletion follows an idempotent private lifecycle equivalent to `ACTIVE → DELETE_REQUESTED → OBJECT_DELETED → METADATA_CLEANED → COMPLETE`, with reconciliation for either partial ordering. Legal hold atomically prevents a worker claim. New proof writes use the active AEAD/envelope key version; an older key becomes decrypt-only until its objects expire or are re-encrypted. Ticket-signing and proof-encryption keys are never reused.

Public/client logs MUST NOT contain passwords, OTPs/digests, cookies, authorization/session data, email, full IP/user-agent, request bodies, raw pointer streams, candidate sensitivities, proofs, private risk features, or secrets. Release/test evidence follows classification, redaction, retention, access, and deletion rules and uses synthetic data.

Safe observability uses allowlisted structured completion/state events with request ID, service/environment, release ID, route template, status/outcome, duration bucket, authentication state, safe ranked version/state, and dependency outcome. Raw bodies and query strings are never logged. Native platform metrics are preferred first; OpenTelemetry is added only if bounded events cannot answer cross-service questions.

Before launch, every service-level objective has a written numerator, denominator, measurement point, exclusions, and evaluation window; synthetic health is separate from real-user SLIs. Initial guardrails are 99.9% successful public pages for valid traffic, 99.9% authenticated API success, 95% valid ranked finishes returning terminal-or-accepted-pending within four seconds, 99% accepted verification reaching a terminal state within fifteen minutes, 99% intended transactional email accepted by the provider (not inbox delivery), and 99.9% retention/deletion jobs completed by deadline.

Initial recovery objectives are a two-hour Public/API service RTO and a fifteen-minute durable auth/competitive-data RPO. The private recovery specification defines the clocks, recovered service level, consistency point, and drill evidence. The RPO applies jointly to Turso metadata and ProofStore evidence; a write acknowledged as durable but absent from the reconciled recovery point counts as data loss. Production is blocked until provider and reconciliation drills pass those definitions. Restore, code rollback, key rotation, deletion, origin rejection, and environment isolation are rehearsed before launch.

Operational kill switches can stop new ranked tickets, pause PB/leaderboard writes, force queued-only verification, disable email resend, make moderation read-only, and disable a compromised key ID. Their state is durable, audited, step-up protected, only briefly cached, and fail-safe: if the private service cannot determine whether Ranked issuance is enabled during a relevant fault, it issues no ticket. A switch can never change a frozen score, seed, geometry, or accepted proof.

No launch artifact may claim blanket GDPR/CCPA/DPDP compliance. Privacy notice, terms, processor/transfers, age policy, retention/legal bases, official-record exceptions, hosting terms, and incident duties remain counsel/production gates.

## 11. Verification and test architecture

Work states are `IMPLEMENTED`, `MERGE-READY`, `RELEASE-READY`, and `PRODUCTION-VERIFIED`. “Done” without a state and evidence is invalid. Review covers correctness, readability/simplicity, architecture boundaries, security/privacy, and performance; reviewers inspect tests before implementation behavior.

Public test ownership includes deterministic math/PRNG, input ordering, scenarios/scoring, canonical encoding, sensitivity/calibration, renderers, UI/a11y/routes/bundles, mock API, golden vectors, and synthetic performance. Private tests own auth, persistence/migrations, ticket/state machine, authoritative verification/writes, proof storage, risk/moderation, retention, and private adversarial fixtures.

Cross-repository validation never uses sibling imports. Stable production pins exact released public packages. Coordinated changes use immutable public RC packages from a protected commit, with hashes/provenance; private staging pins exact RC versions; successful cross-repo validation promotes stable packages. Public forks cannot trigger private secret-bearing CI.

Deterministic proof has four distinct layers:

1. Unit/property invariants.
2. Independently derived golden/reference cases.
3. Browser integration ↔ private/Node verifier differential parity.
4. Historical replay regression.

Differential parity proves both environments interpret the same engine/protocol identically; it does not prove shared mathematics correct. Independent goldens provide that check. The private verifier MUST NOT fork a second gameplay engine.

The differential gates have distinct ownership:

- Public pull requests run browser-built-runtime versus Node public-integration parity using only public packages and synthetic/public fixtures; this never invokes private CI.
- Private pull requests run private-verifier integration against the exact currently pinned stable public packages and corresponding browser-produced fixtures.
- Coordinated cross-repository changes run browser/private differential validation only after an allowlisted protected public commit produces immutable RC artifacts for private staging.

Only the coordinated RC gate proves parity for a proposed cross-repository change. A public fork or ordinary public pull request cannot trigger it.

Mandatory public invariant tests cover semantic-boundary aggregation, same-tick ordering, tick-only core input, chunk-partition invariance, overflow propagation, snapshot ownership, viewport/DPR independence, score/range overflow, exact binary encoding, authoritative dependency allowlists, and cadence version binding. Seeded property failures record/minimize their seed/stream. Goldens cannot be auto-regenerated from the implementation under test; changes require independent derivation, review, and a new ranked version where behavior differs.

Browser coverage includes pinned release versions of Chrome, Edge, Firefox, and Safari; raw/fallback paths; permission/capability failure; macOS mouse; focus/lock loss; DPR 1/2; 1280×720, 1600×900, 1920×1080, 2560×1440; 16:9/16:10/4:3/5:4 Fit/Stretch/Bars; manual multi-monitor; and mobile training-blocked UX. Product support may say “current stable family subject to capability checks,” while evidence records exact browser versions.

PR CI covers lint/format, types, unit/property/goldens, browser-versus-Node public integration parity, contracts, production build, Chromium E2E, 1280×720, a11y scan, bundle graph, short polling benchmark, and changed-endpoint security tests. Nightly adds large properties, all historical goldens, full browser matrix, ranked mutation tests, soak, scans, migration/deletion compatibility, and historical replay. Release candidates add physical hardware, provider integration, migrations/key rotations, restore, origin protection, kill switches, rollback, and adversarial review.

Production verifies the exact stable package and deployment artifact hashes recorded in the sealed release manifest. RC evidence MAY be reused only when provenance proves the stable artifact was produced from the approved protected source and the reused check is unaffected by permitted release-metadata changes. Contract-, encoding-, hash-, differential-, and artifact-sensitive checks MUST run against the exact stable artifacts consumed by production. Production MUST NOT consume an RC package. Migrations, telemetry, rollback target, and smoke evidence are then confirmed before Ranked is deliberately enabled.

Determinism/security/protocol/auth/migration/a11y/1280×720 failures are not made green by retries. One visible diagnostic retry is allowed only for classified runner/browser-launch/external-sandbox failure. It does not erase the first failure. CI tracks flake rate by test/browser/workflow; critical deterministic/security tests tolerate zero flakiness. Quarantine requires owner/issue/evidence/mitigation and ≤14-day expiry; critical categories cannot be quarantined.

For final written-spec approval, the proposed initial general-suite budget in each repository is fewer than 0.5% retry-dependent job outcomes over a rolling 30 days, and no individual noncritical test may have two or more retry-pass failures in its most recent 20 executions. A coordinated release must pass both repositories' budgets. A retry-dependent outcome is a job that fails initially and passes without a source/configuration change on the permitted diagnostic retry; the denominator is completed executions of jobs eligible for that retry during the window. A failure proven to occur before test behavior executes because of runner startup, browser launch, or external-sandbox infrastructure is classified and tracked separately. It never erases the event or permits an unclassified test failure to be relabeled after the fact. Metrics are reported by repository, workflow, browser, job, and test where applicable.

Behavioral features and bug/security/protocol/database fixes begin with or include a test that fails without the intended behavior. Typo-only docs, architecture prose, nonfunctional asset replacement, changelog, and generated metadata may document why no executable test applies. Emergency mitigation may move quickly, but the regression test/permanent fix is required before normal release progression resumes.

## 12. Release, security, and open-source governance

Each child repository protects `main`: PRs, required trusted checks, no force pushes, stale-approval dismissal, conversation resolution, protected tags, and CODEOWNERS. Auth/protocol/scoring/telemetry/migration/CI/release/security changes require two appropriate approvals for production when maintainers exist. One-maintainer development still requires CI plus an independent review record.

Ranked production requires a competent human security reviewer who did not author its security design/implementation; AI review supplements but cannot replace this gate. Website, Practice, converters, and Sensi Lab may launch while Ranked remains disabled.

Security findings use a documented product rubric: technical impact, exploitability, privilege, data exposure, ranked-integrity impact, blast radius, availability, and active exploitation. CVSS may inform but not decide. Fabricated top scores can be High even if generic scoring is modest. Exceptions contain `riskId`, severity, owner, reason, compensating control, accepter, creation, and expiry; Critical/High block launch and no exception is permanent.

CI uses least privilege, no fork secrets, no unsafe privileged `pull_request_target`, full-SHA Action pins, locked/reviewed dependencies, secret/code/dependency/license scans, SBOM, immutable protected-tag artifacts, hashes, and provenance attestations. A PR changing workflows, deployment/release/migration/publishing scripts, infrastructure, CODEOWNERS, or rulesets cannot execute its modified privileged workflow with staging/production secrets before review and merge.

Every coordinated release receives a `releaseId` before its first deployment; the identifier is never reused. Its candidate manifest may be completed only through append-only, revisioned updates while deployment identities and evidence are produced. Once both repository commits, exact stable artifacts, deployment identities, schema/configuration versions, required evidence, and rollback target are known, the manifest is sealed and immutable. Ranked enablement requires the running deployments to match a sealed manifest. Aborted identifiers remain recorded and can never be activated or reassigned. The full manifest remains private; a sanitized public manifest publishes only safe public commit/version/build/artifact-hash information. Logs, support IDs, audit events, ranked runs, incidents, and evidence reference the `releaseId` plus candidate revision/state where applicable.

Production smoke uses a noncompetitive ticket/scenario and exercises ticket, chunk, heartbeat, finish, replay, proof storage, verification, and transaction paths with PB/leaderboard/achievement writes disabled.

Break-glass procedure is: declare incident → prefer kill switch → minimal fix → focused correctness/security tests → independent second look where available → emergency deploy → immediate verify → run normal gates → post-incident review. Ranked kill switches are preferred over risky live hotfixes.

The public repository is MPL-2.0. First-party source uses Exhibit A or `SPDX-License-Identifier: MPL-2.0`. Contributions use DCO 1.1 sign-off; no CLA in v1. Required public governance/onboarding files are `README.md`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`, `CHANGELOG.md`, `GOVERNANCE.md`, `.env.example` containing placeholders only, local-run documentation, funding, CODEOWNERS, PR template, CI, third-party/license notices, and distinct issue templates for bugs, features, performance, input problems, and training modes. A future trademark policy governs the name/identity separately from code copyright.

Security reports use a private channel with supported versions, triage expectations, counsel-reviewed safe harbor, coordinated disclosure, and reporter-credit preference. Production data, proofs, screenshots, secrets, migrations, private telemetry/thresholds, cases/bans, or incident details never become public fixtures. Fixtures are deterministic synthetic data with generator version/seed.

## 13. Definition of done and launch gates

A change is complete only when applicable evidence proves:

- Traceability to this specification and an approved implementation-plan task.
- A meaningful failing behavioral test, or documented non-behavioral exemption.
- Relevant unit/property/golden/contract/integration/E2E tests pass.
- Typecheck, lint, production build, and diff inspection pass.
- Whenever a development server was started, browser automation opened the site, verified rendering and console, inspected key controls, exercised the primary path, captured screenshots, and checked desktop plus mobile-size behavior; compilation alone is never UI evidence.
- Performance was measured for hot-path, bundle, DB, or network changes.
- Accessibility, security, privacy, protocol, docs/ADR/changelog, and migration impacts were handled.
- No secret, production data, private heuristic, mock code, or migration crossed into the public repository.
- Independent review and required CI passed with exact commands/artifacts reported.

When behavior breaks, the implementation workflow invokes `superpowers:systematic-debugging` before changing code. Before any completion claim it invokes `superpowers:verification-before-completion`, inspects the final diff, reruns the applicable tests/typecheck/lint/production build/browser checks, compares the result with the approved spec and plan, and reports concrete command/evidence output.

Ranked production remains disabled until deterministic browser/verifier parity, independent goldens, protocol adversarial tests, server-authoritative scoring, migration/restore, proof encryption/deletion/recovery, auth/CSRF/origin protection, hardware/browser evidence, accessibility/720p, privacy/legal/hosting, SLO/alerts, kill-switch/rollback, and independent human adversarial security review all pass. No unresolved Critical/High security issue may remain.

## 14. Assumptions and deliberately deferred numeric choices

These do not reopen the approved architecture; each is a measured implementation/release gate:

- Fixed simulation cadence, catch-up envelope, chunk cadence, heartbeat jitter/deadline, and buffer/work maxima.
- Score coefficients, target dimensions/durations, seed-bank size, and pilot/holdout statistical thresholds.
- Calibration range, block/acclimation duration, utility transforms, and confidence thresholds.
- Exact performance p95/p99/bundle budgets after representative baseline profiling.
- Whether WebGL2, workers, OffscreenCanvas, SharedArrayBuffer, or a durable verification queue earn adoption.
- Initial private ProofStore provider and proof-recovery capability.
- Game adapter publication after current-build measurement.
- Hosting plan, launch jurisdictions, legal wording, and any future under-18 flow.

Every deferred item requires a versioned `OpenDecisionRecord` before a dependent capability can become `RELEASE-READY`:

```text
decisionId
status and owner
dependent capability / release / version
candidate set
measurement, benchmark, pilot, or legal-review method
representative environment or cohort
predeclared acceptance criteria
raw evidence identities
selected outcome and rejected alternatives
version-binding consequences
reviewers / approvers
decision and review timestamps
```

A dependent task MAY build explicitly labeled measurement tooling or non-release prototypes while the record is open. It MUST NOT embed an unapproved production default. Parser maxima, simulation cadence, chunk/heartbeat deadlines, and ProofStore/recovery selection block their dependent Ranked work or release gate until decided. Once selected, a ranked-relevant value is bound to its owning immutable version; changing it requires the applicable new version and ADR/review.

No deferred value may be silently selected in production. It is documented, tested, version-bound where ranked-relevant, and approved through the implementation/release process.

## 15. Explicitly private and excluded from this document

The following MUST remain in `findmysensi-secure` or its restricted operational systems:

- Drizzle production schema, migration SQL/snapshots, database layout, indexes, and credentials.
- Better Auth secrets/configuration details, OTP pepper, session secrets, Turnstile/Brevo credentials.
- Ticket private keys, proof-encryption keys/hierarchy, origin-auth credentials, key custody/rotation runbooks.
- Risk features, formulas, thresholds, fraud models, investigation queries, ban rules, private error/reason mappings.
- Moderation evidence, user cases, IP-derived signals, detailed proofs, exports, production logs, and incident reproductions.
- Admin grants, privileged endpoints/operations, legal holds, kill-switch storage/control details.
- Complete release manifest, provider configuration, backup locations, recovery credentials, and security reports.

Public code may define safe protocol shapes and deterministic verification rules; it MUST never pretend private logic is secured merely because it is absent from this document.

## 16. Decision traceability

| Approved design section              | Normative coverage here                                                                                      |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| 1 — Repository/service topology      | §§2–3: sibling Git repos, ownership, independent builds, same-origin API, private migrations                 |
| 2 — Gameplay runtime                 | §4: causal input, fixed ticks, fixed-point determinism, snapshot reuse, binary hashes, overflow              |
| 3 — Ranked protocol                  | §5: versioned API, state/idempotency, Ed25519 lifecycle, resource bounds, deadlines, historical replay       |
| 4 — Private auth/data boundary       | §§2, 3, 5, 10, 15: public-facing auth contract and explicit private ownership without schema leakage         |
| 5 — Public application               | §§3, 5: split transports, server-only DTO boundary, preload order, bundle/mock/offline/version behavior      |
| 6 — Sensitivity/calibration          | §7: incompatible units, provenance, nominal DPI, acclimation/reference blocks, utilities/confidence/research |
| 7 — Scenarios/scoring                | §6: original modes, seed fairness, shot semantics, analytics separation, ranks, pilots, versioning           |
| 8 — Performance/device/rendering     | §§4, 8: canonical viewport, renderer fixation, DPR separation, safety ceilings, instrumentation, profiling   |
| 9 — Visual/UX/a11y                   | §9: ranked visibility, 720p, tokens/focus, honest canvas, live regions/charts, restrained assets             |
| 10 — Privacy/retention/operations    | §§2, 10, 12–15: age/consent, retention/deletion/export, no fingerprinting, evidence privacy, gates           |
| 11 — Verification/release/governance | §§11–13: layered evidence, RC flow, releaseId/smoke, human review, flake/CI/TDD, OSS, break-glass            |

## 17. Specification acceptance criteria

This formal public specification is acceptable when written-spec review confirms:

- Every approved amendment from Sections 1–11 is represented without contradicting an earlier approved decision.
- The parent remains non-Git and both sibling repositories are independent.
- Public/private ownership is unambiguous, especially private sole ownership of schema/migrations and authoritative writes.
- Deterministic input, engine, encoding, score, and version invariants are implementable and testable.
- Public UX, scenarios, sensitivity, performance, accessibility, privacy, and release behavior have measurable gates.
- Deferred values are identified as profiling/pilot/legal decisions rather than invented defaults.
- No private heuristic, threshold, credential, production schema, migration, or operational secret is disclosed.
- The companion private supplement can implement this public contract without a sibling filesystem import.
- Human grants final written-spec approval before `superpowers:writing-plans` produces the implementation plan.
