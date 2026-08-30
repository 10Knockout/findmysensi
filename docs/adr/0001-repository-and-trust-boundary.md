# ADR 0001: Two-Repository Topology and Trust Boundary

## Status

Approved

## Context

FindMySensi is an open-source browser aim training and sensitivity platform. It requires a deterministic browser simulation engine, public scenario definitions, client-side input handling, and open-source community contributions under the MPL-2.0 license. Simultaneously, the platform provides ranked competitive leaderboards, proof-based anti-cheat verification, user account management, and transactional email.

If private anti-cheat heuristics, production signing keys, database connection strings, or migration logic were co-located in the open-source repository, the competitive integrity and operational security of the service would be compromised. Conversely, making the entire platform proprietary would prevent open-source community contributions and auditability of the core aim engine.

## Decision

1. **Repository Topology**:
   - The root workspace `F:\Dev\findmysensi` is **not a Git repository**.
   - The public repository `findmysensi` (MPL-2.0) contains the Next.js frontend, UI, deterministic gameplay engine (`@findmysensi/aim-core`), browser input adapter (`@findmysensi/input-browser`), Canvas2D/Potato renderer, scenario definitions, sensitivity math, public protocol schemas (`@findmysensi/protocol`), documentation, and mock API.
   - The private repository `findmysensi-secure` (private) contains authentication (Better Auth), database/migrations (Turso/Drizzle), email integrations (Brevo), ranked session issuance (Ed25519 signing), proof replay verification, encrypted ProofStore, private anti-cheat risk scoring, moderation tooling, and production secrets.

2. **Boundary Invariants**:
   - **No Sibling Imports**: Neither repository may import from the other via filesystem paths, parent workspace links, or unpublished local references.
   - **Cross-Repo Integration**: Private builds consume immutable, published public package releases (or exact pre-release RC packages in staging).
   - **Database & Migration Sole Ownership**: All production database schemas and all Drizzle migrations belong exclusively to `findmysensi-secure`. The public repo never connects directly to Turso.
   - **Unified API Contract**: All browser traffic accesses the `/api/v1/*` endpoint on the same origin. Cloudflare routes API traffic to the private service while preserving origin cookies and edge-to-origin authentication headers.
   - **Zero Public Secrets**: The public repository strictly contains no production credentials, signing keys, OTP peppers, or private anti-cheat thresholds.

3. **Toolchain Decisions**:
   - Node.js LTS (v22.x) pinned via `.nvmrc`.
   - TypeScript (v5.x) with strict compiler settings (`noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`).
   - Vitest for unit, property, and golden vector testing.

## Consequences

- **Positive**: Clean separation of open-source trainer logic and server-authoritative security; zero risk of public leaks of private heuristics or database credentials; clear contribution guidelines for open-source developers.
- **Negative**: Coordinated feature releases requiring changes in both repositories must follow a formal Release Candidate (RC) package flow and strict cross-repository contract testing.
