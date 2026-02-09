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

### 4. Dockerfile
- Do NOT put secrets (like `ADMIN_PASSWORD`) in `ARG` or `ENV` — use Coolify environment variables instead
- The `# check-ignore=critical_high_vulnerabilities` comments suppress Docker DX VSCode warnings for `node:22-alpine` base image CVEs — these are informational, not build errors

### 5. Prisma Patterns
- Always import both `PrismaClient` and `Prisma` from `@prisma/client` when using transactions
- Transaction client type: `Prisma.TransactionClient` (NOT `typeof prisma`)
- After schema changes: run `npx prisma generate` before building

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
