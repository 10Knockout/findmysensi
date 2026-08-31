# FindMySensi Governance

## Project Structure

FindMySensi is maintained as two independent repositories:

- **Public** (`findmysensi`): Open-source under MPL-2.0. Contains the
  website, aim trainer, deterministic engine, input handling, rendering,
  scenarios, scoring, sensitivity tools, and crosshair editor.
- **Private** (`findmysensi-secure`): Contains authentication, database
  migrations, ranked verification, encryption, risk/anti-cheat, admin,
  and privacy/retention logic.

## Decision Making

### Product decisions

Product direction, feature scope, and UX decisions are made by the project
maintainers. Community input is welcomed through issues and discussions.

### Technical decisions

Significant technical decisions are recorded as Architecture Decision
Records (ADRs) in `docs/adr/`. Once accepted, an ADR is superseded only
by a later ADR — it is never silently rewritten.

### Scenario and scoring changes

Changes to ranked-eligible scenarios, scoring formulas, or seed constraints
require:

1. A written proposal with deterministic specification
2. Independent golden-file verification
3. Pilot/holdout evidence
4. Explicit human approval

### Protocol changes

The versioned protocol contract (`docs/protocol/v1/`) is frozen after
approval. Breaking changes require a new major version.

## Roles

- **Maintainer**: Full repository access, merge authority, release
  authority. Responsible for architecture, security, and release integrity.
- **Contributor**: Fork-based pull requests. No direct push, deployment,
  or secret access. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

This project is licensed under the
[Mozilla Public License 2.0](./LICENSE).
