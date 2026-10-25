# Deep Application Audit: Import/Export & Local vs Production

> **Historical record (Feb 2026) — superseded.** Its "sync local → production via Import" advice is now **unsafe**: production is the master copy and import overwrites records and drops photos. Current rules: `HANDOFF.md` → THE ONLY WAY TO SYNC DATA, and `CLAUDE.md`.

**Audit Date:** February 3, 2026  
**Auditor:** AI Code Audit System  
**Project:** Labor Landmarks Map  
**Last Updated:** February 4, 2026 (Final Post-Fix)

---

## 🚨 LESSON LEARNED: THE #1 CAUSE OF TODAY'S ISSUES

**Git push does NOT sync data between local and production.**

The production database is completely separate from local. They ONLY sync via Admin Dashboard Import/Export.

### What Went Wrong Today:
1. Metadata (email, telephone, sourceUrl) was missing on production
2. We kept trying code fixes thinking git push would sync data
3. The real fix was always: Import local data to production via Admin

### The Actual Fix:
1. Fixed the import code to save all metadata fields ✅
2. Synced local → production via Admin Dashboard Import ✅

### How to Prevent This:
- **Read HANDOFF.md first** - it has strict guardrails
- **Always ask:** "Is this a CODE problem or a DATA problem?"
- **CODE problems:** Fix via git push
- **DATA problems:** Fix via Admin Dashboard Import

---

## Executive Summary

This comprehensive audit examines the import/export functionality and local development vs. production configuration of the Labor Landmarks application. 

### Overall Health Score: 🟢 **GOOD** (9/10)

**Critical Issues Found:** ~~2~~ → **0 (FIXED)**  
**Warnings:** ~~6~~ → **2 remaining**  
**Best Practice Recommendations:** 8

### ✅ Issues Fixed in This Session:
1. ✅ Server-side admin auth added to all `/api/admin/*` endpoints
2. ✅ Port standardized to 3001 across Dockerfile, docker-compose.yml, HANDOFF.md
3. ✅ Orphaned `/dev.db` at project root deleted
4. ✅ docker-compose.yml comment corrected (was `labor.db`, now `dev.db`)
5. ✅ TypeScript `Landmark.country` type aligned with Prisma schema (now optional)
6. ✅ HANDOFF.md updated with correct port and security info

---

## 1. PORT CONFIGURATION ANALYSIS

### ✅ RESOLVED: Port Standardized to 3001

| Location | Port Setting | Status |
|----------|-------------|--------|
| `Dockerfile` | `ENV PORT=3001` + `EXPOSE 3001` | ✅ Fixed |
| `docker-compose.yml` | `- "3001:3001"` + `- PORT=3001` | ✅ Consistent |
| `server/index.ts` | `process.env.PORT \|\| 3001` | ✅ Flexible (defaults to 3001) |
| `vite.config.ts` | `target: 'http://localhost:3001'` | ✅ Local dev targets 3001 |
| `README.md` | Documents port 3001 | ✅ Matches |
| `HANDOFF.md` | Updated to document port 3001 | ✅ Fixed |

---

## 2. DATABASE FILE LOCATION ANALYSIS

### ✅ RESOLVED: Orphaned Database Deleted

| File Path | Size | Record Count | Purpose |
|-----------|------|--------------|---------|
| `/prisma/dev.db` | 372,736 bytes | 274 records | ✅ Active local database |
| `/dev.db` (root) | 20,480 bytes | 0 records | ⚠️ Orphaned/stale database |

**Configuration Matrix:**

| `/dev.db` (root) | ~~20,480 bytes~~ | ~~0 records~~ | ✅ **DELETED** |

**Configuration Matrix:**

| Config Source | DATABASE_URL Path |
|--------------|-------------------|
| `.env` (local) | `file:/Users/paulhenshaw/Desktop/labor-map/prisma/dev.db` |
| `Dockerfile` (production) | `file:/app/data/dev.db` |
| `docker-compose.yml` comment | ✅ **Fixed**: Now states `/app/data/dev.db` |

**Remaining Notes:**
- Local `.env` uses absolute path which is machine-specific (works but not portable)
- Consider using relative path in .env: `file:./prisma/dev.db` (optional improvement)

---

## 3. SEEDING & IMPORT DATA FILE ANALYSIS

### Data File Inventory

| File | Location | Records | Schema Completeness |
|------|----------|---------|---------------------|
| `landmarks.json` | `/src/data/` | 15 | ⚠️ Missing: country, email, website, telephone, sourceUrl, isPublished |
| `landmarks_imported.json` | `/src/data/` | 274 | ✅ Full schema |
| `landmarks_backup_2026-02-03.json` | `/` (root) | 274 | ✅ Full schema |

### Seed Script Analysis (`prisma/seed.ts`)

```typescript
// Priority order for seed data:
1. landmarks_imported.json (if exists) ✅
2. landmarks.json (fallback) ⚠️
```

**⚠️ WARNING: Schema Mismatch in Fallback Data**

The fallback file `landmarks.json` has an **outdated schema** missing critical fields:
- `country` - Not present (schema expects optional, defaults to 'USA')
- `email`, `website`, `telephone` - Not present
- `sourceUrl` - Not present  
- `isPublished` - Not present

The seed script hardcodes `isPublished: true` which is correct, but doesn't handle the missing optional fields.

**Impact:** If `landmarks_imported.json` is deleted and seed runs, landmarks would have:
- No contact information
- No source tracking
- No country field (defaults would apply)

**Recommendation:** Update `landmarks.json` to match current schema or remove it as a fallback.

---

## 4. IMPORT/EXPORT FLOW ANALYSIS

### 4.1 Export Flow (Backup)

**Endpoint:** `GET /api/admin/backup`

```typescript
// server/index.ts - Lines 163-178
const landmarks = await prisma.landmark.findMany({
    orderBy: { id: 'asc' }
});
```

✅ **GOOD:** Exports ALL fields including timestamps  
✅ **GOOD:** Orders by ID for consistency  
✅ **GOOD:** Sets proper Content-Disposition header for download

### 4.2 Import Flow (Smart Merge)

**Endpoint:** `POST /api/admin/import`

**Logic Flow:**

```
┌─────────────────────────────────────────────────┐
│              IMPORT DECISION TREE               │
├─────────────────────────────────────────────────┤
│  Has sourceUrl?                                 │
│  ├── YES → Find by sourceUrl (unique index)    │
│  │   ├── Found → UPDATE existing record        │
│  │   └── Not Found → CREATE new record         │
│  │                                             │
│  └── NO → Manual record handling               │
│      ├── Find by: name + lat/lng (±0.0001)    │
│      │   ├── Found → SKIP (duplicate)         │
│      │   └── Not Found → CREATE new record    │
└─────────────────────────────────────────────────┘
```

**⚠️ WARNINGS:**

1. **Manual records without sourceUrl can ONLY be skipped, never updated**
   - If you edit a manual record locally and re-import, the production copy won't be updated
   - The precision matching (±0.0001 degrees ≈ 11 meters) is good but still allows near-duplicates

2. **ID field is NOT used for matching**
   - Imported records get NEW IDs in the target database
   - This is correct for portability but can be confusing

3. **No validation of required fields**
   - Import doesn't validate that `name`, `city`, `state`, etc. are present
   - Malformed JSON could create incomplete records

4. **No transaction wrapping**
   - If import fails midway, partial data remains
   - Should use `prisma.$transaction()` for atomicity

---

## 5. LOCAL DEVELOPMENT vs PRODUCTION COMPARISON

### Environment Matrix

| Aspect | Local Dev | Production (Docker) |
|--------|-----------|---------------------|
| **Server Port** | 3001 | 3001 (via docker-compose override) |
| **Frontend Port** | 5173 (Vite dev server) | N/A (served by Express) |
| **API Proxy** | Vite proxies `/api` → `localhost:3001` | Direct (same origin) |
| **Database Path** | `prisma/dev.db` (local filesystem) | `/app/data/dev.db` (Docker volume) |
| **Admin Auth** | Skipped (localhost check) | Required (`ADMIN_PASSWORD` env var) |
| **Static Files** | Vite serves from `src/` | Express serves from `dist/` |

### 5.1 Admin Authentication Logic

**Location:** `src/App.tsx` - Lines 136-143

```typescript
const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Local dev skips auth
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return true;
    }
    return sessionStorage.getItem('isAdminAuthenticated') === 'true';
});
```

✅ **GOOD:** Clean separation of local vs production auth  
⚠️ **NOTE:** If running local dev on a network IP, auth would be required

### 5.2 API URL Resolution

All frontend API calls use **relative paths** (`/api/...`):

| Component | API Calls |
|-----------|-----------|
| `App.tsx` | `fetch('/api/landmarks')` |
| `AdminDashboard.tsx` | `fetch('/api/admin/landmarks')`, `/api/admin/import`, etc. |
| `LandmarkModal.tsx` | `fetch('/api/landmarks')` or `/api/landmarks/:id` |
| `SuggestionModal.tsx` | `fetch('/api/landmarks')` |
| `AdminLogin.tsx` | `fetch('/api/admin/verify-password')` |

✅ **EXCELLENT:** Relative paths work seamlessly in both environments:
- Local: Vite proxy forwards to Express
- Production: Same origin, no proxy needed

---

## 6. DOCKER VOLUME PERSISTENCE

### Volume Configuration

```yaml
# docker-compose.yml
volumes:
  - labor_data:/app/data

volumes:
  labor_data:
```

### Dockerfile Data Directory Setup

```dockerfile
RUN mkdir -p /app/data
ENV DATABASE_URL="file:/app/data/dev.db"
```

### Startup Command

```dockerfile
CMD ["sh", "-c", "npx prisma migrate deploy && npx tsx prisma/seed.ts && tsx server/index.ts"]
```

**Startup Flow:**
1. `prisma migrate deploy` - Applies pending migrations to volume DB
2. `npx tsx prisma/seed.ts` - Runs seed script (smart: skips if data exists)
3. `tsx server/index.ts` - Starts Express server

✅ **GOOD:** Migration runs on every startup (idempotent)  
✅ **GOOD:** Seed is conditional (won't overwrite existing data)  
⚠️ **NOTE:** If container image changes but volume persists, migrations handle schema updates

---

## 7. MIGRATION SAFETY ANALYSIS

### Current Migration History

| Migration | Date | Changes |
|-----------|------|---------|
| `20260202235918_init` | Feb 2, 2026 | Initial schema (name, city, state, category, description, address, lat, lng) |
| `20260203013803_add_is_published` | Feb 3, 2026 | Added `isPublished` boolean (default: false) |
| `20260203161200_add_contact_fields` | Feb 3, 2026 | Added `email`, `telephone`, `website` |
| `20260203194806_add_country_and_source` | Feb 3, 2026 | Added `country` (default: 'USA'), `sourceUrl` (unique) |

### Schema Evolution Safety

**⚠️ WARNING: `isPublished` Default Changed**

The migration adds `isPublished` with `DEFAULT false`, but the current schema shows:

```prisma
isPublished Boolean  @default(false)
```

This means:
- **New records** via API default to `false` (unpublished) ✅
- **Old records** during migration got `false` initially
- The seed script sets `isPublished: true` for seeded data ✅

**Potential Issue:** If production already had data before the `isPublished` migration, those records became unpublished. This was likely intentional but worth noting.

---

## 8. UTILITY SCRIPTS ANALYSIS

### Script Inventory

| Script | Purpose | Database Target | Safety |
|--------|---------|-----------------|--------|
| `export_to_json.ts` | Export DB → `landmarks_imported.json` | Local `.env` DB | ✅ Safe (read-only export) |
| `import_geocoded.ts` | Import from external JSON | Hardcoded path + Local DB | ⚠️ Hardcoded absolute path |
| `fix_international_data.ts` | Fix country/city data | Local `.env` DB | ✅ Safe (targeted updates) |
| `recover_categories.ts` | Fix categories from descriptions | Local `.env` DB | ✅ Safe (targeted updates) |
| `audit_and_fix_locations.ts` | Fix specific location errors | Local `.env` DB | ✅ Safe (targeted updates) |
| `fix_json_source.ts` | Fix JSON file directly | Hardcoded path | ⚠️ Modifies external file |

### ⚠️ WARNING: Hardcoded Paths in Scripts

**`prisma/import_geocoded.ts`:**
```typescript
const sourcePath = '/Users/paulhenshaw/Desktop/pull-data/landmarks_geocoded.json';
```

**`scripts/fix_json_source.ts`:**
```typescript
const sourcePath = '/Users/paulhenshaw/Desktop/pull-data/landmarks_geocoded.json';
```

**Impact:** These scripts only work on the original developer's machine.

**Recommendation:** Accept source path as command-line argument or environment variable.

---

## 9. DATA INTEGRITY ANALYSIS

### Current State Summary

| Metric | Value | Status |
|--------|-------|--------|
| Database Records | 274 | ✅ Healthy |
| landmarks_imported.json Records | 274 | ✅ Synced |
| landmarks_backup Records | 274 | ✅ Synced |
| Records with sourceUrl | Unknown | ⚠️ Should audit |
| Records with country != 'USA' | Unknown | ⚠️ Should audit |

### Schema Field Coverage

Based on seed data analysis:

| Field | Required | Present in Data | Notes |
|-------|----------|-----------------|-------|
| id | ✅ | ✅ | Auto-increment |
| name | ✅ | ✅ | - |
| city | ✅ | ✅ | - |
| state | ✅ | ✅ | - |
| country | ❌ (optional) | ✅ | Added later, defaults to 'USA' |
| category | ✅ | ✅ | - |
| description | ✅ | ✅ | - |
| address | ✅ | ✅ | - |
| lat | ✅ | ✅ | - |
| lng | ✅ | ✅ | - |
| email | ❌ (optional) | ✅ (mostly null) | - |
| website | ❌ (optional) | ✅ (mostly null) | - |
| telephone | ❌ (optional) | ✅ (mostly null) | - |
| sourceUrl | ❌ (optional, unique) | ✅ (mostly null) | For scraped records |
| isPublished | ✅ | ✅ | - |
| createdAt | ✅ | ✅ (auto) | - |
| updatedAt | ✅ | ✅ (auto) | - |

---

## 10. FRONTEND-BACKEND API CONTRACT

### Type Definition (`LandmarkCard.tsx`)

```typescript
export interface Landmark {
    id: number;
    name: string;
    city: string;
    state: string;
    category: string;
    description: string;
    address: string;
    lat: number;
    lng: number;
    email?: string;
    website?: string;
    telephone?: string;
    country: string;         // Not optional in frontend type
    sourceUrl?: string;
    isPublished?: boolean;
}
```

### Prisma Schema

```prisma
model Landmark {
  country     String?   // Optional in database
}
```

**✅ RESOLVED: Type Aligned**

Frontend `Landmark.country` is now optional (`string?`) matching Prisma schema.

---

## 11. SECURITY CONSIDERATIONS

### ✅ Authentication (FIXED)

| Aspect | Status | Notes |
|--------|--------|-------|
| Admin password storage | ✅ | Environment variable only |
| Server-side API auth | ✅ | **FIXED**: Bearer token middleware on all `/api/admin/*` |
| Session management | ✅ | Uses `sessionStorage` + sends token with requests |
| Password transmission | ⚠️ | Sent as Bearer token (HTTPS required in prod) |
| Local dev bypass | ✅ | Intentional for DX (skipped if no ADMIN_PASSWORD set) |

### ✅ Data Access (FIXED)

| Endpoint | Protection | Notes |
|----------|------------|-------|
| `GET /api/landmarks` | ❌ Public | Only returns `isPublished: true` ✅ |
| `GET /api/admin/landmarks` | ✅ **Protected** | Requires Bearer token |
| `POST /api/admin/import` | ✅ **Protected** | Requires Bearer token |
| `DELETE /api/admin/clear` | ✅ **Protected** | Requires Bearer token |
| `GET /api/admin/backup` | ✅ **Protected** | Requires Bearer token |
| `POST /api/admin/verify-password` | ❌ Public | Intentional (it's the login endpoint) |

**Security Model:**
- Frontend stores password in `sessionStorage` after successful login
- All admin API calls include `Authorization: Bearer <password>` header
- Server middleware validates token before processing request
- If no `ADMIN_PASSWORD` env var is set, auth is skipped (local dev convenience)

---

## 12. GITIGNORE & DEPLOYMENT ARTIFACTS

### .gitignore Analysis

```
✅ .env                  # Secrets not committed
✅ *.db, prisma/*.db     # Local databases not committed
✅ node_modules          # Dependencies not committed
✅ dist                  # Build artifacts not committed
```

### .dockerignore Analysis

```
✅ node_modules          # Rebuilt in container
✅ dist                  # Rebuilt in container
✅ .env                  # Production uses different env vars
✅ .git                  # Not needed in container
```

### Files That ARE Committed (by design)

```
✅ src/data/landmarks_imported.json  # Seed data for fresh deployments
✅ src/data/landmarks.json           # Fallback seed data
✅ prisma/migrations/                # Schema history
```

---

## 13. RECOMMENDATIONS SUMMARY

### 🔴 Critical (Fix Immediately)

### ~~🔴 Critical (Fix Immediately)~~ ✅ DONE

1. ~~**Add server-side authentication** to `/api/admin/*` endpoints~~ ✅
2. ~~**Standardize port configuration** - Update Dockerfile to use 3001~~ ✅

### ~~🟠 High Priority (Fix Soon)~~ ✅ MOSTLY DONE

3. ~~**Delete orphaned `/dev.db`** at project root~~ ✅
4. **Wrap import in database transaction** for atomicity ⏳ (remaining)
5. ~~**Update docker-compose.yml comment** about database filename~~ ✅
6. ~~**Fix TypeScript type for `country`** - align frontend and backend~~ ✅

### 🟡 Medium Priority (Recommended)

7. **Update `landmarks.json` fallback** to match current schema
8. **Parameterize hardcoded paths** in utility scripts
9. **Add import validation** for required fields
10. ~~**Document the actual port strategy** in HANDOFF.md~~ ✅

### 🔵 Low Priority (Best Practice)

11. Consider adding rate limiting to public API
12. Add health check endpoint for monitoring
13. Consider using `better-sqlite3` driver for performance
14. Add integration tests for import/export flows

---

## 14. LOCAL DEV QUICK REFERENCE

### Commands

```bash
# Start full stack (frontend + backend)
npm run dev:fullstack

# Frontend only (needs backend running)
npm run dev

# Backend only
npm run server

# Database operations
npx prisma studio          # Visual DB browser
npx prisma migrate dev     # Create migration
npx prisma generate        # Regenerate client

# Utility scripts
npx tsx scripts/export_to_json.ts
npx tsx scripts/fix_international_data.ts
```

### URLs

| Service | URL |
|---------|-----|
| Frontend (dev) | http://localhost:5173 |
| API (dev) | http://localhost:3001/api |
| Prisma Studio | http://localhost:5555 |

---

## 15. PRODUCTION CHECKLIST

Before deploying:

- [ ] Ensure `ADMIN_PASSWORD` environment variable is set
- [ ] Verify port mapping in deployment platform matches docker-compose.yml
- [ ] Confirm Docker volume is configured for `/app/data`
- [ ] Test import/export cycle with production backup
- [ ] Verify migrations will apply cleanly

---

## Appendix A: File Reference Map

```
labor-map/
├── .env                          # LOCAL: Database URL (machine-specific)
├── Dockerfile                    # PROD: Container definition
├── docker-compose.yml            # PROD: Orchestration
├── prisma/
│   ├── schema.prisma             # Source of truth for DB schema
│   ├── seed.ts                   # Smart seeding logic
│   ├── dev.db                    # LOCAL: Active database
│   └── migrations/               # Schema version history
├── server/
│   └── index.ts                  # Express API (port, routes, import logic)
├── src/
│   ├── App.tsx                   # Frontend routing + admin auth bypass
│   ├── data/
│   │   ├── landmarks_imported.json  # Primary seed data (274 records)
│   │   └── landmarks.json           # Fallback seed data (15 records, outdated schema)
│   └── components/
│       ├── AdminDashboard.tsx    # Import/Export UI
│       └── AdminLogin.tsx        # Password verification
├── scripts/                      # Utility scripts (run locally only)
├── vite.config.ts                # Dev server proxy config
├── HANDOFF.md                    # Documentation (has port discrepancy)
└── README.md                     # Usage documentation
```

---

*End of Audit Report*
