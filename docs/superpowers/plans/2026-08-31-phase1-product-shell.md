# FindMySensi Phase 1 Product Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize the first real-data-only FindMySensi product slice: public landing + converter entry + live Gridshot leaderboard read model + Better Auth/Resend account flow + logged-in Gridshot-only home + persistent profile/trainer settings + resumable pause shell.

**Architecture:** Keep the public/private repository boundary. The public repo owns UI, typed protocol/settings models and trainer presentation. The private repo owns sessions, account mutation, settings/profile persistence and real leaderboard reads from Turso. No fake/mock/fallback business data is rendered; request failure renders an explicit error state and an empty database renders an honest empty state. Target geometry, movement, hitboxes and scoring are not user settings and never become authoritative client inputs.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind, Better Auth, Resend, Drizzle/libSQL/Turso, Vitest.

**Spec:** Approved 2026-08-31 revised product flow in the project conversation, layered on `docs/superpowers/specs/2026-08-30-findmysensi-design.md`.

## Global Constraints

- Public landing exposes Sensitivity Converter only; cm/360 and eDPI are part of that tool.
- Crosshair editor/share-code and Mouse Swap are authenticated trainer-home/settings features, not public tools.
- Landing shows a real Gridshot leaderboard read model, creator/open-source/contribution links, login/register CTAs, and no fake profiles/testimonials/scores.
- Trainer home exposes Gridshot only in this slice.
- There is no separate Practice/Ranked selector. Each mode owns its own leaderboard; future modes get separate boards.
- Pause is allowed. Resume is available for up to 10 minutes, then the run exits to home. Pause time does not advance simulation time.
- Target shape is always circle. Target radius, hitbox, movement, spawn rules and score values are not mutable settings and are not accepted from the browser as authoritative inputs.
- Allowed target presentation settings in this slice: target color, target opacity, target outline. No target style/size controls.
- Default training FOV is 103 degrees from one typed settings definition. FOV is presentation/camera configuration, separate from physical sensitivity conversion.
- Profile settings support unique username mutation plus preset avatar/frame IDs. No user-uploaded avatars in v1.
- Settings include sensitivity, nominal DPI (optional), FOV, target color/opacity/outline, crosshair, graphics, resolution/aspect/scaling and input-processing mode.
- Unknown DPI is valid; settings and future Mouse Swap must not require a DPI value.
- Input pipeline must preserve very fast movement/click events; no UI timing assumption may reject legitimate ~45 ms reactions.
- No mock or invented production data. Development-only mock services must never power the production UI.
- Better Auth HttpOnly session cookies remain the auth mechanism; do not replace them with browser-stored JWTs.
- Resend is the transactional email provider; delivery failure returns an error rather than a fake success.

---

### Task 1: Lock public protocol and settings invariants

**Files:**
- Modify: `packages/protocol/src/schemas/auth.ts`
- Create: `packages/protocol/src/schemas/profile.ts`
- Create: `packages/protocol/src/schemas/settings.ts`
- Create: `packages/protocol/src/schemas/leaderboard.ts`
- Modify: `packages/protocol/src/index.ts`
- Test: `packages/protocol/test/product-shell.spec.ts`

**Interfaces:**
- `RegisterRequestSchema` accepts `{ username, email, password }` only.
- `TrainerSettingsSchema` contains presentation/input settings only and has no target-size, target-style, target-motion or score fields.
- `LeaderboardResponseSchema` is keyed by `modeId` and contains real rows only.

- [ ] Write failing protocol tests for registration, default FOV=103, optional DPI, forbidden mutable target/scoring fields, and per-mode leaderboard response.
- [ ] Run protocol tests and observe RED.
- [ ] Implement schemas minimally.
- [ ] Run protocol tests and observe GREEN.

### Task 2: Simplify private registration and preserve Better Auth + Resend

**Files:**
- Modify: `findmysensi-secure/packages/auth/src/index.ts`
- Modify: `findmysensi-secure/apps/api/src/app.ts`
- Modify: `findmysensi-secure/packages/database/src/schema.ts`
- Generate/review: private Drizzle migration
- Test: `findmysensi-secure/apps/api/tests/pipeline.test.ts`

- [ ] Change tests so registration no longer sends/requires first/last name.
- [ ] Observe RED.
- [ ] Remove required first/last-name fields from Better Auth custom user fields and registration handler.
- [ ] Keep username/email canonical uniqueness and Resend-backed OTP verification.
- [ ] Observe GREEN.

### Task 3: Add persistent profile/settings APIs

**Files:**
- Private database schema/migration.
- Private API handlers for `/api/v1/me/profile` and `/api/v1/me/settings`.
- Public API-client methods and protocol schemas.

- [ ] Test unauthenticated requests return 401.
- [ ] Test username update is atomic and rejects a taken canonical username.
- [ ] Test avatar/frame IDs and trainer settings round-trip from database.
- [ ] Test unknown DPI (`null`) round-trips.
- [ ] Implement authenticated handlers using `auth.api.getSession({ headers })`.

### Task 4: Add real per-mode leaderboard read model

**Files:**
- Private leaderboard schema/read query and `/api/v1/leaderboards/:modeId` GET.
- Public protocol/client and landing component.

- [ ] Test Gridshot endpoint reads only persisted database rows and sorts best scores descending.
- [ ] Test a different `modeId` has an independent result set.
- [ ] Test DB/API failure produces an error response rather than fallback rows.
- [ ] Implement read-only endpoint. No client score-write endpoint in this slice.

### Task 5: Rebuild static landing around real product flow

**Files:**
- Modify: `apps/web/app/page.tsx`
- Create focused landing components as needed.

- [ ] Keep Login/Register/Start Training CTAs.
- [ ] Add live Gridshot leaderboard section backed by the real API.
- [ ] Add Sensitivity Converter entry and explain cm/360/eDPI/game-equivalent sensitivity without inventing unsupported conversion values.
- [ ] Add creator, portfolio, GitHub, contribute/report links.
- [ ] Do not expose public-profile discovery, Crosshair or Mouse Swap as public tools.
- [ ] On API failure show an explicit leaderboard error; on an empty real board show `No verified Gridshot scores yet.`

### Task 6: Simplify registration UI

**Files:**
- Modify: `apps/web/app/register/page.tsx`

- [ ] Remove first/last-name fields.
- [ ] Stop showing/copying development OTP into the UI. Development test helpers may exist server-side but production-facing UI never falls back to them.
- [ ] Keep visible username/email/password/confirm password fields and email verification state.

### Task 7: Make Trainer Home Gridshot-only

**Files:**
- Modify: `apps/web/app/app/page.tsx`

- [ ] Remove all other mode cards and duplicate converter/crosshair/mouse-swap cards from the authenticated home.
- [ ] Expose Gridshot Play and Settings.
- [ ] Show real signed-in user state only; session failure redirects/login or renders error, never fake user data.

### Task 8: Build persistent Settings UI

**Files:**
- Replace: `apps/web/app/app/settings/page.tsx`
- Add focused client components/models under `apps/web/src/features/settings/`.

- [ ] Sections: Profile, Aim, Crosshair, Video, Input.
- [ ] Profile: username availability/update, preset avatar, preset frame.
- [ ] Aim: FindMySensi sensitivity, optional nominal DPI, FOV default 103, target color, opacity, outline.
- [ ] Crosshair: presets/editor/share-code copy/paste.
- [ ] Video: graphics, resolution, aspect, scaling.
- [ ] Input: Automatic/1000/2000/4000/8000/Maximum processing strategy.
- [ ] No target shape/style/size/movement/scoring controls anywhere.

### Task 9: Adjust pause shell without changing Gridshot gameplay yet

**Files:**
- Modify: `apps/web/src/trainer/TrainerBootstrap.tsx`
- Modify controller only if necessary to support pause timeout state cleanly.

- [ ] Pause menu contains Resume, Settings, Restart, Exit Home.
- [ ] Maximum paused duration is 10 minutes; expiry exits to `/app`.
- [ ] Opening settings from pause preserves the remaining pause window.
- [ ] Do not fix mouse/collision/target-radius gameplay bugs in this task; those are the next Gridshot-only phase.

### Task 10: Verify repository slice

- [ ] Public: format, lint, typecheck, unit tests, production build.
- [ ] Private: format, lint, typecheck, unit tests, production build/migration checks.
- [ ] Open draft PRs for both repos and inspect GitHub Actions.
- [ ] Do not merge until both branches are green or failures are documented as pre-existing blockers.
