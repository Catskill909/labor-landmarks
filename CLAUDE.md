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
- **CODE problems** → fix via git push → Coolify auto-deploys
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

### 5. Prisma Patterns
- Always import both `PrismaClient` and `Prisma` from `@prisma/client` when using transactions
- Transaction client type: `Prisma.TransactionClient` (NOT `typeof prisma`)
- After schema changes: run `npx prisma generate` before building

### 6. Submitter Contact Fields (Admin-Only)
- `submitterName`, `submitterEmail`, `submitterComment` are collected in the Suggest a Landmark modal
- These are **never** exposed in the public API (`GET /api/landmarks`) — stripped server-side
- They **are** returned by the admin API (`GET /api/admin/landmarks`) and admin backup
- In the Admin Dashboard, a purple UserCheck icon appears when submitter info exists — click to view

### 7. Framer Motion — Use Sparingly on Lists
- **NEVER** use `layout`, `AnimatePresence`, `initial`, `animate`, or `exit` on components rendered in lists with 100+ items
- This creates one GPU compositing layer per item, which crashes mobile browsers (~300-500MB memory limit)
- `LandmarkCard` uses CSS `hover:-translate-y-1 transition-all` instead — same visual effect, zero JS overhead
- Framer Motion is fine for single elements like `DetailModal` or `ImageLightbox`

## Architecture Quick Reference
- **Frontend:** React + Vite (builds to `dist/`)
- **Backend:** Express server at `server/index.ts`, runs via `tsx`
- **Database:** SQLite via Prisma ORM
- **Deployment:** Coolify (auto-deploys from `main` branch via Docker)
- **Port:** 3001 (standardized everywhere)

## Pre-Push Checklist
1. `npx tsc --noEmit` passes with zero errors
2. No secrets in Dockerfile ARG/ENV
3. `npm run build` succeeds locally
