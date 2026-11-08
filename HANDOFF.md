# Labor Landmarks: Project Handoff & Roadmap

> **New session?** Read **CURRENT STATE** (near the end) first, then the critical section below.
> Permanent rules live in `CLAUDE.md`.

---

## ✅ Resolved 14 Sep 2026 — some readers got ERR_SSL_PROTOCOL_ERROR

A home-router security filter (Spectrum Security Shield) was blocking `supersoul.top`; Spectrum
approved the unblock request. Fallback if it recurs, and the full investigation: `network-error.md`
in the *labor-database* working copy (local-only). **Don't change DNS or Coolify for this.**

---

## ✅ Closed: Rochester map data import (no import needed)

Chris entered the Rochester landmarks by hand himself (his email of 13 Sep 2026; entries edited
through 18 Sep), and the bulk import is not on LHF's 22 Oct priority list. The extracted data stays
in `map_data/` for reference. **Don't import it** — 16 of its 60 entries already exist on the live
site and would duplicate.

---

## 🚨🚨🚨 STOP AND READ THIS FIRST 🚨🚨🚨

> **Every AI session MUST read this section before doing ANYTHING.**  
> **This project has TWO completely separate environments. They do NOT sync automatically.**

---

## THE TWO WORLDS (MEMORIZE THIS)

```
╔══════════════════════════════════════════════════════════════════╗
║                         LOCAL DEV                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend URL:  http://localhost:5173                            ║
║  API URL:       http://localhost:3001                            ║
║  Database:      /prisma/dev.db (on YOUR Mac)                     ║
║  Admin Login:   REQUIRED (any password if ADMIN_PASSWORD unset)  ║
║                 localhost bypass removed 25 Oct 2026             ║
║  Purpose:       Development, testing, data preparation           ║
║  Safe to break: YES                                              ║
╚══════════════════════════════════════════════════════════════════╝

                    ┃  These are COMPLETELY SEPARATE  ┃
                    ┃  Git push does NOT sync data    ┃
                    ┃  Production is the master copy  ┃

╔══════════════════════════════════════════════════════════════════╗
║                        PRODUCTION                                 ║
╠══════════════════════════════════════════════════════════════════╣
║  Frontend URL:  https://labor-landmarks.supersoul.top            ║
║  API URL:       https://labor-landmarks.supersoul.top/api        ║
║  Database:      /app/data/dev.db (Docker volume on Coolify)      ║
║  Admin Login:   REQUIRED (ADMIN_PASSWORD env var)                ║
║  Purpose:       Live public site for client                      ║
║  Safe to break: NO - CLIENT DATA LIVES HERE                      ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## WHAT GIT PUSH DOES vs DOES NOT DO

**A push alone changes nothing that is running** — no app on this server auto-deploys. The left
column happens only after you press **Deploy** in Coolify. A deploy that adds a migration needs
**Stop, then Deploy** (CLAUDE.md §4b).

| ✅ Push + Deploy DOES | ❌ Never does |
|------------------|----------------------|
| Update React components | Change production database |
| Update API endpoint code | Sync your local landmarks |
| Update CSS/styling | Import new records |
| Apply schema migrations | Update existing record data |
| Update the seed file | Automatically run the seed |
| Deploy new Docker image | Touch the Docker volume |

**CRITICAL:** The production database lives in a Docker volume. Code deploys NEVER touch it (unless the DB is empty — then the seed loads 273 starter records).

---

## THE ONLY WAY TO SYNC DATA

> ⚠️ **Production is the master copy.** LHF edits live in production admin every week; the local
> database is a months-old snapshot (last refreshed Mar 2026). **Never import a local backup over
> production to "fix" it** — that overwrites newer edits.

**What Admin Import actually does (25 Oct 2026):**
- A record whose `sourceUrl` matches an existing one **overwrites** it (name, description, address…).
- A record without `sourceUrl` that matches name + location is skipped; otherwise it is added.
- It **does not restore photos, submitter name/email/comment, or original dates.** The backup lists
  photo filenames but contains no image files.

**So:** use Import only to **add new records prepared locally**, and only after:
1. PRODUCTION: Login → **"Backup JSON"** (safety copy)
2. Check the import file against that fresh production backup: no unintended name/`sourceUrl` matches
3. PRODUCTION: **"Import JSON"** → check the added/updated/skipped counts match what you expected

To fix a single production record, edit it in production admin. For a full restore including photos,
the export/restore-with-photos work (tracker row 3) is the planned fix.

---

## COOLIFY PERSISTENT STORAGE — REQUIRED VOLUMES

**Both volumes below MUST exist in Coolify or data will be DESTROYED on every deploy.**

| Volume | Destination Path | What It Stores | Without It |
|--------|-----------------|----------------|------------|
| `*-labor-land*` | `/app/data` | SQLite database (all landmarks) | **ALL landmarks lost every deploy** |
| `*-landmarks-uploads` | `/app/uploads` | Uploaded images & thumbnails | All images lost every deploy |

**Verify:** Coolify → Configuration → Persistent Storage → should show **2 volumes**.

---

## ABSOLUTE RULES (NEVER BREAK THESE)

| Rule | Why |
|------|-----|
| 🔴 NEVER assume git push syncs data | It doesn't — and a push isn't live until Deploy is pressed. |
| 🔴 NEVER import a local backup over production | Local is months old; import overwrites newer edits and drops photos |
| 🔴 NEVER run scripts against production | Scripts use local .env DATABASE_URL |
| 🔴 NEVER manually edit .db files | Use Admin Dashboard or Prisma Studio |
| 🔴 NEVER confuse localhost with production URL | Check the URL bar before every action |
| 🔴 NEVER deploy without verifying BOTH Coolify volumes exist | Without `/app/data` volume, DB is wiped every deploy |
| 🔴 NEVER add `apk add` to Dockerfile | Alpine CDN has DNS outages — use built-in tools or npm packages |
| 🔴 NEVER use framer-motion `layout`/`AnimatePresence` on lists with 100+ items | Crashes mobile browsers (see Phase 9) |
| 🟢 ALWAYS ask user which environment they mean | "Local or production?" |
| 🟢 ALWAYS backup production before importing | Click Backup JSON first (it has no photo files — the volume snapshot does) |
| 🟢 ALWAYS verify record counts after sync | Compare local vs production counts |
| 🟢 ALWAYS check if local server is running | `curl http://localhost:3001/api/landmarks` |

---

## COMMON PITFALLS (AI AGENTS READ THIS)

### Pitfall 1: "Production data is wrong/missing"
**WRONG:** Try to fix via code changes and git push — or import the local database over it  
**RIGHT:** Edit the record in production admin. For lost data, restore from a production backup or the VPS snapshot.

### Pitfall 3: "Local shows data, production doesn't"
**CAUSE:** They're separate databases — and local is the stale one  
**FIX:** Usually nothing to fix. To add genuinely new records, follow THE ONLY WAY TO SYNC DATA.

### Pitfall 4: "After deploy, production data disappeared"
**CAUSE:** Docker volume wasn't persisted OR seed ran on empty DB  
**CHECK:** Does production show 0 records or seed data (273)?  
**FIX:** Check both Coolify volumes are mounted, then restore the volumes from the VPS snapshot (keeps photos). A JSON import alone loses photos and recent edits.

### Pitfall 5: "I ran a fix script but production didn't change"
**CAUSE:** Scripts run against LOCAL database only  
**FIX:** After running script locally, sync to production via Admin

### Pitfall 6: "Deploy failed — apk add curl: DNS transient error"
**CAUSE:** Alpine Linux CDN (`dl-cdn.alpinelinux.org`) has intermittent DNS outages. The `--no-cache` flag means `apk` re-downloads on every build, so any CDN hiccup kills the deploy.  
**FIX (PERMANENT):** Removed `RUN apk add --no-cache curl` from the Dockerfile (Mar 2026). Alpine includes `wget` natively. Never add `apk add` back — use npm packages or built-in Alpine tools instead.

### Pitfall 7: "List view crashes / 'Can't open this page' on mobile"
**CAUSE:** Framer Motion `layout` + `AnimatePresence mode="popLayout"` on 336 `LandmarkCard` components creates 336 simultaneous GPU-composited animation layers, exceeding mobile browser memory (~300-500MB).  
**FIX (PERMANENT):** Removed per-card framer-motion animations (Mar 2026). Cards now use CSS `hover:-translate-y-1` for hover effects. DetailModal still uses framer-motion (1 element at a time = fine).

---

## QUICK DIAGNOSTIC COMMANDS

```bash
# Check LOCAL database record count
curl -s http://localhost:3001/api/landmarks | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).length"

# Check PRODUCTION database record count  
curl -s https://labor-landmarks.supersoul.top/api/landmarks | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).length"

# Check if local server is running
curl -s http://localhost:3001/api/landmarks > /dev/null && echo "LOCAL: Running" || echo "LOCAL: Not running"

# Compare a specific record (The Prospector example)
curl -s http://localhost:3001/api/landmarks | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).find(x=>x.name?.includes('Prospector'))?.telephone"
curl -s https://labor-landmarks.supersoul.top/api/landmarks | node -p "JSON.parse(require('fs').readFileSync(0,'utf8')).find(x=>x.name?.includes('Prospector'))?.telephone"
```

---

## AI SESSION CHECKLIST (DO THIS EVERY TIME)

Before doing ANY work, confirm:

- [ ] Which environment is the user talking about? (local or production)
- [ ] Is the local dev server running? (`npm run dev` in one terminal, server in another)
- [ ] What is the current record count on local vs production?
- [ ] Does production have the expected metadata? (email, telephone, sourceUrl)
- [ ] Has the user backed up production recently?

---

## End of Critical Section

**If you skipped the above, GO BACK AND READ IT.**

---

## Project Vision
To create a robust, searchable, and manageable inventory of American labor history, accessible via map and list views, with a secure admin backend for curators.

---

## Technical Architecture (The "Best Way" Forward)

To keep everything consolidated and ready for Docker/Git deployment, we will move to a **Unified Full-Stack Structure**:

### 1. Unified Repository structure
```text
labor-map/
├── prisma/             # Schema and Migrations
├── server/             # Express.js Source
│   └── api/            # API Controllers
├── src/                # React (Vite) Frontend
├── public/             # Static Assets
├── Dockerfile          # Multi-stage Build (Vite build + Express server)
├── package.json        # Main dependencies & scripts
└── .env                # Database URL & Credentials (future)
```

### 2. Core Stack Decisions
- **ORM**: **Prisma** (Provides type-safe DB access and easy migrations).
- **Database**: **SQLite** (Self-contained, perfect for Docker volumes).
- **Backend**: **Express.js** (Lightweight, well-supported, and easy to containerize).
- **Frontend Integration**: Vite's proxy will handle local development, while the Express server will serve the static Vite build in production.

---

## Expert Engineering Rationale (Why this works)

As an expert engineer, I recommend this for an **"All-in-One"** portable solution for several reasons:

1.  **Zero-Infra SQLite**: By using SQLite, you avoid the "DB Server Tax." You don't need to spin up a Postgres or MySQL instance. The database is just a file inside your repository/container. This makes backups as easy as copying a single file.
2.  **Prisma Type-Safety**: Even with a "simple" DB like SQLite, Prisma gives you a robust migration system and auto-generated TypeScript types. This prevents the "Admin UI broke because a column name changed" bug.
3.  **Docker Portability**: Since the DB is a file and the server is Node.js, you can run this app on a Raspberry Pi, a cheap VPS, or a high-end cloud provider without changing a single line of code.
4.  **Performance**: For an inventory/map with thousands (or even tens of thousands) of entries, SQLite is actually *faster* than Postgres because it lacks the network overhead of talking to a separate DB server.

**Conclusion**: This is the "Gold Standard" for internal tools, inventory maps, and small-to-medium datasets where simplicity and portability are king.

---

## Phased Development Roadmap

### Phase 1: Foundation (Completed)
- [x] Initialize Prisma with SQLite.
- [x] Create `schema.prisma` with `Landmark` model.
- [x] Write a `seed.ts` script to ingest existing `landmarks.json` into the DB.
- [x] Setup a basic Express server to serve as the API layer.

### Phase 2: Admin CRUD (Completed)
- [x] Setup `react-router-dom` for `/` and `/admin` routes.
- [x] **API Endpoints**: GET, POST, PUT, DELETE for landmarks.
- [x] **Admin UI**: Table view of all landmarks with "Edit" and "Delete" actions.
- [x] **Landmark Form**: A robust modal-based form for adding/modifying landmarks.

### Phase 3: Deployment & Persistence (Completed)
- [x] **Dockerization**: Create a `Dockerfile` that builds the frontend and runs the Node server.
- [x] **Persistence**: Configure a Docker volume for the `sqlite.db` file to ensure data survives container restarts.
- [x] **Environment Variables**: Move API URLs and secret keys to `.env`.

### Phase 5: Public Contributions & Moderation (Completed)
- [x] **Suggestions**: "Suggest a Site" modal for public users with address autocomplete.
- [x] **Review Queue**: Admin Dashboard tab to approve/reject draft submissions.
- [x] **Draft Status**: `isPublished` flag in database to separate live vs. pending items.

### Phase 6: UX & Reliability Polish (Completed)
- [x] **Map UX**: Fixed marker click behavior (auto-center/zoom) and improved popup styling (wider, no header overlap).
- [x] **Admin Consistency**: Replaced all native browser alerts with custom `ConfirmationModal` components for a unified, modern design.
- [x] **Data Integrity**: Established database restoration workflow and verified persistence.

### Phase 7: Alpha Launch Client Feedback (Completed — Feb 2026)

All changes implemented locally, build passes (`tsc --noEmit` clean), **NOT YET COMMITTED OR PUSHED**.

#### 7A. UI Quick Wins (Done)
- [x] **"Suggest a Landmark" button**: Renamed from "Suggest Site" in Header.tsx (desktop + mobile). Restyled to prominent `bg-red-600 hover:bg-red-700` with white text.
- [x] **About modal access**: Added clickable `Info` icon in bottom-left footer (App.tsx, z-[1500]) that opens AboutModal. Also accessible from hamburger menu.
- [x] **Copyright update**: Changed from "Labor Radio Network" to "The Labor Heritage Foundation" with link to laborheritage.org.
- [x] **AboutModal text**: Updated references from "Suggest Site" to "Suggest a Landmark".

#### 7B. Image Gallery System — Schema + API (Done)
- [x] **Prisma schema**: Added `LandmarkImage` model with `id`, `landmarkId`, `filename`, `caption`, `sortOrder`, `createdAt`. Cascade delete from Landmark.
- [x] **Migration**: `20260210000727_add_landmark_images` (in `prisma/migrations/`)
- [x] **Dependencies added**: `multer` (file uploads), `sharp` (thumbnail generation), `@types/multer`, `@types/sharp`
- [x] **API endpoints** (server/index.ts):
  - `POST /api/landmarks/:id/images` — multipart upload, saves original + 400px thumbnail via sharp
  - `DELETE /api/landmarks/:id/images/:imageId` — admin-protected, removes files + DB record
  - Static serving: `app.use('/uploads', express.static(...))`
  - All landmark queries now include `include: { images: { orderBy: { sortOrder: 'asc' } } }`
- [x] **Dockerfile**: Added `RUN mkdir -p /app/data /app/uploads/landmarks`

#### 7C. Image Gallery System — Frontend (Done)
- [x] **LandmarkCard.tsx**: Added `LandmarkImage` interface export, `images` field to `Landmark` interface, thumbnail display on cards
- [x] **DetailModal.tsx**: Gallery section with primary image + thumbnail strip, click to open lightbox
- [x] **MapView.tsx**: Map marker popups show thumbnail image (h-36, full-bleed) above landmark name when images exist
- [x] **ImageLightbox.tsx** (NEW): Full-screen overlay at z-[20000], keyboard nav (Escape/arrows), Framer Motion animations
- [x] **ImageUploader.tsx** (NEW): Reusable drag-and-drop component with previews, file validation, existing image management
- [x] **SuggestionModal.tsx**: Added ImageUploader (max 5 files), two-step submit (create landmark, then upload images)
- [x] **LandmarkModal.tsx**: Added ImageUploader (max 10 files) with existing image display/delete for admin editing

#### 7D. Dev Tooling (Done)
- [x] **dev.sh** (NEW): Startup script that force-kills processes on ports 3001/5173/5174, verifies ports free, runs prisma generate, starts both servers with trap for clean Ctrl+C
- [x] **package.json**: `"dev:fullstack": "./dev.sh"`

### Phase 9: Mobile Crash Fix & Dockerfile Hardening (Completed — Mar 2026)

#### 9A. Mobile List View Crash Fix (Done)
- [x] **Root cause**: 336 `LandmarkCard` components each with framer-motion `layout`, `initial`, `animate`, `exit`, `whileHover` props rendered simultaneously when switching to list view. This created 336 GPU-composited animation layers + ~5,000 DOM nodes, exceeding mobile browser memory limits (~300-500MB) and crashing the Chrome/Safari renderer process.
- [x] **`LandmarkCard.tsx`**: Replaced `motion.div` with plain `div`, added CSS `hover:-translate-y-1 transition-all` for hover lift effect.
- [x] **`ListView.tsx`**: Removed `AnimatePresence mode="popLayout"` and `motion.div layout`, replaced with plain `div` grid.
- [x] **`App.css`**: Removed leftover Vite scaffold styles (`#root { max-width: 1280px; padding: 2rem; }`) that squeezed mobile layout.
- [x] **`index.css`**: Added missing `.no-scrollbar` CSS utility (was referenced in 4 places but never defined).
- [x] **`App.tsx`**: Changed `h-screen` → `h-dvh` on loading + main containers (fixes mobile address bar viewport height).

#### 9B. Dockerfile Hardening (Done)
- [x] **Removed `RUN apk add --no-cache curl`**: Alpine CDN DNS outage caused two consecutive deployment failures. `curl` was only installed "in case" for healthchecks that were never configured. Alpine includes `wget` natively.
- [x] **Result**: Dockerfile no longer depends on external package registries during build (only npm and Docker Hub, which are far more reliable).

### Phase 10: Search Overhaul (Completed — Apr 2026)

Prompted by feedback from Saul Schniderman (LHF co-founder, former Library of Congress cataloger).

**Bug fixed**: Searching "Bloomington Illinois" returned 0 results; "Bloomington" returned 3. Root cause: the entire query was treated as a single substring that had to appear in one field — no multi-word support.

**Changes (`src/App.tsx`, `src/components/AdminDashboard.tsx`):**
- [x] **Multi-word AND logic**: Query is split on whitespace; every word must match (in any field) — "Bloomington Illinois" → ["bloomington", "illinois"] → both must match across name/city/state/description
- [x] **State full-name mapping**: "Illinois" now matches landmarks with state "IL" (and vice versa) via a complete US state abbreviation ↔ full-name lookup table
- [x] **Punctuation normalization**: Apostrophes and hyphens stripped before matching — "Workers Memorial" matches "Workers' Memorial"
- [x] **Whitespace trim**: Leading/trailing spaces stripped before processing
- [x] **Description field added**: Landmark description is now included in the search target (was previously ignored)

**What is NOT changed**: category filter (separate system), database schema, server-side API (search remains client-side)

**Audit doc**: `search-queries.md` — full bug inventory and plan (generated Apr 2026)

### Phase 12: Map Controls, Deploy Fix, Security (Completed — 25 Oct 2026)
- Globe "show all landmarks" button + dark control group (member request) — `6dba6e9`
- Deploys failed since the Coolify upgrade (startup migration locked out) — `docker-entrypoint.sh` — `2780bde`
- Security: password on every write route, one-time photo key for public suggestions, helmet, rate limits — `7c779a0`
- Package security updates (sharp 0.35.5, multer 2.5, Express internals) — `4699c56`
- Details: CURRENT STATE below; rules: CLAUDE.md §4b, §6b, Dependency security

### Phase 11: Future Enhancements (Recommended Next)
- [ ] **Export/restore with photos** (tracker row 3): one ZIP with data + images; restore into an empty site
- [ ] **Email Notifications**: Resend (recommended) or Nodemailer for new suggestion alerts
- [ ] **Image reordering**: Drag-to-reorder images in admin modal (sortOrder)
- [ ] **Image captions**: Caption editing UI in admin modal

---

## Deployment & Data Strategy (Technical Details)

### The Separation of CODE and DATA
-   **CODE (Git/Coolify)**: When you push to GitHub, Coolify rebuilds your app. This updates the logic (React components, API endpoints, styling).
-   **DATA (SQLite)**: The database file (`dev.db`) sits in a "Volume" on the server. **It is NOT overwritten by code deployments.**
    -   *Why?* If we replaced the DB every time you pushed code, you would delete every user submission and edit made on the production site.

### Smart Merge Logic (How Import Works)

When you click "Import JSON", the system does this for each record:

```
IF record has sourceUrl:
    → Find existing record by sourceUrl
    → If found: UPDATE all fields
    → If not found: CREATE new record
    
IF record has NO sourceUrl (manual entry):
    → Find existing by Name + Coordinates (±11 meters)
    → If found: SKIP (don't create duplicate)
    → If not found: CREATE new record
```

**Important:** Manual records (no sourceUrl) can only be ADDED, not UPDATED via import. Edit them directly in the Admin Dashboard.

### Critical Technical Configs (For Coolify/Docker)

*   **Ports**: **3001** locally and as the Dockerfile default (`EXPOSE 3001`, `ENV PORT=3001`). **Production listens on 3000** — Coolify's configuration overrides the default. Coolify's health check must use **port 3000, path `/api/health`** (set 25 Oct 2026; port 3001 there fails every deploy).
*   **API Security**: Every route that changes data, and every `/api/admin/*` route, requires `Authorization: Bearer <ADMIN_PASSWORD>` (sent by `src/utils/adminFetch.ts`). Public photo uploads use a one-time key instead. Full rules: CLAUDE.md §6b.
*   **Health check**: `GET /api/health` → `{"status":"ok"}` (200) or 503 — it queries the database.
*   **Database Migrations**:
    *   **Rule**: If you change `prisma/schema.prisma` (e.g., add a column), you **MUST** run `npx prisma migrate dev` locally.
    *   **Why?**: This generates the SQL file in `prisma/migrations/`. The production server uses this file to update the live database.
-   **Seeding**: `docker-entrypoint.sh` runs `prisma/seed.ts` on every start, but it only writes into an
    **empty** database (loads `src/data/landmarks_imported.json`, 273 records). With data present it does
    nothing. `FORCE_SEED=true` **overwrites everything** — never set it in production.

---

## Utility & Maintenance Scripts (`/scripts`)

TypeScript scripts, run with `npx tsx scripts/<name>.ts`. **All of them use the LOCAL database** (`.env`
`DATABASE_URL`) — they never touch production.

| Script | What it does |
|---|---|
| `security-check.ts` | `npm run check:security` — static check that every write route has auth; with `BASE=` set, live attack checks against a **throwaway** server (it creates/deletes rows — never production) |
| `fix_international_data.ts` | Fixes landmarks mislabelled "USA" from coordinates; corrects known geocoding errors |
| `recover_categories.ts` | Restores `category` where it was set to the landmark's name, from the description text |
| `audit_and_fix_locations.ts` | One-off location fixes for specific named landmarks |
| `export_to_json.ts` | Dumps the local database to JSON |
| `fix_json_source.ts` | One-off fix to an external source file (hardcoded path outside this repo) |

---

## AI Handoff Protocol
When picking up from this document, future AI agents should:
1.  **Check Data Health**: Run `npx tsx scripts/recover_categories.ts` if categories look like titles in the UI.
2.  **Schema Context**: Note that `country` is optional (`String?`) and defaults to `null` to allow international flexibility.
3.  **Local vs Prod**: Always confirm if the user wants to push **Code** (Git, then Deploy in Coolify) or change **Data** (production admin — production is the master copy).
4.  **UI Consistency**: Maintain the "Glassmorphism" theme using Tailwind v4 custom tokens.
5.  **NEVER** set `FORCE_SEED=true` in production — it overwrites all data. The normal seed only fills an empty database.

---

## 🔗 SHAREABLE LINKS — live 8 Nov 2026 (`69083c6`, verified) · ⚠️ three steps at the server move

Every landmark has its own address: `/landmark/<id>-<name>`, e.g.
`/landmark/540-the-abraham-lincoln-brigade-monument`. The number finds the landmark; the words
are for readers. Links with stale or missing words 301 to the current form.
- Opening a landmark (map pin → VIEW DETAILS, or list → READ MORE) sets the address; close,
  Escape or Back returns. **Previous/Next replace the address**, so Back goes to the map/list.
- **A shared link** opens straight away (all landmarks are already loaded); closing it flies
  the map to that landmark. Unknown/unpublished links land on the map with a notice.
- **Copy link** next to the close button (icon only on phones, named for screen readers).
- **Link previews** (Open Graph) for Facebook, iMessage etc.: "Name — City, State", summary,
  first photo — or `public/laborheritage.png` for the 32 of 454 landmarks without one.
- Fixed on the way: Escape now closes the popup in map view too (was list only); the public
  feed's photo URLs use `PUBLIC_BASE_URL` instead of the request's X-Forwarded-Host header;
  the "show all" fit timer is cancelled when the list changes; close button, popup, pins and
  READ MORE buttons have names for screen readers.
- **Admin:** the login no longer waits for every public landmark to load first.
- **Close buttons (8 Nov):** one round `CloseButton` for every popup (dark circle, soft
  shadow). The landmark popup's frame no longer scrolls — only its content does — so Close
  and Copy link stay in the corner (they used to scroll away). Browser check scrolls the popup
  to the bottom on a phone; it fails with the old popup.
- **Locations (8 Nov):** `server/place-name.ts` tidies city/state/country everywhere they
  show (preview, popup, list card, map pin): "NA"/"-" placeholders dropped, all-capitals
  names shown normally, every spelling of the US treated alike. **Data unchanged on purpose.**
  Making every state the same format (~250 full names vs codes) was **decided against** (8 Nov):
  it is cosmetic now, and a scripted edit of live data risks overwriting LHF's edits.

### 🧹 Location fixes for LHF to make by hand in admin (found 8 Nov 2026)
Seven live landmarks have junk or wrong location data. Edit each in **production admin** (never
by script or import). Being sent to Chris and Harold in the next email roundup.

| # | Landmark | Problem | Suggested fix |
|---|---|---|---|
| 54 | Battle of Blair Mountain Historic Site | State "West" (cut short) | State → WV |
| 198 | Oklahoma Labor Heritage Foundation | No city or state | City → Oklahoma City, State → OK (pin is there) |
| 242 | Tejo Power Station (Museum of Electricity) | State "NA" | Clear the state |
| 244 | International Association of Labour History Institutions (IALHI) | Says Amsterdam, Netherlands; **pin is in Vienna, Austria** | LHF to confirm which is right |
| 257 | United Association for Labor Education (UALE) | No city/state, empty description, pin on a default Washington DC spot | LHF: fill in, or unpublish |
| 263 | "Washington DC Labor History items (see CG's list)" | Looks like an internal to-do note, published; empty description | Probably unpublish (not delete) |
| 273 | Working-Class Studies Association | City and state "-" | City → Stony Brook, State → NY (from its address) |
- Code: `server/landmark-link.ts` (shared with the browser), `server/share-meta.ts`,
  `/landmark/:ref` route in `server/index.ts`; the router moved from `App.tsx` to `main.tsx`.
- **Tests:** `npm test` 24 (links; hostile text in every preview field — fails with escaping
  removed). `npm run test:browser` 12 checks in Chrome — 36/36 over three runs; each fix put
  back (Escape, fly-to, Previous/Next, feed header) is caught by its check.

**Coolify setting:** `PUBLIC_BASE_URL=https://labor-landmarks.supersoul.top` (added 8 Nov).

**⚠️ When this app moves to the LHF server — do not miss:**
1. Set `PUBLIC_BASE_URL` to the **new** address. Don't copy the old value across.
2. The old address must redirect **keeping the full path**, so `/landmark/...` links shared
   before the move still open the right landmark. Test with a deep link.
3. That redirect has to keep running as long as old links should work.

Full steps (private): `lhf-server` → `docs/09-apps.md`, "Shareable links".

---

## CURRENT STATE (8 Nov 2026) — READ THIS FIRST IN NEXT SESSION

### Deployed and verified live (8 Nov 2026)
`69083c6` — shareable links, previews, place names, round close buttons (see the section above).
Live checks: preview of #242 reads "Lisbon, Portugal" with its photo; no-photo landmarks use the
logo; unknown links 404; the feed's 1,029 photo URLs use `PUBLIC_BASE_URL` even with a forged
`X-Forwarded-Host`; on a phone Close stays on screen after scrolling; Escape closes on the map.
`main` = production; working tree clean.

### Production (8 Nov 2026)
- **454 published landmarks**, 1,029 photos. #513 "test" is no longer public.
- **7 landmarks need location fixes by hand** — table in "Location fixes for LHF" above.

### Earlier: deployed and verified live (25 Oct 2026)
`6dba6e9` map controls · `2780bde` deploy fix · `7c779a0` security · `4699c56` package updates.
Working tree clean; `main` = production. Live audit after deploy: every write route refuses missing or
wrong passwords, no submitter data or unpublished rows public, map/tiles/markers/address lookup load
with no blocked requests, photo upload + thumbnail work, rate limiter counts per visitor.


### Open items (in order)
1. **Export/restore with photos** (tracker row 3) — today's backup can't fully restore the site (no
   photo files; import drops submitter info and dates). Plan: one ZIP export; restore only into an
   **empty** site. Install Docker locally first (OrbStack or Docker Desktop) to test the real container.
2. ~~Map data import~~ — closed: Chris entered the Rochester landmarks by hand (see top).
3. **Prisma 6 → 7** — clears the last 3 npm advisories (CLI only, not reachable by visitors). Its own project.
4. ~~Coolify health check~~ **Done 25 Oct:** set to `GET localhost:3000/api/health` and verified with a
   successful deploy. (Production runs on 3000, not the code default 3001.)

### Checks before every push
`npx tsc --noEmit` · `npm run build` · `npm test` · `npm run check:security` · `npm run test:browser`
when pages changed (CLAUDE.md Pre-Push Checklist)

### Image System Architecture (No base64 — real files)
Images are stored as real files on disk, NOT base64 in the database:
1. **Upload**: `multer` receives multipart form data into memory — only after the auth check passes (admin password, or a public suggestion's one-time key)
2. **Processing**: `sharp` saves the original + a 400px-wide thumbnail in the **same format** (prefixed `thumb_`). Accepted: JPEG, PNG, WebP up to 5MB
3. **Storage**: Files written to `./uploads/landmarks/` (local) or `/app/uploads/landmarks/` (production)
4. **Serving**: `express.static` serves `/uploads/` directory as static files
5. **Display**: Frontend uses `/uploads/landmarks/thumb_<filename>` for thumbnails, the full filename for the lightbox
6. **Cleanup**: `onDelete: Cascade` removes DB records; DELETE endpoint also removes files from disk

### z-index Layering Reference
```
z-40          — default footer (was)
z-[1000]      — filter bar
z-[1500]      — footer (current, above map controls)
z-[2000]      — header
z-[9999]      — detail modal
z-[10000]     — suggestion modal / landmark modal
z-[20000]     — image lightbox
```

### Express 5 Note
Express 5 types `req.params` values as `string | string[]`. All route handlers use `as string` casts: `parseInt(req.params.id as string)`.

---

## Brainstorming Ideas
- **Museum Integration**: Allow landmarks to be linked to existing museum collections.
- **Map Interaction**: Long-press on the map to "Quick-Add" a landmark at those coordinates.

