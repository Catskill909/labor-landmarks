# Labor Landmarks Map ✊

A professional, full-stack interactive map application designed to explore, visualize, and crowdsource significant sites in US and International Labor History. Built for The Labor Heritage Foundation.

## 🚀 Key Features

### 🗺️ Interactive Exploration
- **Dual View Modes**: Seamlessly switch between an interactive Map view (Leaflet) and a responsive List view.
- **Rich Landmark Modals**: Beautiful "Glassmorphism" detail cards showing:
    - Historical Significance (Description)
    - Full Metadata (Phone, Email, Website links)
    - Image Gallery with lightbox viewer
    - Interactive Mini-map (leaflet-based)
- **International Support**: Full support for landmarks outside the USA (Europe, Australia, etc.).
- **Smart Search**: Real-time filtering by Name, City, State (abbreviation or full name), and Description. Multi-word queries use AND logic — "Bloomington Illinois" returns landmarks matching both terms across any field.
- **Category Filtering**: Quickly drill down by types like "Strike/Event", "Monument", "Union Hall", "Museum", etc.

### 📸 Image Gallery System
- **Photo Uploads**: Admins, and the public with their own suggestion (via a one-time key), can upload images (JPEG, PNG, WebP, up to 5MB each).
- **Automatic Thumbnails**: Server-side thumbnail generation via `sharp` (400px wide, same format as the original).
- **Gallery Display**: Images appear on landmark cards (list view), map marker popups, and detail modals.
- **Lightbox Viewer**: Full-screen image viewer with keyboard navigation and Framer Motion animations.
- **Drag & Drop**: Reusable upload component with drag-and-drop, file previews, and client-side validation.

### 📢 Public Contributions
- **Suggestion System**: Public users can suggest new landmarks via a modern, multi-step "Suggest a Landmark" modal with optional image uploads.
- **Geocoding**: Integrated **OpenStreetMap Nominatim** for real-time address verification and coordinate generation.
- **Draft Workflow**: User submissions are always held in the Review Queue until an admin approves them.

### 🛡️ Admin Dashboard (`/admin`)
- **Review Queue**: Dedicated tab for vetting, editing, and publishing new submissions.
- **CMS Control**: Full Edit/Delete/Add capabilities for all records in the inventory.
- **JSON Import**: Adds records; a matching `sourceUrl` **overwrites** the existing record, a matching name + location is skipped. Does not restore photos, submitter info or dates.
- **JSON Backup**: 1-click export of all records (photo filenames only — no image files; full export with photos is planned).
- **Category Management**: Advanced multi-tag selection for categorizing sites.

## 🛠️ Tech Stack

- **Frontend**: React 19, Vite, Tailwind CSS v4, Lucide Icons, Framer Motion (Animations), React Leaflet (Map).
- **Backend**: Node.js, Express.js, Multer (file uploads), Sharp (image processing).
- **Database/ORM**: SQLite with Prisma ORM (Type-safe, portable, and extremely fast).
- **Styling**: Custom "Glassmorphism" Dark Mode theme with tailored red/white labor high-vibrancy accents.

## 📦 Deployment & Persistence

This project is fully containerized and ready for high-reliability deployment on platforms like **Coolify** or generic Docker hosts.

- **Database Storage**: Uses a Docker volume to persist the SQLite database (`/app/data/dev.db`). **CRITICAL: Requires Coolify persistent storage volume at `/app/data`** — without this, the database is destroyed on every deploy.
- **Image Storage**: Uploaded images stored on disk (`/app/uploads/landmarks/`). **CRITICAL: Requires Coolify persistent storage volume at `/app/uploads`** — without this, uploaded images are lost on every deploy.
- **Migrations**: On startup the container applies pending schema migrations only. A deploy that adds one needs **Stop, then Deploy** in Coolify (rolling updates hold the database lock).
- **Auto-Seeding Safety**: Built-in protection to prevent production data overwrite during deployments.
- **Volume Safety Check**: Startup logs a warning if no existing database is found, helping detect missing volume mounts.
- **Security**: Every change requires the admin password (`ADMIN_PASSWORD`, set in Coolify); security headers and rate limits on; `GET /api/health` checks the database.
- **Deploying**: pushing to `main` does nothing on its own — press **Deploy** in Coolify.

## � Local vs Production (IMPORTANT!)

| | Local Dev | Production |
|---|-----------|------------|
| **URL** | `localhost:5173` | `labor-landmarks.supersoul.top` |
| **Database** | Your machine | Docker volume on server |
| **Admin Auth** | Login screen; any password works if `ADMIN_PASSWORD` is unset | Password required |

### Data: production is the master copy
Edit records in production admin. Never import a local backup over production — the local database is
months old and import overwrites matching records. To add new records prepared locally, see
[HANDOFF.md](HANDOFF.md) → THE ONLY WAY TO SYNC DATA.

**⚠️ Git push updates CODE only (after Deploy is pressed), never DATA.**

## �💻 Local Development

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Run Full Stack (Recommended)**
   ```bash
   npm run dev:fullstack
   ```
   Access the frontend at `http://localhost:5173` and the API at `http://localhost:3001`.

## 📂 Project Structure

- `/src`: Frontend React source.
- `/server`: Express API implementation.
- `/prisma`: Database schema and migration history.
- `/uploads`: Local image storage (not committed to git).
- `/scripts`: Utilities that run against the **local** database, plus `security-check.ts` (`npm run check:security`). Full list in [HANDOFF.md](HANDOFF.md).
- `/map_data`: Landmark data scraped from the original Google Maps KML (pending import — see below).

## Map Data Import (Pending)
A structured `landmarks.json` and its associated high-resolution images have been placed in the `map_data/` folder. This data was extracted from the original Google Maps KML file, and the broken library image links have been corrected.
**Next Steps**: 16 of the 60 entries already exist on the live site — dedupe first. Photos must go through the admin photo upload (JSON import doesn't carry images). Status and details: [HANDOFF.md](HANDOFF.md).

