# Security Policy

## Supported Versions

Only the latest release on the `main` branch receives security updates.

## Reporting a Vulnerability

**Do not open a public issue for security vulnerabilities.**

Please report security issues privately:

1. Email: **security@findmysensi.com** (or create a private GitHub Security
   Advisory on this repository).
2. Include a clear description, reproduction steps, and impact assessment.
3. We will acknowledge receipt within 48 hours and provide an initial
   assessment within 5 business days.

## Scope

In scope:

- Authentication and session management
- Input validation and injection vulnerabilities
- Cross-site scripting (XSS) and CSRF
- Data exposure or privacy violations
- Deterministic simulation integrity issues
- Protocol encoding/decoding vulnerabilities

Out of scope:

- Denial of service through normal rate limiting
- Social engineering
- Attacks requiring physical access to a user's device
- Issues in third-party dependencies (report to the upstream project)

## Disclosure

We follow coordinated disclosure. We will work with you to understand and
address the issue before any public disclosure. Credit will be given to
reporters who follow responsible disclosure.

## Security Architecture

FindMySensi uses a two-repository architecture where security-sensitive
components (authentication, database, ranked verification, encryption) are
maintained in a separate private repository. The public repository never
contains production database credentials, signing keys, or security
thresholds.

## Dependency Audits

Run `npm audit --omit=dev` before each release; triage every `high` /
`critical` advisory (apply the patch if it is non-breaking, otherwise track
it below with a date and a mitigation).

### Known advisories

- _None._ (`npm audit --omit=dev` reported 0 vulnerabilities on 2026-09-09.)
