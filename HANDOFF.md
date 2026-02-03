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

### Phase 4: Security & Polish (Recommended Next)
- [ ] **Authentication**: Secure the `/admin` route with password protection (Simple Auth or Clerk/Auth0).
- [ ] **SEO & Metadata**: Add dynamic Open Graph tags so sharing a specific landmark (e.g., `/landmark/123`) shows a preview card.
- [ ] **Image Upload**: Replace image URLs with actual file uploads (stored in SQLite blob or filesystem volume).

### Phase 5: Advanced Features (Future)
- [ ] **Crowdsourcing**: Public "Suggest a Landmark" form with admin moderation queue.
- [ ] **Clusters**: Use map clustering for areas with high density (e.g., Chicago, NYC).
- [ ] **Tours**: Ability to group landmarks into a "Tour" (e.g., "Mother Jones Trail").
- [ ] **Export/Import**: CSV backup tools for the admin.

---

## AI Handoff Protocol
When picking up from this document, future AI agents should:
1. Verify the `prisma/schema.prisma` is up to date.
2. Check if the `server/` directory exists and matches the API specifications.
3. Ensure the `vite.config.ts` proxy is correctly pointing to the Express server port.
4. Review `task.md` for the immediate next steps.

---

## Brainstorming Ideas
- **Crowdsourced Suggestions**: Add a public "Suggest a Landmark" form that sends a draft to curators in the Admin section.
- **Museum Integration**: Allow landmarks to be linked to existing museum collections.
- **Export/Import**: Bulk CSV/JSON import for large scale history inventories.
- **Map Interaction**: Long-press on the map to "Quick-Add" a landmark at those coordinates.
