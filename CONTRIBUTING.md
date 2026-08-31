# Contributing to FindMySensi

Thank you for your interest in contributing to FindMySensi! This document
explains how to set up your environment, the contribution workflow, and
the rules that apply.

## Developer Certificate of Origin (DCO)

All commits must be signed off under the
[Developer Certificate of Origin v1.1](https://developercertificate.org/).
Use `git commit -s` to add the `Signed-off-by` trailer automatically.

## Prerequisites

- **Node.js** ≥ 22.0.0 (see `.nvmrc`)
- **npm** (ships with Node)
- A desktop browser with Pointer Lock API support

## Getting Started

```bash
# Clone
git clone https://github.com/findmysensi/findmysensi.git
cd findmysensi

# Install
npm ci

# Verify
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run check:boundaries
```

## What You Can Contribute

- Bug fixes and performance improvements
- Accessibility enhancements
- Documentation corrections
- Renderer implementations (Canvas2D, future WebGL)
- Scenario proposals (must pass deterministic review)
- Translations (future — not yet supported)

## What Requires Special Review

- Any change to `packages/protocol` (affects the wire contract)
- Any change to `packages/aim-core` (affects deterministic simulation)
- Any change to scoring formulas
- Any change to scenarios that are ranked-eligible

## What You Cannot Access

Contributors never receive:

- Production database credentials or URLs
- Deployment secrets or tokens
- Signing keys
- Admin or moderation access
- Email provider credentials

Security reports must use the private disclosure path described in
[SECURITY.md](./SECURITY.md).

## Code Style

- **Formatting:** Prettier (run `npm run format`)
- **Linting:** ESLint (run `npm run lint`)
- **Type safety:** Strict TypeScript with `noUncheckedIndexedAccess`
- **Tests:** Vitest — all new code must include tests

## Pull Request Process

1. Fork the repository and create a feature branch.
2. Write your code with tests.
3. Ensure all checks pass: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run check:boundaries`
4. Submit a pull request using the PR template.
5. All commits must be DCO-signed (`git commit -s`).
6. Wait for review — do not merge your own PR.

## License

By contributing, you agree that your contributions will be licensed under
the [Mozilla Public License 2.0](./LICENSE).
