# FindMySensi Cross-Repository Execution Map

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to execute the public and private implementation plans task-by-task. This map coordinates gates; it does not replace either repository's plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Schedule the independent public and private implementation plans without sibling filesystem dependencies, premature production decisions, cross-repository artifact ambiguity, or unsafe Ranked enablement.

**Architecture:** `findmysensi` and `findmysensi-secure` remain independent builds joined only by immutable published packages, signed/provenance-bearing artifact manifests, and the same-origin `/api/v1/*` contract. Public owns protocol and deterministic runtime releases; private consumes exact artifacts and owns authentication, all production schema/migrations, proof custody, authoritative verification/writes, security policy, and operations.

**Tech Stack:** Node.js 22.x, npm workspaces, TypeScript, Next.js/React, Zod, Vitest/Fast-check, Playwright, Better Auth, Drizzle/Turso, Node Web Crypto, Vercel, Cloudflare, GitHub Actions.

**Specifications:**

- Public: `docs/superpowers/specs/2026-08-30-findmysensi-design.md`
- Private: the independently versioned `docs/superpowers/specs/2026-08-30-findmysensi-design.md` in `findmysensi-secure`

**Executable plans:**

- Public: `docs/superpowers/plans/2026-08-30-findmysensi-implementation.md`
- Private: the independently versioned `docs/superpowers/plans/2026-08-30-findmysensi-secure-implementation.md` in `findmysensi-secure`

## Global Constraints

- The parent `F:\Dev\findmysensi` is a workspace only and MUST remain non-Git.
- Never use `file:`, `link:`, workspace links, symlinks, relative sibling imports, source copies, or build-time copies between repositories.
- A path to the companion plan/spec in this document is a human documentation reference only. Automation MUST NOT read it across the sibling boundary.
- Cross-repository inputs arrive only as immutable registry packages and protected artifact manifests with exact versions, hashes, provenance, and approval identity.
- Public owns browser/UI, deterministic engine/input/rendering, scenarios/scoring, sensitivity/crosshair, public DTOs/codecs/goldens, mock API, and public evidence.
- Private is the sole owner of Better Auth integration, all production schema and migrations, Turso, ProofStore, Ranked issuance/verification/writes, risk/moderation/admin, secrets, privacy jobs, and the complete release manifest.
- The Protocol V1 Freeze blocks production codecs, public/private endpoint adapters, ticket verification, and Ranked parser implementation.
- UI code is blocked by its applicable human-approved design artifact. Headless logic and measurement tooling may proceed while UI approval is open.
- Production proof encryption/storage is blocked by the approved ProofStore provider and key-wrapping profile.
- Grid Practice and Grid Ranked are separate release gates. A working Practice mode is not evidence that Grid is eligible for a competitive board.
- Production registration and Ranked production are separate gates. Ranked remains disabled when accounts/Practice launch.
- Unreadable or missing critical state fails closed: no new Competitive ticket, no competitive write, no proof acknowledgement without durable evidence, and no release activation without a sealed matching manifest.
- Open decisions are resolved only through approved `OpenDecisionRecord` evidence. Code defaults, allocation sizes, provider examples, benchmark candidates, and current prototype constants cannot close a decision.
- Commands in this map run from one child repository at a time. A command in one repository MUST NOT name, scan, install from, or execute code in the sibling repository.

---

## 1. Phase and Plan Index

| Phase | Public plan work                                                         | Private plan work                                                             | Cross-repository exit                                                    |
| ----- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| X0    | P0-P1 baseline, governance, boundary checks                              | S0 baseline, secret/boundary checks                                           | Both clean builds; parent confirmed non-Git; specs/plans approved        |
| X1    | P2 public cadence/input/buffer/render measurements                       | Private pre-freeze parser/decompression/replay/network measurements           | Approved safe values exist for every Protocol V1 numeric field           |
| X2    | P3 Protocol V1 Freeze and independent reference vectors                  | Read-only security/operability review of the proposed freeze                  | Human protocol/security approval recorded; freeze hash immutable         |
| X3    | P4 protocol/codecs/golden package plus early protected publication       | Protocol-only artifact pin and contract conformance                           | Exact Protocol V1 stable artifacts pass in both repositories             |
| X4    | P5-P10 deterministic kernel, input, Grid candidate, Canvas, UI waves A/B | S2-S6 request security, migrations, Better Auth, OTP/abuse, account/read APIs | Headless Grid candidate and account platform independently green         |
| X5    | P11-P12 ordered as API/mock transport before authenticated Practice      | Account/privacy subset and staging same-origin integration                    | Production-registration gate may pass; Ranked remains disabled           |
| X6    | Grid pilot/holdout/release evidence; Ranked runtime RC packages          | Production seed-bank validation and Ranked runtime RC conformance             | Grid release tuple approved for coordinated Ranked staging               |
| X7    | Ranked client controller/status integration; UI approvals as applicable  | S7-S8 ProofStore decision and implementation                                  | Approved provider, envelope, deletion/recovery, and joint-RPO evidence   |
| X8    | Exact browser-produced fixtures and public differential evidence         | S9-S14 Ranked lifecycle, chunks/jobs, verifier, risk, privacy, operations     | Competitively disabled Ranked staging passes adversarial integration     |
| X9    | P13-P18 product breadth behind UI/game/calibration decisions             | Corresponding narrow account/read contracts and privacy handling              | Sensitivity, crosshair, scenarios, and calibration release independently |
| X10   | Public RC/stable release evidence                                        | S15 stable-artifact, security, legal, recovery, and smoke gates               | Sealed matching release; deliberate Ranked activation or explicit no-go  |

### Required ordering corrections

- Public API transports and the fail-closed mock must exist before the authenticated Practice vertical slice consumes them.
- UI approval Wave C/D must be recorded before implementing leaderboard/profile, known-sensitivity, crosshair, Sensi Lab, Sensi Battle, or Mouse Swap UI. Kernels may precede the UI gate.
- Private protocol-only artifact consumption must not wait for aim-core/scenario/scoring packages.
- Ranked runtime artifacts are pinned in a second handshake after the Grid candidate/runtime packages exist.
- Durable release/control ports must exist before Competitive or `PRODUCTION_SMOKE` issuance code can return success.
- A missing private risk decision path yields `REVIEW`/`WITHHELD`, never `ELIGIBLE`, until the reviewed risk policy is installed.
- Account privacy/export/deletion readiness must precede production registration even if later Ranked-proof reconciliation remains disabled until ProofStore exists.

---

## 2. Cross-Repository Artifact Contract

### 2.1 Artifact manifest minimum fields

Each public artifact handshake emits a machine-readable immutable manifest containing:

```text
artifactSet
channel: RC | STABLE
protectedPublicCommit
protocolFreezeHash
packageName
exactVersion
registryIdentity
registryIntegrity
tarballSha512
packageContentsHash
sbomIdentity
provenanceIdentity
goldenBundleIdentity
buildWorkflowIdentity
createdAt
```

The private pin record adds:

```text
privateCommit
verificationWorkflowIdentity
verifiedAt
contractResultHash
differentialResultHash when applicable
adversarialResultHash when applicable
```

The manifest contains no private commit, provider, schema, key, risk-policy, or deployment detail when published publicly. Private verification adds restricted fields only inside `findmysensi-secure`.

### 2.2 Artifact sets

`PROTOCOL_V1` contains only the exact public protocol package and independently derived public golden-vector bundle required by auth/account/API implementation.

`RANKED_GRID_V1` contains exact stable or RC artifacts for:

- `@findmysensi/protocol`;
- `@findmysensi/aim-core`;
- approved Grid scenario package/export;
- approved Grid scoring package/export;
- any public analytics package required by authoritative replay;
- the matching independent/historical golden-vector bundle.

The manifest, not this document, is authoritative for the final exact package names. Adding or removing a package changes the artifact-set version and requires review.

### 2.3 Protocol RC to stable handshake

- [ ] **PUB-PROTOCOL-RC:** From the protected P4 commit, public CI builds and publishes an immutable `PROTOCOL_V1` RC plus manifest, SBOM, provenance, freeze hash, and public goldens. Fork and ordinary PR workflows cannot publish it.
- [ ] **SEC-PROTOCOL-RC:** A protected private workflow receives the approved manifest identity through registry/protected artifact transport, pins exact RC versions, verifies integrity/content, and runs schema, binary, malformed-vector, and error/status conformance. It never reads the public checkout.
- [ ] **CROSS-PROTOCOL-REVIEW:** Human reviewers compare results with the approved freeze. Failure returns to P3/P4 and requires a new immutable RC; an RC is never overwritten.
- [ ] **PUB-PROTOCOL-STABLE:** Public CI publishes stable packages from the approved protected source. Stable is treated as a new artifact even when source is unchanged; its exact tarball and metadata are verified.
- [ ] **SEC-PROTOCOL-STABLE:** Private pins the exact stable versions and repeats every artifact-sensitive conformance/build check. Ordinary private development then uses stable artifacts only.
- [ ] **GATE-PROTOCOL-STABLE:** Record stable manifest hash plus both verification result hashes. Only now may S2-S6 production API/auth adapters proceed.

Public verification commands, after their producing scripts exist:

```powershell
rtk npm ci
rtk npm run protocol:freeze:check
rtk npm test --workspace @findmysensi/protocol
rtk npm run release:verify-protocol-artifacts
rtk npm run build
```

Private verification commands, from the private checkout with its protected manifest source configured:

```powershell
rtk npm ci
rtk npm run public-artifacts:verify -- --artifact-set PROTOCOL_V1
rtk npm run contracts:check
rtk npm run typecheck
rtk npm test
rtk npm run build
```

### 2.4 Ranked runtime RC to stable handshake

- [ ] **PUB-RANKED-RC:** After deterministic core, Grid candidate, scoring, cadence, limits, goldens, and Grid release evidence are approved, public CI publishes immutable `RANKED_GRID_V1` RC artifacts from one protected source identity.
- [ ] **SEC-RANKED-RC:** Private staging pins every exact RC and validates package contents, transitive version consistency, protocol compatibility, seed-bank validator identity, browser-produced fixtures, independent goldens, and private replay.
- [ ] **CROSS-RANKED-DIFFERENTIAL:** Run browser/private differential parity using only immutable RC packages and synthetic/public fixtures. This proves environment parity, not mathematical correctness; independent goldens remain mandatory.
- [ ] **CROSS-RANKED-ADVERSARIAL:** Private staging runs parser, lifecycle, idempotency, proof, score, health, resource, and smoke-contamination suites against the exact RC set.
- [ ] **PUB-RANKED-STABLE:** Public publishes exact stable artifacts from the approved protected source and emits a new stable manifest. Production never consumes RC packages.
- [ ] **SEC-RANKED-STABLE:** Private pins exact stable artifacts and reruns every contract-, encoding-, hash-, differential-, build-, and adversarial-sensitive check that could change through packaging/resolution.
- [ ] **GATE-RANKED-STABLE:** Only exact stable versions/hashes enter a candidate release manifest.

Public verification commands:

```powershell
rtk npm ci
rtk npm run decisions:check
rtk npm test
rtk npm run test:bundle
rtk npm run release:verify-ranked-artifacts
rtk npm run build
```

Private verification commands:

```powershell
rtk npm ci
rtk npm run public-artifacts:verify -- --artifact-set RANKED_GRID_V1
rtk npm run contracts:check
rtk npm run test:differential
rtk npm run test:adversarial
rtk npm run test:historical
rtk npm run build
```

---

## 3. Protocol V1 Prefreeze Measurement Gate

Production parser/codecs/endpoints remain unimplemented during this phase. Measurement harnesses are explicitly labeled non-release and use synthetic bounded data.

### Inputs

- Public P2 input streams at 125, 500, 1000, 2000, 4000, and 8000 Hz.
- Public candidate simulation cadences and catch-up envelopes.
- Public candidate ring-buffer, drain-work, event, chunk, and total-proof limits.
- Private synthetic parser/decompression/replay memory and CPU measurements on representative serverless limits.
- Private network/provider-independent heartbeat and sync jitter measurements from approved test environments.
- Adversarial compressed/decompressed ratio, allocation, integer, count, and terminal-tick cases.

### Required outputs

- [ ] `simulation-cadence` record: cadence, tick duration, catch-up envelope, ranked engine-version binding.
- [ ] `input-bounds` record: buffer capacity, drain count/work, event/shot/state maxima, overflow behavior.
- [ ] `binary-resource-maxima` record: run ticks, chunks, bytes/chunk, events/chunk, shots/chunk, sequence, target-state events, compressed/decompressed and total verification bytes.
- [ ] `ranked-network-deadlines` record: sync cadence, heartbeat interval, normal jitter allowance, hard deadline, invalidation behavior.
- [ ] Each record includes owner, candidate set, predeclared criteria, representative environments, raw evidence identities/hashes, selected value, rejected alternatives, version consequence, reviewers, approvers, and timestamps.
- [ ] Public records contain only safe contract values. Restricted provider or security observations stay in private evidence referenced by an opaque approved evidence identity.

### Stop condition

Protocol P3 remains red if any required value is absent, provisional, inferred from current allocation behavior, or lacks approval. A failed candidate returns to measurement; it does not acquire a convenient default.

Public commands:

```powershell
rtk npm run benchmark:input
rtk npm run benchmark:cadence
rtk npm run decisions:check
```

Private commands:

```powershell
rtk npm run benchmark:protocol-prefreeze
rtk npm run test:resource-bounds
rtk npm run decisions:prefreeze:check
```

Protocol freeze command after both evidence streams are approved:

```powershell
rtk npm run protocol:freeze:check
```

Expected result: PASS with one immutable freeze hash. Any later behavioral change requires the applicable new protocol/engine version and renewed approval.

---

## 4. Human Stop Gates

### 4.1 UI approval stops

| Gate | Required states                                                                                           | Blocks                                       | Does not block                                     |
| ---- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| UI-A | Landing, registration, trainer/home, unsupported mobile, Potato/performance setup, account/settings shell | Corresponding React/routes                   | Headless engine, protocol, auth domain, benchmarks |
| UI-B | Running HUD, Practice pause/settings, results analytics                                                   | Practice/Ranked presentation integration     | Simulation/input/renderer/controller tests         |
| UI-C | Leaderboard and public profile, including empty/loading/error/legacy/privacy states                       | Leaderboard/profile route implementation     | Private read-model implementation                  |
| UI-D | Known-sensitivity/converter flow, Sensi Lab, Sensi Battle, Mouse Swap, crosshair editor                   | Corresponding route/component implementation | Sensitivity/calibration/crosshair kernels          |

Each approval output binds artifact hashes, 1280x720 composition, responsive/mobile behavior, keyboard/focus/screen-reader behavior, live-region policy, error/loading/empty states, approver, and timestamp.

- [ ] Run the public design approval validator before starting affected UI work.
- [ ] Stop for explicit human approval; an AI review or a passing screenshot test cannot self-approve.
- [ ] If implementation changes approved hierarchy/interaction materially, return to the applicable UI gate.

```powershell
rtk npm run design:approvals:check
```

### 4.2 ProofStore/provider stop

Private S7 must produce an approved provider decision, threat model, fixed AEAD envelope/AAD table, `ProofStoreKeyWrappingProfile`, privacy/region/transfer review, durability/deletion/version-restore evidence, reconciliation drill, cost bounds, and evidence that Turso plus ProofStore can meet the declared 15-minute RPO.

- [ ] No production encryption adapter, stored production proof, or Ranked persistence begins before this record passes.
- [ ] If the RPO cannot be demonstrated, revise the architecture/RPO through explicit review; do not weaken tests or acknowledgement semantics.

```powershell
rtk npm run decisions:proof-store:check
```

### 4.3 Grid competitive release stop

The public Grid release record must bind:

```text
modeId and immutable version tuple
target dimensions and duration ticks
spawn/replacement/collision/same-tick rules
checked score formula and all bounds
metric definitions and versions
PRNG/generator/validator identities
seed opportunity constraints
pilot cohort and predeclared holdout method
reliability confidence interval
floor/ceiling and seed-variance results
hardware-equivalence and exploit results
independent golden/historical evidence hashes
reviewers and approval
```

Private adds a restricted production seed-bank approval record proving the bank passes the exact stable public validator and expected integrity identity.

- [ ] Before this gate, Grid may be Practice-only and `rankedEligible=false`.
- [ ] Before this gate, private cannot issue a `COMPETITIVE` Grid ticket or permit Grid PB/leaderboard/achievement writes.
- [ ] `PRODUCTION_SMOKE` cannot be used to bypass missing Grid competitive evidence; it remains structurally noncompetitive.

Public commands:

```powershell
rtk npm run grid:release-evidence:check
rtk npm test --workspace @findmysensi/scenarios
rtk npm test --workspace @findmysensi/scoring
```

Private commands:

```powershell
rtk npm run seed-bank:verify -- --mode Grid
rtk npm run ranked-release:eligibility-check -- --mode Grid
```

---

## 5. Separate Production Gates

### 5.1 Production registration gate

This gate permits production account creation and authenticated Practice while Ranked issuance and competitive writes remain disabled.

Required evidence:

- [ ] Exact stable `PROTOCOL_V1` artifacts are pinned in private.
- [ ] Better Auth credentials/sessions and private-only migrations pass empty/upgrade/checksum/drift tests.
- [ ] Conservative username/email normalization is versioned and approved before production accounts exist.
- [ ] OTP atomicity, password reset/session revocation, recent reauthentication, email-change behavior, Turnstile, DNS/disposable policy, and reviewed rate-limit records pass.
- [ ] Account/profile/publication controls, IDOR/BOLA, CSRF/origin-auth/cache/header tests pass through same-origin staging.
- [ ] User access, correction, bounded export, account deletion/status, retention, age attestation, and applicable object reconciliation for currently enabled data classes work.
- [ ] Privacy notice, terms, age policy, processor/transfers, controller/contact, email/Turnstile/provider terms, hosting plan, and launch jurisdictions have current qualified approval.
- [ ] Safe logs, SLO measurement, alerts, rollback, and account/auth kill controls are live.
- [ ] Competitive and smoke issuance switches are durably OFF.

Private gate command:

```powershell
rtk npm run release:registration-gate
```

Public integration command:

```powershell
rtk npm run test:e2e -- --project authenticated-practice
```

Failure outcome: website/docs/local tools may remain available as approved, but production registration and account-required training do not launch.

### 5.2 Ranked production gate

This gate is additive to the production registration gate. It requires:

- [ ] Exact stable `RANKED_GRID_V1` artifacts and all stable-artifact-sensitive rechecks.
- [ ] Grid competitive release and private seed-bank approval.
- [ ] ProofStore/provider/wrapping, deletion/recovery, rotation, and joint-RPO evidence.
- [ ] Ticket/create/activate, chunk/heartbeat/deadline, finish/jobs, verifier, historical registry, authoritative score, atomic PB/board, risk/moderation/admin, privacy, retention, and audit gates.
- [ ] Fail-closed durable controls and a tested separate smoke-issuance path.
- [ ] Exact tested browser versions, representative hardware/high-polling/multi-monitor evidence, performance budgets, accessibility/1280x720 evidence, and bundle boundaries.
- [ ] Migration, backup/restore, rollback, key/origin rotation, kill-switch, preview isolation, deletion, and RTO/RPO drills.
- [ ] Flake budgets pass in both repositories; critical categories have zero flakiness.
- [ ] No unresolved Critical/High issue; any Medium exception is bounded and unexpired.
- [ ] Independent competent human Ranked security review is complete. AI review does not satisfy this item.
- [ ] Legal/privacy/hosting/provider approvals remain current for Ranked evidence and publication.

Failure outcome: accounts and Practice may remain live when safe, but new Ranked tickets and all competitive writes remain OFF.

---

## 6. Fail-Closed Dependency Matrix

| Missing/invalid dependency                             | Required behavior                                                                        |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| Protocol freeze approval or artifact integrity         | No production protocol adapter or private public-route implementation                    |
| Supported version tuple                                | No Ranked ticket; stable `RANKED_VERSION_UNSUPPORTED` response                           |
| Durable competitive control or sealed matching release | No `COMPETITIVE` ticket and no competitive write                                         |
| Separate smoke authorization/control                   | No `PRODUCTION_SMOKE` ticket                                                             |
| Grid release/seed-bank approval                        | Grid remains Practice-only                                                               |
| Risk-policy decision/adapter                           | Verification may finish safely, but eligibility is `WITHHELD`/`REVIEW`, never `ELIGIBLE` |
| Durable encrypted proof write                          | Do not acknowledge the chunk or advance accepted metadata                                |
| Proof authentication/decompression/replay integrity    | No authoritative score/write; stable restricted failure                                  |
| Exact causal replay after overflow/backlog             | Invalidate or downgrade per frozen policy; never VERIFIED/eligible                       |
| Migration checksum/schema compatibility                | Block private deployment                                                                 |
| UI approval                                            | Do not implement/deploy the affected UI; headless code may continue                      |
| Registration privacy/legal gate                        | No production account creation                                                           |
| Ranked human security/legal/provider gate              | Keep Ranked and competitive writes disabled                                              |
| Candidate smoke failure or contamination               | Do not seal/activate; keep competitive switches OFF                                      |

---

## 7. `releaseId` Candidate-to-Activation Sequence

One coordinated release uses one immutable `releaseId`. It is allocated before the first deployment and never reused, including after abort.

- [ ] **ALLOCATED:** Allocate `releaseId`; record owner, intended capability, public/private candidate commits, and rollback candidate. No deployment has occurred.
- [ ] **CANDIDATE revision 1:** Bind exact stable public package hashes, private build identity, protocol/engine/scenario/scoring/verifier/seed-bank versions, schema migration/checksums, configuration identity, accepted key IDs, required evidence index, and exact browser versions as they become known. Updates append a new revision; they never rewrite one.
- [ ] Apply only approved additive private migrations with protected migration credentials after backup/restore evidence and checksum verification.
- [ ] Deploy the compatible private candidate with Competitive issuance/writes OFF and direct-origin rejection enabled.
- [ ] Deploy the public candidate using exact stable packages and same-origin `/api/v1/*` routing.
- [ ] Append both deployment identities and post-deploy health evidence to a new candidate revision.
- [ ] Temporarily enable only service-principal smoke issuance. Run `PRODUCTION_SMOKE` through the real same-origin edge, ticket, activation, chunk, heartbeat, finish, ProofStore, replay, transaction, and telemetry paths.
- [ ] Query authoritative projections and prove zero PB, leaderboard, public-profile, rank, achievement, or competitive-progression mutation. Disable temporary smoke issuance as appropriate.
- [ ] Append smoke, migration, telemetry, rollback, and no-contamination evidence.
- [ ] **SEALED:** Seal only when all required identities/evidence are complete and the running deployments match. Sealing is immutable.
- [ ] **ACTIVE:** Perform audited compare-and-set activation of the sealed manifest, then deliberately enable Competitive issuance and writes. Failure to read or match state leaves them OFF.
- [ ] Observe the release; later mark it **SUPERSEDED** only after another sealed release activates.
- [ ] An abandoned candidate becomes **ABORTED**. Its identifier is never reassigned.
- [ ] Rollback activates a previously sealed, schema-compatible release through a new append-only activation event; it never edits either manifest.

Private release verification commands:

```powershell
rtk npm run release:manifest:verify
rtk npm run db:migrations:check
rtk npm run release:production-smoke
rtk npm run release:smoke-contamination-check
rtk npm run release:activation-readiness
```

---

## 8. Milestones and Evidence

| Milestone                   | Product outcome                                        | Required completed phases/gates                         | Explicitly still disabled                        |
| --------------------------- | ------------------------------------------------------ | ------------------------------------------------------- | ------------------------------------------------ |
| M0 Plan-ready               | Approved executable plans                              | X0                                                      | All implementation                               |
| M1 Reproducible foundations | Independent clean builds and boundaries                | X0                                                      | Production accounts, Practice, Ranked            |
| M2 Protocol stable          | Public/private contract implementation can proceed     | X1-X3                                                   | Ranked and production accounts until their gates |
| M3 Headless Grid candidate  | Deterministic engine/input/render/scenario evidence    | Public P5-P9 and UI design gates as records             | Production training until account/Practice gates |
| M4 Registration-ready       | Production account/auth/privacy platform               | X4-X5 and registration gate                             | Ranked and competitive writes                    |
| M5 Grid Practice            | Authenticated local/noncompetitive Grid training       | API/mock before Practice, UI-A/B, M4                    | Ranked                                           |
| M6 Ranked staging           | Full proof/replay/write stack in isolated staging      | X6-X8, provider and Grid gates                          | Production Ranked                                |
| M7 Ranked release candidate | Exact stable artifacts, drills, evidence, human review | X10 before activation                                   | Competitive issuance until seal/activate         |
| M8 Ranked production        | Deliberately enabled sealed release                    | Ranked production gate and release sequence             | Unapproved later modes/features                  |
| M9 Product breadth          | Approved extra modes and sensitivity tools             | Each independent UI/pilot/calibration/game-adapter gate | Any feature whose own gate remains open          |

Every milestone reports `IMPLEMENTED`, `MERGE-READY`, `RELEASE-READY`, or `PRODUCTION-VERIFIED`; the word "done" without state and evidence is invalid.

---

## 9. Allowed Parallelism and File-Ownership Rules

### 9.1 Parallel work that is allowed

- Public headless deterministic work may run in parallel with private auth/account work after `PROTOCOL_V1` stable, because the repositories and files are independent.
- UI design approval preparation may run in parallel with headless engines, benchmarks, private schema work, and provider evaluation; affected UI implementation still waits.
- Sensitivity/calibration kernels may run in parallel with ProofStore/ranked private work after their shared protocol types are stable.
- Independent scenario implementations may run in parallel only after the common scenario/scoring interfaces are frozen and each worker owns a distinct mode directory and tests.
- Public browser evidence and private adversarial/provider evidence may run concurrently against the same immutable RC identity.
- Documentation, threat models, and decision evidence may run concurrently when they do not edit the same record or approval file.

### 9.2 Work that must be serialized

| Collision domain                                                              | Serialization rule                                                                           |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Root `package.json`, `package-lock.json`, root TypeScript references          | One repository-local owner at a time; rebase/reverify before handoff                         |
| `@findmysensi/protocol` exports, freeze docs, binary tables, domains, goldens | One protocol owner; no parallel semantic edits                                               |
| Public scenario/scoring registries and central barrel exports                 | Mode workers do not edit registries; one integration task registers completed modes          |
| Public Next route layout, global CSS/tokens, shared navigation                | One UI integration owner per approval wave                                                   |
| Private Drizzle journal, snapshots, migration SQL/checksum manifest           | Strictly one migration owner; migrations are generated/reviewed/applied sequentially         |
| Better Auth schema and account identity normalization                         | One auth/schema owner until migration and compatibility evidence merge                       |
| Ranked lifecycle/state-machine and public error mapping                       | One owner; verifier/risk workers consume named ports                                         |
| Proof envelope/AAD, wrapping profile, key-state code                          | One security owner after provider approval                                                   |
| Durable controls and release manifest state machine                           | One operations owner; Ranked code consumes the port and cannot duplicate storage             |
| Audit chain/schema and privacy deletion state machines                        | One owner for each canonical state machine; later tasks modify through reviewed interfaces   |
| CI release/publishing/migration workflows and CODEOWNERS                      | Serialized independent review; modified privileged workflows receive no secrets before merge |
| Candidate release manifest                                                    | Append-only revisions through one protected coordinator; no concurrent rewrites              |

### 9.3 Worker handoff contract

- [ ] Before assignment, name the exact repository, task, files/directories, consumed interfaces, and forbidden files.
- [ ] State that other workers are active and changes must not be reverted.
- [ ] A worker touching a collision domain acquires its single-owner slot before editing.
- [ ] Each task begins from the last green dependency and ends with focused tests plus repository-wide applicable checks.
- [ ] Cross-repository validation references artifact manifest identities, never local paths or the other checkout's current branch.
- [ ] If an interface must change, stop dependent workers, version/review the interface, publish a new immutable artifact, and rerun affected gates.
- [ ] No worker may close a human, provider, privacy, security, legal, pilot, or performance decision by writing a passing boolean into a fixture.

---

## 10. Cross-Repository Execution Checklist

- [ ] Both approved specs record approval provenance, and both plans pass their documentation review.
- [ ] Parent non-Git and both repository boundary checks pass.
- [ ] Public and private prefreeze measurements close every Protocol V1 numeric decision.
- [ ] Protocol V1 Freeze receives independent human/security approval.
- [ ] Protocol RC is validated privately; exact stable protocol artifacts replace RC before ordinary private implementation proceeds.
- [ ] UI-A/B approval precedes Practice UI; UI-C/D approval precedes affected product UI.
- [ ] API clients/mock transport precede authenticated Practice integration.
- [ ] Production registration passes its auth/privacy/legal/operations gate while Ranked stays disabled.
- [ ] Grid pilot/holdout/release and private seed-bank evidence pass before Competitive Grid issuance.
- [ ] ProofStore provider/wrapping/RPO gate passes before production proof code/data.
- [ ] Ranked runtime RC differential/adversarial checks pass; exact stable artifacts are then repinned and rechecked.
- [ ] Missing risk/release/control/provider state is demonstrated fail-closed.
- [ ] Ranked staging passes lifecycle, proof, replay, PB/board, privacy, moderation, admin, recovery, and smoke-isolation suites.
- [ ] Both flake budgets, exact browser/hardware evidence, and supply-chain gates pass.
- [ ] Qualified human Ranked security and current legal/privacy/hosting/provider gates pass.
- [ ] `releaseId` is allocated before deployment, candidate revisions are append-only, production smoke cannot contaminate competition, and the matching manifest is sealed before activation.
- [ ] Competitive Ranked is deliberately enabled only after the final compare-and-set succeeds; otherwise it remains OFF.

## Verification for This Map

Run from the public repository after editing only this document:

```powershell
rtk git diff --check -- docs/superpowers/plans/2026-08-30-findmysensi-cross-repository-execution-map.md
rtk git status --short
```

Expected: no whitespace errors, and only this cross-repository execution-map file is attributed to this task.
