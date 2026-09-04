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

| Variable       | Required in production  | Value                                                                                                                                           |
| -------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `API_URL`      | **Yes**                 | The deployed `findmysensi-secure` API's origin, e.g. `https://findmysensi-secure.vercel.app` (no trailing slash, no path).                      |
| `USE_MOCK_API` | Must be **unset/false** | The build itself throws if this is truthy in production (`next.config.mjs`) -- it's a local-dev-only escape hatch and structurally cannot ship. |

**If `API_URL` is missing:** the build still succeeds (this is deliberate --
see the comment in `next.config.mjs` for why a hard build-time throw isn't
used here), but every single `/api/*` request from the deployed site will
fail immediately (the rewrite falls back to `http://localhost:4000`, which
doesn't exist on Vercel). This fails loudly and totally, not silently --
but confirm `API_URL` is set before considering a deploy done. There is no
`.env.example` to copy in this repo since `API_URL` is the only
deployment-specific variable and its value is deploy-target-specific (not a
safe default to template).

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

`npm run build` at the repo root builds this app the same way Vercel does,
without requiring `API_URL` -- this is how local/CI verification stays
possible without a deployed backend. It does **not** prove the API rewrite
target is correct; that only happens once you set `API_URL` in Vercel.
