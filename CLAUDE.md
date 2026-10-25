# CLAUDE.md - Project Guardrails for Labor Landmarks

## Critical Rules (Read Before Every Session)

### 1. TypeScript Strict Mode is ON
- `server/tsconfig.json` has `"strict": true` — this means `noImplicitAny` is enforced
- **NEVER** remove type annotations without replacing them with correct types
- **NEVER** use `typeof prisma` as the type for `$transaction` callbacks
- For Prisma transaction callbacks, use `Prisma.TransactionClient`:
  ```ts
  import { PrismaClient, Prisma } from '@prisma/client';
  await prisma.$transaction(async (tx: Prisma.TransactionClient) => { ... });
  ```

### 2. Always Verify Build Before Committing
- Run `npx tsc --noEmit` to check for TypeScript errors before any commit or push
- The Coolify deployment runs `tsc -b && vite build` — if tsc fails, the entire deploy fails
- Local VSCode may not show errors that the full `tsc -b` build catches (different tsconfig scopes)

### 3. CODE Problems vs DATA Problems
- **CODE problems** → fix via git push, **then press Deploy in Coolify**.
  *Corrected 25 Oct 2026: no application on this server has auto-deploy
  enabled (verified 26 Aug 2026). A push on its own changes nothing that is running.*
- **DATA problems** → fix via Admin Dashboard Import/Export (production DB is separate)
- Always ask: "Is this a CODE problem or a DATA problem?"

### 4. Dockerfile & Coolify Volumes
- Do NOT put secrets (like `ADMIN_PASSWORD`) in `ARG` or `ENV` — use Coolify environment variables instead
- The `# check-ignore=critical_high_vulnerabilities` comments suppress Docker DX VSCode warnings for `node:22-alpine` base image CVEs — these are informational, not build errors
- **NEVER add `apk add` to the Dockerfile** — Alpine CDN (`dl-cdn.alpinelinux.org`) has intermittent DNS outages that will fail builds. Use built-in Alpine tools (e.g., `wget` instead of `curl`) or npm packages instead. (Learned: Mar 2026, two consecutive deploy failures from `apk add --no-cache curl`)
- **CRITICAL: Coolify MUST have TWO persistent storage volumes configured:**
  - `/app/data` — SQLite database. Without this, ALL landmarks are wiped on every deploy.
  - `/app/uploads` — Uploaded images. Without this, all images are lost on every deploy.
- Verify in Coolify: Configuration → Persistent Storage → must show 2 volumes with different names

### 4b. Deploys are rolling updates — schema changes need Stop first
- Coolify keeps the OLD container serving until the new one is healthy. While the
  old server runs, `prisma migrate deploy` cannot lock the SQLite file
  ("database is locked"). This made every deploy fail and roll back on 25 Oct 2026.
- `docker-entrypoint.sh` therefore runs `prisma migrate status` (read-only) first
  and only migrates when something is pending. Ordinary deploys: zero downtime.
- **A deploy that adds a migration:** back up, **Stop the app in Coolify, then
  Deploy.** Otherwise the new container retries, prints FATAL and rolls back.

### 5. Prisma Patterns
- Always import both `PrismaClient` and `Prisma` from `@prisma/client` when using transactions
- Transaction client type: `Prisma.TransactionClient` (NOT `typeof prisma`)
- After schema changes: run `npx prisma generate` before building

### 6. Submitter Contact Fields (Admin-Only)
- `submitterName`, `submitterEmail`, `submitterComment` are collected in the Suggest a Landmark modal
- These are **never** exposed in the public API (`GET /api/landmarks`) — stripped server-side
- They **are** returned by the admin API (`GET /api/admin/landmarks`) and admin backup
- In the Admin Dashboard, a purple UserCheck icon appears when submitter info exists — click to view
- Every public response goes through `toPublicLandmark()` (`server/security.ts`) — including
  `GET /api/landmarks/:id`, which until Oct 2026 returned them to anyone (and returned unpublished rows)

### 6b. Auth on every write route — fixed 25 Oct 2026, keep it that way
Until 25 Oct 2026, `PUT /api/landmarks/:id`, `DELETE /api/landmarks/:id` and
`POST /api/landmarks/:id/images` had **no auth**: anyone could edit, delete or add photos to any
landmark, and a public suggestion could publish itself (`isPublished:true` was honoured).

**Rules:**
- Any new route that changes data, or any `/api/admin/*` route, takes `adminAuth`.
  `npm run check:security` fails if one doesn't (static check, no server needed).
  The only deliberate exceptions are listed in `PUBLIC_WRITES` in `scripts/security-check.ts`.
- Public suggestions are always stored unpublished, whatever the body says.
- **Public photo uploads** use a one-time key: `POST /api/landmarks` returns `uploadKey` (HMAC of
  id + expiry, 15 min, `server/security.ts`), sent back as `X-Upload-Key`. Valid only for that
  landmark, only while unpublished, max 10 photos. A server restart voids outstanding keys.
- **Frontend:** admin calls go through `src/utils/adminFetch.ts` — never hand-build the
  Authorization header. On 401 it clears the session and fires `admin-logout`; `AdminRoute`
  shows the login screen. **Do not reload the page on 401** — reload-on-401 looped forever when
  the dashboard rendered without a token (found in local testing; ~50 reloads in seconds).
- The old "localhost skips admin login" bypass is gone. Local dev still works: with
  `ADMIN_PASSWORD` unset the server accepts any login.
- helmet CSP allows OSM tiles (img-src) and Nominatim (connect-src). If you add an external
  service, add it to the CSP or the browser blocks it. `referrerPolicy` must stay
  `strict-origin-when-cross-origin` — OSM tile servers refuse requests with no Referer.
- Rate limits: 100/min on `/api`, 5/min login, 10/min suggestions and uploads, `trust proxy 1`.

**Testing:** `npm test` (unit), `npm run check:security` (static). Live checks need a THROWAWAY
server — the script creates and deletes rows:
`BASE=http://localhost:3099 ADMIN_PASSWORD=x npm run check:security`. Never point it at production.

### 7. Framer Motion — Use Sparingly on Lists
- **NEVER** use `layout`, `AnimatePresence`, `initial`, `animate`, or `exit` on components rendered in lists with 100+ items
- This creates one GPU compositing layer per item, which crashes mobile browsers (~300-500MB memory limit)
- `LandmarkCard` uses CSS `hover:-translate-y-1 transition-all` instead — same visual effect, zero JS overhead
- Framer Motion is fine for single elements like `DetailModal` or `ImageLightbox`

## Architecture Quick Reference
- **Frontend:** React + Vite (builds to `dist/`)
- **Backend:** Express server at `server/index.ts`, runs via `tsx`
- **Database:** SQLite via Prisma ORM
- **Deployment:** Coolify, Docker build from `main` — **no auto-deploy**; press Deploy after pushing
- **Port:** 3001 (standardized everywhere)

## Pre-Push Checklist
1. `npx tsc --noEmit` passes with zero errors
2. No secrets in Dockerfile ARG/ENV
3. `npm run build` succeeds locally
4. `npm test` and `npm run check:security` pass

## Dependency security (updated 25 Oct 2026)
- 25 Oct 2026: in-range `npm audit fix` + sharp 0.34 → 0.35.5 cleared 16 of 19 production advisories
  (multer upload DoS bugs, Express internals, react-router, vite, and libvips/libheif/librsvg
  image-decoder flaws in sharp — sharp decodes every public suggestion photo, so keep it current).
- **3 remain, deliberately:** `prisma` / `@prisma/config` chain (deepmerge-ts, effect). They are in
  Prisma's CLI, which only runs at container start and never sees visitor input. The fix is the
  Prisma 6 → 7 major migration — its own project, not a routine update.
- The critical `proxy-addr` advisory only affects apps trusting a proxy *subnet*; this app uses
  `trust proxy 1`. Fixed anyway by the in-range update.
- Newer local npm blocks install scripts (prisma, @prisma/engines). Run `npx prisma generate` after
  installs. The Docker build (node:22-alpine, older npm) is unaffected.
- No Docker on the dev Mac: sharp's Alpine binary can't be tested locally. The lockfile pins
  `@img/sharp-linuxmusl-*`; if sharp ever fails to load in the container, the health check fails and
  Coolify's rolling update keeps the old container running.
