# Labor Landmarks: Project Handoff & Roadmap

This document serves as the source of truth for the Labor Landmarks full-stack transition. It outlines the current state, technical decisions, and a phased development roadmap.

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

### Phase 7: Future Enhancements (Recommended Next)
- [ ] **Email Notifications**:
    - **Strategy**: Use your existing `server/index.ts` to trigger emails when a new suggestion arrives.
    - **Option A (Recommended)**: **Resend**. Modern, free tier, easy API. (`npm install resend`).
    - **Option B**: **Nodemailer**. Use your own SMTP/Gmail. Zero cost, slightly more config.
- [ ] **Authentication**: Secure the `/admin` route with password protection (Simple Auth or Clerk/Auth0).
- [ ] **Image Upload**: Replace image URLs with actual file uploads (stored in filesystem volume).

---

## Deployment & Data Strategy (Crucial)

To maintain a healthy production environment, you must understand the distinction between **Code** and **Data**:

### 1. The Separation of Church and State
-   **CODE (Git/Coolify)**: When you push to GitHub, Coolify rebuilds your app. This updates the logic (React components, API endpoints, styling).
-   **DATA (SQLite)**: The database file (`dev.db`) sits in a "Volume" on the server. **It is NOT overwritten by code deployments.**
    -   *Why?* If we replaced the DB every time you pushed code, you would delete every user submission and edit made on the production site.

### 2. The "Safe Sync" Workflow
Since you cannot just "push your local DB" to production, we use the **Import/Restore** feature to keep things in sync.

#### Scenario A: First Deployment (Initialization)
1.  **Local**: Export your full dataset using the **"Backup JSON"** button.
2.  **Prod**: Log into your fresh production site.
3.  **Prod**: Use the **"Import JSON"** button to populate the empty database.

#### Scenario B: Ongoing Updates
You add 50 new landmarks locally (via scraping or manual entry) and want them on Prod.
1.  **Local**: Export **"Backup JSON"**.
2.  **Prod**: **"Import JSON"**.
    -   The system uses **"Smart Merge"**:
        -   It finds scraping records by `sourceUrl` and **Updates** them.
        -   It finds manual records by `Name + Location` and **Skips** duplicates.
        -   It **Adds** completely new records.
    -   *Result*: Your Production user edits remain safe, and your new local data is added seamlessly.

### 3. Critical Technical Configs (For Coolify/Docker)

*   **Port 3000**: The `Dockerfile` is strictly set to **Port 3000** (checking `EXPOSE 3000` and `ENV PORT=3000`). This matches the default healthcheck settings of most platforms (Coolify, Railway, etc.). **Do not change this** unless you update the healthcheck URL in your deployment settings.
*   **Database Migrations**:
    *   **Rule**: If you change `prisma/schema.prisma` (e.g., add a column), you **MUST** run `npx prisma migrate dev` locally.
    *   **Why?**: This generates the SQL file in `prisma/migrations/`. The production server uses this file to update the live database.
### 4. CRITICAL: Data Persistence Safety
> [!IMPORTANT]
> A critical update was made to prevent production data overwrite.

-   **Auto-Seeding Disabled**: The `Dockerfile` NO LONGER runs `npx tsx prisma/seed.ts` on startup. This prevents the dynamic production database from being reset to the static `landmarks.json` file on every deployment.
-   **Safe Seed Script**: The `prisma/seed.ts` script now checks if the database is empty before running.
    -   **If DB has data**: It creates a log entry and SKIPS seeding.
    -   **Force Seeding**: To overwrite the database (e.g., during initial setup or reset), you must specifically set the environment variable: `FORCE_SEED=true`.
    -   **Command**: `FORCE_SEED=true npx tsx prisma/seed.ts`

---

## AI Handoff Protocol
When picking up from this document, future AI agents should:
1. Verify the `prisma/schema.prisma` is up to date.
2. Check if the `server/` directory exists and matches the API specifications.
3. Ensure the `vite.config.ts` proxy is correctly pointing to the Express server port.
4. Review `task.md` for the immediate next steps.
5. **NEVER** re-enable auto-seeding in `Dockerfile` without explicit user confirmation.

---

## Brainstorming Ideas
- **Crowdsourced Suggestions**: Add a public "Suggest a Landmark" form that sends a draft to curators in the Admin section.
- **Museum Integration**: Allow landmarks to be linked to existing museum collections.
- **Export/Import**: Bulk CSV/JSON import for large scale history inventories.
- **Map Interaction**: Long-press on the map to "Quick-Add" a landmark at those coordinates.
