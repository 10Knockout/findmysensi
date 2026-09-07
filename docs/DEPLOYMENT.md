# Deploying findmysensi (public repo) — Vercel

This repo is the Next.js frontend. It has no database or secrets of its own
-- its only deployment-specific requirement is knowing where the
`findmysensi-secure` API lives. Deploy that repo first (see its own
`docs/DEPLOYMENT.md`), then come back here.

## 1. Create the Vercel project

1. Import this repo into Vercel (vercel.com → Add New → Project → this
   GitHub repo).
2. Framework preset: Next.js (auto-detected, zero config needed).
3. Root Directory: `apps/web` (this is an npm-workspaces monorepo; Vercel
   needs to know the Next.js app lives under `apps/web`, not the repo root).

## 2. Required environment variables

Set these in the Vercel project's **Settings → Environment Variables**
(Production environment at minimum; mirror into Preview if you want preview
deploys to hit a real backend):

| Variable  | Required in production | Value                                                                                                                        |
| --------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `API_URL` | **Yes**                | The deployed `findmysensi-secure` API origin, e.g. `https://findmysensi-secure.vercel.app` (no credentials, path, or query). |

Production builds fail fast when `API_URL` is missing, malformed, or not
HTTPS. Local development uses `http://localhost:4000` when it is omitted.

## 3. Deploy

Push to the branch Vercel is watching (or `vercel --prod` via the CLI). No
build command override needed -- Vercel runs `npm run build` as detected
from `package.json`.

## 4. Post-deploy smoke check

- Load the deployed URL, confirm the pre-login marketing page renders.
- Register/log in (exercises the `/api/*` rewrite end-to-end against the
  real secure API) and confirm the session round-trips.
- Play a Gridshot run and confirm results save (exercises the full
  frontend → API → database path).

## Local verification (no live backend needed)

Set a non-secret verification origin when building locally or in CI, for
example `API_URL=https://api.example.invalid npm run build`. A successful build
validates configuration shape; only a post-deploy smoke test proves the real
API origin and cookie flow.
