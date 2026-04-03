# Labor Landmarks: Project Handoff & Roadmap

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
║  Admin Login:   NOT REQUIRED (auto-bypassed on localhost)        ║
║  Purpose:       Development, testing, data preparation           ║
║  Safe to break: YES                                              ║
╚══════════════════════════════════════════════════════════════════╝

                    ┃  These are COMPLETELY SEPARATE  ┃
                    ┃  Git push does NOT sync data    ┃
                    ┃  Only Admin Import syncs data   ┃

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

| ✅ Git Push DOES | ❌ Git Push DOES NOT |
|------------------|----------------------|
| Update React components | Change production database |
| Update API endpoint code | Sync your local landmarks |
| Update CSS/styling | Import new records |
| Apply schema migrations | Update existing record data |
| Update the seed file | Automatically run the seed |
| Deploy new Docker image | Touch the Docker volume |

**CRITICAL:** The production database lives in a Docker volume. Code deploys NEVER touch it (unless DB is empty, then seed runs once).

---

## THE ONLY WAY TO SYNC DATA

```
LOCAL ADMIN                              PRODUCTION ADMIN
http://localhost:5173/admin              https://labor-landmarks.supersoul.top/admin

   ┌─────────────────┐                      ┌─────────────────┐
   │  Backup JSON    │ ──── file.json ────▶ │  Import JSON    │
   └─────────────────┘                      └─────────────────┘
```

**Step-by-step:**
1. LOCAL: Go to `http://localhost:5173/admin`
2. LOCAL: Click **"Backup JSON"** → saves file to Downloads
3. PRODUCTION: Go to `https://labor-landmarks.supersoul.top/admin`
4. PRODUCTION: Login with admin password
5. PRODUCTION: Click **"Backup JSON"** first (safety backup!)
6. PRODUCTION: Click **"Import JSON"** → upload file from step 2
7. PRODUCTION: Verify import stats match expectations

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
| 🔴 NEVER assume git push syncs data | It doesn't. Only Admin Import syncs data. |
| 🔴 NEVER run scripts against production | Scripts use local .env DATABASE_URL |
| 🔴 NEVER manually edit .db files | Use Admin Dashboard or Prisma Studio |
| 🔴 NEVER confuse localhost with production URL | Check the URL bar before every action |
| 🔴 NEVER deploy without verifying BOTH Coolify volumes exist | Without `/app/data` volume, DB is wiped every deploy |
| 🔴 NEVER add `apk add` to Dockerfile | Alpine CDN has DNS outages — use built-in tools or npm packages |
| 🔴 NEVER use framer-motion `layout`/`AnimatePresence` on lists with 100+ items | Crashes mobile browsers (see Phase 9) |
| 🟢 ALWAYS ask user which environment they mean | "Local or production?" |
| 🟢 ALWAYS backup production before importing | Click Backup JSON first |
| 🟢 ALWAYS verify record counts after sync | Compare local vs production counts |
| 🟢 ALWAYS check if local server is running | `curl http://localhost:3001/api/landmarks` |

---

## COMMON PITFALLS (AI AGENTS READ THIS)

### Pitfall 1: "Production data is wrong/missing"
**WRONG:** Try to fix via code changes and git push  
**RIGHT:** Sync via Admin Dashboard (Backup JSON → Import JSON)

### Pitfall 2: "Metadata is null on production"  
**CAUSE:** Old import code didn't save all fields  
**FIX:** Import again from local (code is now fixed)

### Pitfall 3: "Local shows data, production is empty"
**CAUSE:** They're separate databases  
**FIX:** Import local backup to production via Admin

### Pitfall 4: "After deploy, production data disappeared"
**CAUSE:** Docker volume wasn't persisted OR seed ran on empty DB  
**CHECK:** Does production show 0 records or seed data (273)?  
**FIX:** Import from your local backup

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

### Phase 11: Future Enhancements (Recommended Next)
- [ ] **Email Notifications**: Resend (recommended) or Nodemailer for new suggestion alerts
- [ ] **Authentication**: Secure `/admin` route with password protection
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

*   **Port 3001**: The application uses **Port 3001** consistently across local development and Docker. The `Dockerfile` sets `EXPOSE 3001` and `ENV PORT=3001`, matching `docker-compose.yml`. Ensure your deployment platform (Coolify, Railway, etc.) maps to port 3001.
*   **Admin API Security**: All `/api/admin/*` endpoints are protected with Bearer token authentication. The frontend sends the admin password as `Authorization: Bearer <password>` header.
*   **Database Migrations**:
    *   **Rule**: If you change `prisma/schema.prisma` (e.g., add a column), you **MUST** run `npx prisma migrate dev` locally.
    *   **Why?**: This generates the SQL file in `prisma/migrations/`. The production server uses this file to update the live database.
-   **Smart Seeding RE-ENABLED**: The `Dockerfile` now runs `npx tsx prisma/seed.ts` on every startup.
-   **Safe Seed Logic**: The script is now "Smart":
    -   **Empty DB**: If the map has 0 markers, it automatically loads from `landmarks_imported.json` (the full 274 record set).
    -   **Non-Empty DB**: If the map already has data (your edits, new submissions), it changes **NOTHING**.
-   **Security**: This ensures you never see a "blank map" in production again, while still protecting your manual edits.

---

## Utility & Maintenance Scripts (`/scripts`)

Specialized TypeScript scripts are available for bulk database operations. Run them via `npx tsx scripts/[filename].ts`.

1.  **`fix_international_data.ts`**:
    - **Purpose**: Fixes landmarks mislabeled as "USA" based on coordinates (e.g., Lng > -30).
    - **Logic**: Detects countries like "Denmark", "United Kingdom", etc., from descriptions and updates the `country` and `city` fields.
    - **Geocoding**: Corrects specific known errors (e.g., Mather Mine, Kate Mullaney House).
2.  **`recover_categories.ts`**:
    - **Purpose**: Restores `category` field for records where the category was incorrectly set to the landmark's Name.
    - **Logic**: Extracts the category tag (e.g., "Statue, Memorial") from the end of the `description` field.

---

## AI Handoff Protocol
When picking up from this document, future AI agents should:
1.  **Check Data Health**: Run `npx tsx scripts/recover_categories.ts` if categories look like titles in the UI.
2.  **Schema Context**: Note that `country` is optional (`String?`) and defaults to `null` to allow international flexibility.
3.  **Local vs Prod**: Always confirm if the user wants to push **Code** (Git) or sync **Data** (Admin Export/Import).
4.  **UI Consistency**: Maintain the "Glassmorphism" theme using Tailwind v4 custom tokens.
5.  **NEVER** re-enable auto-seeding in `Dockerfile`; use `FORCE_SEED=true` only if explicitly requested.

---

## CURRENT STATE (Apr 3, 2026) — READ THIS FIRST IN NEXT SESSION

### Git Status: SEARCH FIX READY TO COMMIT/PUSH
Phase 10 (search overhaul) is implemented and `tsc --noEmit` is clean. Not yet pushed to production.

### Production Stats (as of Mar 2026)
- **336 landmarks** with **256 images** live at `labor-landmarks.supersoul.top`
- **409KB** JSON API payload at `/api/landmarks`

### Recent Fixes (Phase 10, Apr 2026)
- **Search overhauled**: Multi-word AND logic, state full-name mapping, punctuation normalization, description field added — fixes "Bloomington Illinois" returning 0 results
- See `search-queries.md` for full audit and `HANDOFF.md` Phase 10 for change details

### Recent Fixes (Phase 9, Mar 2026)
- **Mobile crash fixed**: Removed framer-motion per-card animations that were crashing mobile Chrome/Safari by creating 336 GPU layers
- **Dockerfile hardened**: Removed `apk add curl` that was failing due to Alpine CDN DNS outages
- **CSS cleanup**: Removed dead Vite scaffold `App.css`, added missing `no-scrollbar` utility, fixed `h-screen` → `h-dvh`

### Build Status: CLEAN
- `npx tsc --noEmit` passes with zero errors
- `npm run build` succeeds locally

### Image System Architecture (No base64 — real files)
Images are stored as real files on disk, NOT base64 in the database:
1. **Upload**: `multer` receives multipart form data into memory buffers
2. **Processing**: `sharp` saves original file + generates 400px-wide JPEG thumbnail (prefixed `thumb_`)
3. **Storage**: Files written to `./uploads/landmarks/` (local) or `/app/uploads/landmarks/` (production)
4. **Serving**: `express.static` serves `/uploads/` directory as static files
5. **Display**: Frontend references `/uploads/landmarks/thumb_filename.jpg` for thumbnails, full filename for lightbox
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

